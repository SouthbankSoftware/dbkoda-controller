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
/* eslint class-methods-use-this: 0 */
import path from 'path';
import os from 'os';

const hooks = require('./hooks');

class SupportBundleService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      description: 'A service for creating support bundles.',
      get: {
        description: 'create a support bundle.',
        parameters: [],
      },
    };
  }

  async get() {
    const bundlePath = await this._createBundle();
    return Promise.resolve(bundlePath);
  }

  _createBundle() {
    return new Promise((resolve) => {
      // Do all the logic to create a bundle.
      let logPath = path.resolve('controller-dev.log');
      let configPath = path.resolve(os.homedir(), '.dbKoda', 'config.yml');
      let statePath = path.resolve(os.homedir(), '.dbKoda', 'stateStore.json');

      if (global.IS_PROD) {
        l.info('Creating new support bundle.');
        l.info('The following paths will be added to a support bundle: ');
        l.info(logPath);
        l.info(configPath);
        l.info(statePath);
        logPath = process.env.LOG_PATH;
        configPath = process.env.CONFIG_PATH;
        statePath = path.resolve(os.homedir(), '.dbKoda', 'config.yml');
        // Create Support Bundle at Log Location.

        // Return location of file.
        resolve(logPath);
      } else {
        l.info('Creating new support bundle (dev mode).');
        l.info('The following paths will be added to a support bundle: ');
        l.info(logPath);
        l.info(configPath);
        l.info(statePath);
      }
      const filePath = 'abc';
      resolve(filePath);
    });
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new SupportBundleService();
  app.use('/supportBundle', service);

  // Get our initialize service to that we can bind hooks
  const supportBundleService = app.service('/supportBundle');

  // Set up our before hooks
  supportBundleService.before(hooks.before);

  // Set up our after hooks
  supportBundleService.after(hooks.after);
  return service;
};

module.exports.Service = SupportBundleService;
