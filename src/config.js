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

import _ from 'lodash';
import yaml from 'js-yaml';
import fs from 'fs';
import {execSync} from 'child_process';
import os from 'os';
import path from 'path';

export const loadConfigFromYamlFile = (p) => {
  const config = {
    mongoCmd: null,
    mongoVersionCmd: null,
    mongodumpCmd: null,
    mongorestoreCmd: null,
    mongoimportCmd: null,
    mongoexportCmd: null
  };
  if (!fs.existsSync(p)) {
    console.log('the configuration file doesnt exist ', p);
    return config;
  }
  if (p) {
    // overwrite using external config yaml file
    try {
      const userConfig = yaml.safeLoad(fs.readFileSync(p, 'utf8'));
      _.assign(config, _.pick(userConfig, _.keys(config)));
      if (os.platform() === 'win32') {
        _.keys(config).map((key) => {
          if (config[key] && key !== 'mongoVersionCmd') {
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

const getMongoPath = (mongoCmd) => {
  let mongoPath = '';
  if (mongoCmd) {
    if (os.platform() === 'win32') {
      mongoPath = mongoCmd.replace(/mongo.exe$/, '');
    } else {
      mongoPath = mongoCmd.replace(/mongo$/, '');
    }
  }
  return mongoPath;
};

const applyPathToOtherCommands = (config) => {
  console.log('apply to commands ', config);
  const mongoPath = getMongoPath(config.mongoCmd);
  _.keys(config).map((key) => {
    if (!config[key] && key !== 'mongoVersionCmd' && key !== 'mongoCmd') {
      const cmdName = key.replace('Cmd', '');
      if (os.platform() === 'win32') {
        config[key] = mongoPath + '\\' + cmdName + '.exe';
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

export const loadCommands = () => {
  let configPath = process.env.CONFIG_PATH;
  if (!configPath) {
    configPath = path.resolve(os.homedir(), '.dbKoda', 'config.yml');
  }
  log.info('load configuration file from ', configPath);
  const config = loadConfigFromYamlFile(configPath);
  log.info('loaded configuration commands ', config);
  if (config.mongoCmd) {
    if (os.platform() === 'win32') {
      config.mongoVersionCmd = '"' + config.mongoCmd + '"' + ' --version';
    } else {
      config.mongoVersionCmd = config.mongoCmd + ' --version';
    }
    applyPathToOtherCommands(config);
  }
  if (os.platform() === 'win32') {
    _.forOwn(config, (value, key) => {
      if (value) {
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
  return config;
};

const config = loadCommands();
loadConfig(config);
log.info('resolve command paths ', config);
global.defaultCommandConfig = config;

export default config;
