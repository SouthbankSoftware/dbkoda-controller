/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-05T15:35:16+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-07-02T15:21:52+10:00
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
import {
  ConfigError,
  MongoConfigError,
  PerformancePanelConfigError,
  UserConfigError
} from '~/errors';
import _ from 'lodash';
// $FlowFixMe
import { diff, applyChange } from 'deep-diff';
import os from 'os';
import path from 'path';
import nanoid from 'nanoid';
import { configDefaults } from '../configSchema';
import getDumpableConfigView from '../getDumpableConfigView';
import getCmdPath from '../getCmdPath';
import validateMongoCmd from '../validateMongoCmd';
import validateDockerTarget from '../validateDockerTarget';

const SIBLING_MONGO_CMD = ['importCmd', 'exportCmd', 'dumpCmd', 'restoreCmd'];
const RESETTABLE_MONGO_CMD = ['cmd', 'versionCmd', ...SIBLING_MONGO_CMD];
const USER_ID_LEN = 21;

const _handleAsyncError = (err: ConfigError, asyncErrors: {}, service) => {
  service.handleError(err);

  _.forEach(err.errors, (_v, k) => {
    asyncErrors[k] = true;
  });
};

const _getCombinedConfig = (path: string, nextConfig: {}): any => {
  const nextValue = _.get(nextConfig, path);
  const currentValue = _.get(global.config, path);

  if (nextValue === undefined) {
    return currentValue;
  }

  if (typeof currentValue === 'object' && currentValue !== null) {
    const result = _.isArray(currentValue) ? [] : {};

    // $FlowFixMe
    return _.merge(result, currentValue, nextValue);
  }

  return nextValue;
};

const _configPathIsNotNullOrUndefinedAndWillChange = (path: string, nextConfig): boolean => {
  const nextValue = _.get(nextConfig, path);

  if (nextValue == null) {
    return false;
  }

  const currentValue = _.get(global.config, path);
  return !_.isEqual(currentValue, _getCombinedConfig(path, nextConfig));
};

const _resetMongoCmds = (nextConfig: typeof configDefaults) => {
  for (const cmd of RESETTABLE_MONGO_CMD) {
    _.set(nextConfig, `mongo.${cmd}`, null);
  }
};

const _validateMongoCmd = async (nextConfig: typeof configDefaults, asyncErrors: {}, service) => {
  if (_configPathIsNotNullOrUndefinedAndWillChange('mongo.versionCmd', nextConfig)) {
    const mongoConfig = _getCombinedConfig('mongo', nextConfig);

    try {
      await validateMongoCmd(mongoConfig);
    } catch (err) {
      _handleAsyncError(err, asyncErrors, service);
    }
  }
};

const _generateAndCheckDockerizedMongoCmds = async (nextConfig: typeof configDefaults) => {
  let needsToUpdateConfigYml = false;

  if (
    _configPathIsNotNullOrUndefinedAndWillChange('mongo.docker', nextConfig) ||
    _configPathIsNotNullOrUndefinedAndWillChange('mongo.dockerized', nextConfig)
  ) {
    const dockerConfig = _getCombinedConfig('mongo.docker', nextConfig);

    let target;

    try {
      ({ target } = validateDockerTarget(dockerConfig));
    } catch (err) {
      if (_configPathIsNotNullOrUndefinedAndWillChange('mongo.dockerized', nextConfig)) {
        _.set(err, ['errors', 'config.mongo.dockerized'], 'error exists in config.mongo.docker');
      }

      throw err;
    }

    const cmd = _getCombinedConfig('mongo.docker.cmd', nextConfig);

    if (cmd) {
      const { createNew, hostPath, containerPath } = dockerConfig;

      const subCmd = createNew ? 'run' : 'exec';
      const rmParam = subCmd === 'run' ? '--rm ' : '';

      _.set(
        nextConfig,
        'mongo.versionCmd',
        `"${cmd}" ${subCmd} ${rmParam}${target} mongo --version`
      );

      let mongoCmd = `"${cmd}" ${subCmd} -it ${rmParam}`;
      let mongoSiblingCmd = `"${cmd}" ${subCmd} ${rmParam}`;

      if (subCmd === 'run' && hostPath && containerPath) {
        mongoCmd += `-v "${hostPath}:${containerPath}" ${target} mongo`;
        mongoSiblingCmd += `-v "${hostPath}:${containerPath}" ${target}`;
      } else {
        mongoCmd += `${target} mongo`;
        mongoSiblingCmd += `${target}`;
      }

      _.set(nextConfig, 'mongo.cmd', mongoCmd);

      // generate sibling mongo cmds
      for (const sMC of SIBLING_MONGO_CMD) {
        _.set(nextConfig, `mongo.${sMC}`, `${mongoSiblingCmd} ${sMC.slice(0, -3)}`);
      }

      needsToUpdateConfigYml = true;
    }
  }

  return needsToUpdateConfigYml;
};

