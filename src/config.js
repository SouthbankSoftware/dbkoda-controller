/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-24T11:50:00+11:00
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
import yaml from 'js-yaml';
import fs from 'fs';
import {execSync} from 'child_process';
import os from 'os';
import path from 'path';

const defaultCommandName = {
  mongoCmd: 'mongo',
  mongodumpCmd: 'mongodump',
  mongorestoreCmd: 'mongorestore',
  mongoimportCmd: 'mongoimport',
  mongoexportCmd: 'mongoexport',
};

const isMongoCommand = (cmd) => {
  return cmd && cmd.indexOf('mongo') >= 0;
};

export const getMongoPath = (mongoCmd) => {
  let mongoPath = '';
  if (mongoCmd) {
    // if (os.platform() === 'win32') {
    //   mongoPath = mongoCmd.replace(/mongo.exe$/, '');
    // } else {
    //   mongoPath = mongoCmd.replace(/mongo$/, '');
    // }
    mongoPath = path.dirname(mongoCmd);
    if (mongoPath !== '.') {
      mongoPath += '/';
    } else {
      mongoPath = '';
    }
  }
  return mongoPath;
};

export const mongoCmds = ['mongoCmd', 'mongodumpCmd', 'mongorestoreCmd', 'mongoimportCmd', 'mongoexportCmd'];

const applyPathToOtherCommands = (config) => {
  const mongoPath = getMongoPath(config.mongoCmd);
  _.keys(config).map((key) => {
    if (!config[key] && mongoCmds.indexOf(key) >= 0) {
      const cmdName = key.replace('Cmd', '');
      if (os.platform() === 'win32') {
        config[key] = mongoPath + cmdName + '.exe';
      } else {
        config[key] = mongoPath + cmdName;
      }
    }
  });
};

export const loadConfig = (config) => {
// check and figure out missing config
  try {
    if (!config.mongoCmd) {
      if (os.platform() === 'win32') {
        config.mongoCmd = 'mongo.exe';
      } else {
        config.mongoCmd = execSync('bash -lc \'which mongo\'', {encoding: 'utf8'}).trim();
        const tmp = config.mongoCmd.split('\n');
        if (tmp.length > 0) {
          config.mongoCmd = tmp[tmp.length - 1];
        }
      }
    }
    if (!config.mongoVersionCmd && config.mongoCmd) {
      config.mongoVersionCmd = config.mongoCmd + ' --version';
    }

    applyPathToOtherCommands(config);
  } catch (error) {
    l.error(error.stack);
    config.mongoCmd = null;
  }
  return config;
};

export const exportConfigToYamlFile = (p, config) => {
  try {
    fs.writeFileSync(p, yaml.safeDump(config));
  } catch (error) {
    l.error(error.stack);
  }
};

export const loadConfigFromYamlFile = (p) => {
  const config = {
    mongoCmd: null,
    mongoVersionCmd: null,
    mongodumpCmd: null,
    mongorestoreCmd: null,
    mongoimportCmd: null,
    mongoexportCmd: null,
    drillCmd: null,
    drillControllerCmd: null,
    showWelcomePageAtStart: true,
    telemetryEnabled: true,
    sshCounterInterval: 2,
    sshCounterCmd: 'vmstat'
  };
  if (!fs.existsSync(p)) {
    loadConfig(config);
    exportConfigToYamlFile(p, config);
    return config;
  }
  if (p) {
    // overwrite using external config yaml file
    try {
      const userConfig = yaml.safeLoad(fs.readFileSync(p, 'utf8'));
      _.assign(config, _.pick(userConfig, _.keys(config)));
      if (os.platform() === 'win32') {
        _.keys(config).map((key) => {
          if (config[key] && key !== 'mongoVersionCmd' && key !== 'drillCmd' && key !== 'drillControllerCmd') {
            if (!config[key].match(new RegExp('.exe$', 'i'))) {
              config[key] += '.exe';
            }
          }
        });
      }
    } catch (_e) {
      // console.error(_e);
    } // eslint-disable-line no-empty
  }
  return config;
};

export const loadCommands = () => {
  const profilesPath = path.resolve(os.homedir(), '.dbKoda', 'profiles.yml');
  if (!fs.existsSync(profilesPath)) {
    fs.writeFileSync(profilesPath, '');
  }
  let configPath = process.env.CONFIG_PATH;
  if (!configPath) {
    configPath = (process.env.UAT == 'true') ? '/tmp/config.yml' : path.resolve(os.homedir(), '.dbKoda', 'config.yml');
    console.log('configPath:', configPath);
  }
  const config = loadConfigFromYamlFile(configPath);
  if (config.mongoCmd) {
    config.mongoVersionCmd = '"' + config.mongoCmd + '" --version';
    applyPathToOtherCommands(config);
  }
  if (os.platform() === 'win32') {
    _.forOwn(config, (value, key) => {
      if (value && value.replace) {
        config[key] = value.replace(/\\/g, '/');
      }
    });
  }
  if (global.defaultCommandConfig) {
    _.forOwn(global.defaultCommandConfig, (value, key) => {
      if (!config[key] && value) {
        config[key] = value;
      }
    });
  }
  // reject incorrect mongo command
  _.forOwn(config, (value, key) => {
    if (isMongoCommand(key) && key !== 'mongoVersionCmd' && value) {
      const basename = path.basename(value);
      let defaultName = defaultCommandName[key];
      if (os.platform() === 'win32') {
        defaultName += '.exe';
      }
      if (basename !== defaultName) {
        config[key] = undefined;
      }
    }
  });
  return config;
};

const config = loadCommands();
loadConfig(config);
console.log('resolve command paths ', config);
global.defaultCommandConfig = config;

export default config;
