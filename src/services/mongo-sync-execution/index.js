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
 * @Author: joey
 * @Date:   2016-12-23T13:05:45+11:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-06-08T18:01:54+10:00
 */

const hooks = require('./hooks');

class SyncExecutionService {
  constructor(options) {
    this.options = options || {};
    this.events = ['shell-output', 'mongo-execution-end'];
    this.docs = {
      description: 'A service to create mongo shell and execute command',
      put: {
        description: 'run mongo commands through shell sync',
        parameters: [{
          in: 'path',
          required: true,
          name: 'id',
          type: 'string'
        }, {
          in: 'query',
          required: true,
          name: 'commands',
          type: 'string'
        }, {
          in: 'query',
          required: true,
          name: 'shellId',
          type: 'string'
        }]
      }
    };
  }

  setup(app) {
    this.controller = app.service('mongo/sync-execution/controller');
  }

  /**
   * run script commands on mongo shell
   * @param id  the id of the connection
   * @param data  {shellId, commands, responseType} shellId is the shell id to execute the commands
   */
  update(id, data) {
    if (data.swapProfile == true) {
      log.info('swap to databse ', id, data.shellId, data.newProfile);
      return this.controller.swapProfile(id, data.shellId, data.newProfile);
    } else { // eslint-disable-line
      log.info('run script commands', id, data, data.shellId);
      return this.controller.writeSyncCommand(id, data.shellId, data.commands, data.responseType);
    }
  }
}

module.exports = function () {
  const app = this;

  // Initialize our service with any options it requires
  const service = new SyncExecutionService();
  app.use('/mongo-sync-execution', service);

  // Get our initialize service to that we can bind hooks
  const mongoExecutionService = app.service('/mongo-sync-execution');

  // Set up our before hooks
  mongoExecutionService.before(hooks.before);

  // Set up our after hooks
  mongoExecutionService.after(hooks.after);
  return service;
};

module.exports.SyncExecutionService = SyncExecutionService;
