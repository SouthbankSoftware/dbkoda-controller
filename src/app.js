/*
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

/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-06-09T11:51:26+10:00
 */

import moment from 'moment';
import _ from 'lodash';
import winston from 'winston';
import path from 'path';
import compress from 'compression';
import cors from 'cors';
import feathers, {static as serveStatic} from 'feathers';
import hooks from 'feathers-hooks';
import rest from 'feathers-rest';
import bodyParser from 'body-parser';
import primus from 'feathers-primus';
import swagger from 'feathers-swagger';
import middleware from './middleware';
import services from './services';

const app = feathers();

// feathers-configuration 0.3.x to 0.4.x API change, which now relies on node-config
process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config/');
app.configure(require('feathers-configuration')());

global.IS_PROD = process.env.NODE_ENV === 'production';
global.UAT = process.env.UAT === 'true';

// config winston
(() => {
  const commonOptions = {
    colorize: 'all',
    timestamp() {
      return moment().format();
    }
  };

  const transports = [new winston.transports.Console(commonOptions)];

  if (global.IS_PROD) {
    require('winston-daily-rotate-file');
    transports.push(
      new winston.transports.DailyRotateFile(
        _.assign({}, commonOptions, {
          filename: process.env.LOG_PATH,
          datePattern: 'yyyy-MM-dd.',
          localTime: true,
          prepend: true,
          json: false
        })
      )
    );
  } else {
    transports.push(
      new winston.transports.File({
        name: 'info-file',
        filename: 'controller-dev.log',
        level: 'debug'
      })
    );
  }

  global.l = new winston.Logger({
    level: global.IS_PROD ? 'info' : 'debug',
    padLevels: true,
    levels: {
      error: 0,
      warn: 1,
      notice: 2,
      info: 3,
      debug: 4
    },
    colors: {
      error: 'red',
      warn: 'yellow',
      notice: 'green',
      info: 'black',
      debug: 'blue'
    },
    transports
  });
  global.log = global.l;

  process.on('unhandledRejection', (reason) => {
    log.error(reason);
  });

  process.on('uncaughtException', (err) => {
    log.error(err.stack);
  });
})();

app
  .use(compress())
  .options('*', cors())
  .use(cors())
  .use('/', serveStatic(app.get('public')))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({extended: true}))
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
        transformer: 'websockets',
        timeout: false
      },
      (primus) => {
        primus.library();
        primus.save(path.join(__dirname, '../public/dist/primus.js'));
      }
    )
  )
  .configure(services)
  .configure(middleware);

export default app;
