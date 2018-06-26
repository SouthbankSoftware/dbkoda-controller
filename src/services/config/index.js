/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-05T14:09:35+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-25T19:45:22+10:00
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

/* eslint-disable class-methods-use-this */

import _ from 'lodash';
// $FlowFixMe
import moment from 'moment';
// $FlowFixMe
import yaml from 'js-yaml';
// $FlowFixMe
import errors, { FeathersError } from 'feathers-errors';
import path from 'path';
import { ConfigError } from '~/errors';
import hooks from './hooks';
import { configDefaults } from './configSchema';

// configDefaults should be read-only at all times
global.config = _.cloneDeep(configDefaults);

class Config {
  events: string[];
  fileService: *;
  _fileServiceDisposer: *;

  constructor() {
    this.events = ['changed', 'error'];
  }

  setup(app: *) {
    this.fileService = app.service('/files');

    const loadConfig = (handle404 = false) =>
      this.fileService
        .get(global.CONFIG_PATH, {
          query: {
            watching: 'true' // this should always to be true
          }
        })
        .then(({ content }) => {
          l.debug(`Loading config from ${global.CONFIG_PATH}...`);

          return Promise.resolve()
            .then(() => yaml.safeLoad(content))
            .then(nextConfig => {
              return this.patch('current', {
                config: nextConfig,
                fromConfigYml: true
              }).catch(err => {
                const { errors } = err;

                if (_.isPlainObject(errors)) {
                  const configErr = new ConfigError(
                    'Corrupted entries %o detected in config.yml. Backing up and trying to recover them...',
                    { errors }
                  );
                  l.warn(configErr.message, configErr.errors);
                  this.emitError(configErr, 'warn');

                  return this.backupConfigYml().then(() => {
                    for (const p of _.keys(errors)) {
                      const entryPath = p.replace(/^config\./, '');
                      if (_.has(nextConfig, entryPath)) {
                        _.unset(nextConfig, entryPath);
                      }
                    }

                    // now we try it again one more time
                    return this.patch('current', {
                      config: nextConfig,
                      forceSave: true,
                      fromConfigYml: true
                    }).catch(this.handleError);
                  });
                }

                this.handleError(err);
              });
            })
            .catch(err => {
              const configErr = new ConfigError(
                'Corrupted config.yml detected. Backing up and recovering...',
                { errors: err.errors || { config: err.message } }
              );
              this.handleError(configErr);
              this.emitError(configErr, 'error');

              return this.backupConfigYml().then(() =>
                this.patch('current', {
                  config: configDefaults,
                  emitChangedEvent: false,
                  forceSave: true
                }).catch(this.handleError)
              );
            });
        })
        .catch(err => {
          if (handle404 && err.code === 404) {
            // create config from defaults
            return this.patch('current', {
              config: configDefaults,
              emitChangedEvent: false,
              forceSave: true
            }).catch(this.handleError);
          }

          this.handleError(err);
        });

    this.startWatchingConfigYml(loadConfig);
    return loadConfig(true);
  }

  destroy() {
    const ps = [];

    if (this._fileServiceDisposer) {
      ps.push(this._fileServiceDisposer());
      this._fileServiceDisposer = null;
    }

    return Promise.all(ps);
  }

  startWatchingConfigYml(loadConfig) {
    this._fileServiceDisposer && this._fileServiceDisposer();

    const handleChanged = ({ _id }) => {
      if (_id === global.CONFIG_PATH) {
        loadConfig(false);
      }
    };

    this.fileService.on('changed', handleChanged);

    this._fileServiceDisposer = () => {
      this.fileService.removeListener('changed', handleChanged);
      // unwatch
      return this.fileService
        .patch(global.CONFIG_PATH, {
          watching: false
        })
        .catch(this.handleError);
    };
  }

  backupConfigYml() {
    const configDir = path.dirname(global.CONFIG_PATH);
    const dateStr = moment().format('DD-MM-YYYY_HH-mm-ss');
    const backupPath = path.resolve(configDir, `config.${dateStr}.yml`);

    return this.fileService.get(global.CONFIG_PATH, {
      query: {
        copyTo: backupPath,
        watching: 'false'
      }
    });
  }

  emitError(error: FeathersError, level: 'warn' | 'error' = 'error') {
    // $FlowFixMe
    this.emit('error', { payload: { error, level } });
  }

  handleError = err => {
    l.error(err, err.errors || '');
  };

  find(_params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  get(_id: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  create(_data: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  update(_id: *, _data: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  patch(_id: *, _data: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  remove(_id: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }
}

/** @ignore */
export default function() {
  const app = this;

  // Initialize our service with any options it requires
  app.use('/config', new Config());

  // Get our initialize service to that we can bind hooks
  const service = app.service('/config');

  // Set up our before hooks
  service.before(hooks.before);

  // Set up our after hooks
  service.after(hooks.after);
}
