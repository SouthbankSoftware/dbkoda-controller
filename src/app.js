/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-05-03T17:18:21+10:00
 *
 * dbKoda - a modern, open source code editor, for MongoDB.
 * Copyright (C) 2017-2018 Southbank Software
 *
 * This file is part of dbKoda.
 *
 * dbKoda is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * dbKoda is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with dbKoda.  If not, see <http://www.gnu.org/licenses/>.
 */

import _ from 'lodash';
import { createLogger, format, transports, addColors } from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import compress from 'compression';
import cors from 'cors';
import feathers, { static as serveStatic } from 'feathers';
import hooks from 'feathers-hooks';
import rest from 'feathers-rest';
import bodyParser from 'body-parser';
import primus from 'feathers-primus';
import swagger from 'feathers-swagger';
import sh from 'shelljs';
import {
  levelConfig,
  commonFormatter,
  printfFormatter,
  bindDbKodaLoggingApi
} from '~/helpers/winston';
import { initRaygun, RaygunTransport } from '~/helpers/raygun';
import os from 'os';
import fs from 'fs';

require('babel-polyfill');

const app = feathers();

// feathers-configuration 0.3.x to 0.4.x API change, which now relies on node-config
process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config/');
app.configure(require('feathers-configuration')());

// global and env variables
// TODO: use IPC to get configs from main process instead of using error-prone child process env var
// passing
global.UAT = process.env.UAT === 'true';
global.IS_PRODUCTION = process.env.NODE_ENV === 'production';
global.LOG_PATH = process.env.LOG_PATH = process.env.LOG_PATH || path.resolve(__dirname, '../logs');
global.DBKODA_HOME = process.env.DBKODA_HOME =
  process.env.DBKODA_HOME || (global.UAT ? '/tmp/dbKoda' : path.resolve(os.homedir(), '.dbKoda'));
global.CONFIG_PATH = process.env.CONFIG_PATH =
  process.env.CONFIG_PATH || path.resolve(global.DBKODA_HOME, 'config.yml');
global.PROFILES_PATH = process.env.PROFILES_PATH =
  process.env.PROFILES_PATH || path.resolve(global.DBKODA_HOME, 'profiles.yml');

// `raygun` should always be inited
initRaygun(path.resolve(global.DBKODA_HOME, 'raygunCache/dbkoda-controller/'), [
  'dbkoda-controller'
]);

// config winston
{
  global.logger = global.log = global.l = createLogger({
    format: format.combine(commonFormatter, format.colorize({ all: true }), printfFormatter),
    level: global.IS_PRODUCTION ? 'info' : 'debug',
    levels: levelConfig.levels,
    transports: [
      new transports.Console(),
      new transports.DailyRotateFile({
        filename: path.resolve(process.env.LOG_PATH, 'controller_%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '1m',
        maxFiles: global.IS_PRODUCTION ? '30d' : '3d'
      }),
      new RaygunTransport()
    ]
  });

  addColors(levelConfig);

  bindDbKodaLoggingApi(l);

  // NOTE: after this point, every error (unhandled, l.error, console.error) should be reported to
  // `raygun`
}

// Ensure profiles.yml exists
// TODO: refactor this into a separate profiles service
{
  !fs.existsSync(global.PROFILES_PATH) && fs.writeFileSync(global.PROFILES_PATH, '');
}

function checkJavaVersion(callback) {
  const spawn = require('child_process').spawnSync('java', ['-version']);
  if (spawn.error) {
    return callback(spawn.error, null);
  }
  if (spawn.stderr) {
    const [data] = spawn.stderr.toString().split('\n');
    const javaVersion = new RegExp(/(java version)|(openjdk version)/).test(data)
      ? data.split(' ')[2].replace(/"/g, '')
      : false;
    if (javaVersion != false) {
      return callback(null, javaVersion);
    }
    return callback(new Error('JAVA is not found in the path.'), null);
  }
}

checkJavaVersion((err, ver) => {
  if (err) {
    console.log(err.message);
    global.IS_JAVA = false;
  } else {
    console.log('JAVA VERSION: ', ver);
    global.IS_JAVA = true;
  }
});

// require here so code from this point can use winston logger
const middleware = require('./middleware');
const services = require('./services');

// override default setup behaviour
app.setup = () => {
  const ps = [];
  _.forOwn(app.services, (v, k) => {
    if (_.has(v, 'setup')) {
      ps.push(v.setup(app, k));
    }
  });

  Promise.all(ps)
    .then(() => {
      app._isSetup = true;
      app.emit('ready');
    })
    .catch(e => l.error(e.stack));
};

app
  .use(compress())
  .options('*', cors())
  .use(cors())
  .use('/', serveStatic(app.get('public')))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .configure(hooks())
  .configure(rest())
  .configure(
    swagger({
      docsPath: '/docs',
      uiIndex: path.join(__dirname, '../public/docs.html'),
      info: {
        title: process.env.npm_package_fullName,
        description: process.env.npm_package_description
      }
    })
  )
  .configure(
    primus(
      {
        transformer: 'websockets'
      },
      primus => {
        primus.library();
        const libPath = path.join(__dirname, '../public/dist/primus.js');
        sh.mkdir('-p', path.dirname(libPath));
        primus.save(libPath);
      }
    )
  )
  .configure(services)
  .configure(middleware);

/**
 * Stop app
 *
 * @param {Error} err - error object
 * @return {Promise} resolve
 */
app.stop = err => {
  process.stdout.write('\r');
  l.notice('Stopping dbkoda Controller...');

  if (err) {
    l.error(err.stack);
    return Promise.resolve();
  }

  const ps = [];
  _.forOwn(app.services, (v, k) => {
    if (_.has(v, 'destroy')) {
      ps.push(v.destroy(app, k));
    }
  });

  return Promise.all(ps);
};

export default app;