const _generateAndCheckMongoCmds = async (nextConfig: typeof configDefaults): Promise<boolean> => {
  let needsToUpdateConfigYml = false;

  if (
    _configPathIsNotNullOrUndefinedAndWillChange('mongo.cmd', nextConfig) ||
    _configPathIsNotNullOrUndefinedAndWillChange('mongo.dockerized', nextConfig) ||
    (_getCombinedConfig('mongo.versionCmd', nextConfig) === null &&
      _getCombinedConfig('mongo.cmd', nextConfig) !== null)
  ) {
    const cmd = _getCombinedConfig('mongo.cmd', nextConfig);

    if (cmd) {
      _.set(nextConfig, 'mongo.versionCmd', `"${cmd}" --version`);

      const dir = path.dirname(cmd);
      const ext = os.platform() === 'win32' ? '.exe' : '';

      // generate sibling mongo cmds
      for (const sMC of SIBLING_MONGO_CMD) {
        _.set(nextConfig, `mongo.${sMC}`, path.join(dir, `${sMC.slice(0, -3)}${ext}`));
      }

      needsToUpdateConfigYml = true;
    }
  }

  return needsToUpdateConfigYml;
};

const _generateUserId = () => {
  return nanoid(USER_ID_LEN);
};

const HISTORY_SIZE_PATH = 'performancePanel.historySize';
const HISTORY_BRUSH_SIZE_PATH = 'performancePanel.historyBrushSize';

const _checkPerformancePanel = (nextConfig: typeof configDefaults) => {
  const errorsObj = {};

  const nextHistorySize = _.get(nextConfig, HISTORY_SIZE_PATH);
  const nextHistoryBrushSize = _.get(nextConfig, HISTORY_BRUSH_SIZE_PATH);
  const minimumHistorySize = _getCombinedConfig(HISTORY_BRUSH_SIZE_PATH, nextConfig);
  const maximumHistoryBrushSize = _getCombinedConfig(HISTORY_SIZE_PATH, nextConfig);

  if (nextHistorySize && nextHistorySize < minimumHistorySize) {
    errorsObj[`config.${HISTORY_SIZE_PATH}`] = `should be >= ${minimumHistorySize}`;
  }

  if (nextHistoryBrushSize && nextHistoryBrushSize > maximumHistoryBrushSize) {
    errorsObj[`config.${HISTORY_BRUSH_SIZE_PATH}`] = `should be <= ${maximumHistoryBrushSize}`;
  }

  if (!_.isEmpty(errorsObj)) {
    throw new PerformancePanelConfigError('Failed to patch performancePanel', {
      errors: errorsObj
    });
  }
};

