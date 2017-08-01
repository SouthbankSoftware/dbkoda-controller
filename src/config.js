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
import { execSync } from 'child_process';
import os from 'os';

const config = {
  mongoCmd: null,
  mongoVersionCmd: null,
};

if (process.env.CONFIG_PATH) {
  // overwrite using external config yaml file
  try {
    const userConfig = yaml.safeLoad(fs.readFileSync(process.env.CONFIG_PATH, 'utf8'));
    _.assign(config, _.pick(userConfig, _.keys(config)));
  } catch (_e) {
    console.error(_e);
  } // eslint-disable-line no-empty
}

// check and figure out missing config
if (!config.mongoCmd) {
  try {
    if (os.platform() === 'win32') {
      config.mongoCmd = execSync('where mongo /F', {encoding: 'utf8'}).trim();
    } else {
      config.mongoCmd = execSync('bash -lc \'which mongo\'', {encoding: 'utf8'}).trim();
      const tmp = config.mongoCmd.split('\n');
      if (tmp.length > 0) {
        config.mongoCmd = tmp[tmp.length - 1];
      }
    }
  } catch (error) {
    l.error(error.stack);
    config.mongoCmd = null;
  }
}

if (!config.mongoVersionCmd && config.mongoCmd) {
  config.mongoVersionCmd = config.mongoCmd + ' --version';
}

export default config;
