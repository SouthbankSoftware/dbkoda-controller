/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-05T15:35:16+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-16T12:20:02+11:00
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

import processItems from '~/hooks/processItems';
// $FlowFixMe
import yaml from 'js-yaml';
// $FlowFixMe
import errors from 'feathers-errors';
import _ from 'lodash';
// $FlowFixMe
import diff from 'deep-diff';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import nanoid from 'nanoid';
import { configDefaults } from '../configSchema';
import { isDockerCommand } from '../../../controllers/docker';

const SIBLING_MONGO_CMD = ['mongodumpCmd', 'mongorestoreCmd', 'mongoimportCmd', 'mongoexportCmd'];

const getMongoCmd = () => {
  let mongoCmd = null;

  try {
    if (os.platform() === 'win32') {
      mongoCmd = 'mongo.exe';
    } else {
      mongoCmd = execSync("bash -lc 'which mongo'", {
        encoding: 'utf8'
      }).trim();
      const tmp = mongoCmd.split('\n');
      if (tmp.length > 0) {
        mongoCmd = tmp[tmp.length - 1];
      }
    }
  } catch (error) {
    l.error(error.stack);
  }
  return mongoCmd;
};

const updateMongoCmd = mongoCmd => {
  if (!mongoCmd) return;

  if (!isDockerCommand(mongoCmd)) {
    global.config.mongoVersionCmd = `"${mongoCmd}" --version`;
    const dir = path.dirname(mongoCmd);
    const ext = os.platform() === 'win32' ? '.exe' : '';
    for (const cmd of SIBLING_MONGO_CMD) {
      global.config[cmd] = path.join(dir, `${cmd.slice(0, -3)}${ext}`);
    }
  }
};

export const getDumpableConfigView = (config: *) => _.pick(config, _.keys(configDefaults));

const HISTORY_SIZE_PATH = 'performancePanel.historySize';
const HISTORY_BRUSH_SIZE_PATH = 'performancePanel.historyBrushSize';

const checkHistoryConfig = (currentConfig, nextConfig) => {
  const errorsObj = {};

  const currentHistorySize = _.get(currentConfig, HISTORY_SIZE_PATH);
  const currentHistoryBrushSize = _.get(currentConfig, HISTORY_BRUSH_SIZE_PATH);
  const nextHistorySize = _.get(nextConfig, HISTORY_SIZE_PATH);
  const nextHistoryBrushSize = _.get(nextConfig, HISTORY_BRUSH_SIZE_PATH);
  const minimumHistorySize = nextHistoryBrushSize || currentHistoryBrushSize;
  const maximumHistoryBrushSize = nextHistorySize || currentHistorySize;

  if (nextHistorySize && nextHistorySize < minimumHistorySize) {
    errorsObj[`config.${HISTORY_SIZE_PATH}`] = `should be >= ${minimumHistorySize}`;
  }

  if (nextHistoryBrushSize && nextHistoryBrushSize > maximumHistoryBrushSize) {
    errorsObj[`config.${HISTORY_BRUSH_SIZE_PATH}`] = `should be <= ${maximumHistoryBrushSize}`;
  }

  if (!_.isEmpty(errorsObj)) {
    throw new errors.BadRequest('Data does not match schema', {
      errors: errorsObj
    });
  }
};

const generateUserId = () => {
  return nanoid();
};

export default () =>
  processItems((context, item) => {
    const { config: nextConfig, emitChangedEvent, forceSave, fromConfigYml } = item;
    const { service } = context;

    // `ajv` should guard most of the correctness by now, but some post checkings are also necessary
    checkHistoryConfig(global.config, nextConfig);

    // check and get default `mongoCmd`
    if (
      (global.config.mongoCmd == null && nextConfig.mongoCmd === undefined) ||
      nextConfig.mongoCmd === null
    ) {
      nextConfig.mongoCmd = getMongoCmd();
    }

    // check and get default `user.id`
    const nextUserId = _.get(nextConfig, 'user.id');
    if ((global.config.user.id == null && nextUserId === undefined) || nextUserId === null) {
      _.set(nextConfig, 'user.id', generateUserId());
    }

    const changed = {};
    const differences = diff(getDumpableConfigView(global.config), nextConfig) || [];
    let hasDeletion = false;

    for (const { kind, path, lhs, rhs } of differences) {
      // TODO: handle array modification
      if (kind === 'E' || kind === 'N') {
        changed[path.join('.')] = {
          old: lhs,
          new: rhs
        };

        // apply change
        _.set(global.config, path, rhs);
      } else if (kind === 'D') {
        hasDeletion = true;
      }
    }

    const hasChanges = !_.isEmpty(changed);

    if (hasChanges) {
      if (changed.mongoCmd) {
        updateMongoCmd(changed.mongoCmd.new);
      }

      // emit changed event
      emitChangedEvent && service.emit('changed', changed);

      l.debug('Patched config: \ndiff - %o\nnew - %o', changed, global.config);
    }

    let p;

    if (forceSave || ((fromConfigYml && hasDeletion) || (!fromConfigYml && hasChanges))) {
      l.debug(`Updating ${global.CONFIG_PATH}...`);

      // update config.yml
      const { fileService, handleError } = service;
      p = fileService
        .create({
          _id: global.CONFIG_PATH,
          watching: true,
          content: yaml.safeDump(getDumpableConfigView(global.config))
        })
        .catch(handleError);
    } else {
      p = Promise.resolve();
    }

    p = p.then(() => changed);

    return p;
  });