const _checkMongo = async (
  nextConfig: typeof configDefaults,
  asyncErrors: {},
  service
): Promise<boolean> => {
  const dockerized = _getCombinedConfig('mongo.dockerized', nextConfig);

  let needsToUpdateConfigYml = false;

  if (_configPathIsNotNullOrUndefinedAndWillChange('mongo.dockerized', nextConfig)) {
    _resetMongoCmds(nextConfig);

    if (dockerized && _getCombinedConfig('mongo.docker.cmd', nextConfig) === null) {
      _.set(nextConfig, 'mongo.docker.cmd', null);
    }

    needsToUpdateConfigYml = true;
  }

  if (dockerized) {
    // using dockerized mongo binary
    if (_.get(nextConfig, 'mongo.docker.cmd') === null) {
      // figure out where it is
      const cmdPath = await getCmdPath('docker');

      if (cmdPath) {
        _.set(nextConfig, 'mongo.docker.cmd', cmdPath);
      } else {
        const err = new MongoConfigError('Failed to patch mongo', {
          errors: {
            'config.mongo.docker.cmd':
              'Docker is not detected in system paths. Please make sure it is installed or manually specify the path'
          }
        });
        _handleAsyncError(err, asyncErrors, service);

        _resetMongoCmds(nextConfig);
      }
      needsToUpdateConfigYml = true;
    }

    needsToUpdateConfigYml =
      (await _generateAndCheckDockerizedMongoCmds(nextConfig)) || needsToUpdateConfigYml;
  } else {
    // using normal mongo binary
    if (_.get(nextConfig, 'mongo.cmd') === null) {
      // figure out where it is
      const cmdPath = await getCmdPath('mongo');

      if (cmdPath) {
        _.set(nextConfig, 'mongo.cmd', cmdPath);
      } else {
        const err = new MongoConfigError('Failed to patch mongo', {
          errors: {
            'config.mongo.cmd':
              'Mongo shell binary is not detected in system paths. Please make sure a version >= 3.0 is installed or manually specify the path'
          }
        });
        _handleAsyncError(err, asyncErrors, service);

        _resetMongoCmds(nextConfig);
      }
      needsToUpdateConfigYml = true;
    }

    needsToUpdateConfigYml =
      (await _generateAndCheckMongoCmds(nextConfig)) || needsToUpdateConfigYml;
  }

  await _validateMongoCmd(nextConfig, asyncErrors, service);

  return needsToUpdateConfigYml;
};

const _checkUser = (nextConfig: typeof configDefaults): boolean => {
  let needsToUpdateConfigYml = false;

  const nextUserId = _.get(nextConfig, 'user.id');
  if (nextUserId === null) {
    _.set(nextConfig, 'user.id', _generateUserId());
    needsToUpdateConfigYml = true;
  } else if (nextUserId !== undefined && nextUserId.length !== USER_ID_LEN) {
    throw new UserConfigError('Failed to patch user', {
      errors: {
        'config.user.id': `user id must be a string of ${USER_ID_LEN} length`
      }
    });
  }

  return needsToUpdateConfigYml;
};

export default () =>
  processItems(async (context, item) => {
    const { config: nextConfig, emitChangedEvent, forceSave, fromConfigYml } = item;
    const { service } = context;
    const asyncErrors = {};

    // `ajv` schema should guard most of the correctness by now, but some further checkings are also
    // necessary before accepting and merging config changes

    // checking and generation pipeline
    _checkPerformancePanel(nextConfig);
    let needsToUpdateConfigYml = await _checkMongo(nextConfig, asyncErrors, service);
    needsToUpdateConfigYml = _checkUser(nextConfig) || needsToUpdateConfigYml;

    // calculate differences between nextConfig and current config
    const changed = {};
    const differences = diff(getDumpableConfigView(global.config), nextConfig) || [];

    for (const change of differences) {
      const { kind, path, lhs, rhs } = change;

      if (kind === 'E' || kind === 'N') {
        const k = `config.${path.join('.')}`;
        const changedEntry = {
          old: lhs,
          new: rhs
        };

        if (k in asyncErrors) {
          // $FlowFixMe
          changedEntry.hasAsyncError = true;
        }

        changed[k] = changedEntry;

        applyChange(global.config, nextConfig, change);
      } else if (kind === 'D') {
        // config path doesn't present in nextConfig, so we need to update config yml if this config
        // patching is from config yml
        needsToUpdateConfigYml = true;
      }
    }

    const hasChanges = !_.isEmpty(changed);

    if (hasChanges) {
      // emit changed event
      emitChangedEvent && service.emit('changed', changed);

      l.debug('Patched config: \ndiff - %o\nnew - %o', changed, global.config);
    }

    let p;

    if (
      forceSave ||
      ((fromConfigYml && needsToUpdateConfigYml) || (!fromConfigYml && hasChanges))
    ) {
      // update config.yml
      l.debug(`Updating ${global.CONFIG_PATH}...`);

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
