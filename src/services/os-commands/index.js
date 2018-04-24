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

const { OSCommandsController } = require('../../controllers/os-commands');

const hooks = require('./hooks');

class OSCommandsService {
  constructor(options) {
    this.options = options || {};
    this.events = [
      OSCommandsController.COMMAND_OUTPUT_EVENT,
      OSCommandsController.COMMAND_FINISH_EVENT
    ];
    this.docs = {
      description: 'A service to create OS command',
      put: {
        description: 'run mongo commands through OS shell',
        parameters: [
          {
            in: 'path',
            required: true,
            name: 'id',
            type: 'string'
          },
          {
            in: 'query',
            required: true,
            name: 'commands',
            type: 'string'
          },
          {
            in: 'query',
            required: true,
            name: 'shellId',
            type: 'string'
          }
        ]
      }
    };
  }

  setup(app) {
    this.controller = new OSCommandsController();
    this.connectCtr = app.service('mongo/connection/controller');
    this.controller.on(OSCommandsController.COMMAND_OUTPUT_EVENT, o => {
      this.emit(OSCommandsController.COMMAND_OUTPUT_EVENT, o);
    });
    this.controller.on(OSCommandsController.COMMAND_FINISH_EVENT, o => {
      this.emit(OSCommandsController.COMMAND_FINISH_EVENT, o);
    });
  }

  /**
   * run script commands on OS
   * @param id  the id of the connection
   * @param data  {shellId, commands, responseType} shellId is the shell id to execute the commands
   */
  update(id, data) {
    log.debug('run commands ', id, data.commands);
    const connt = this.connectCtr.connections[id];
    return this.controller.runCommand(connt, data.commands, data.shellId);
  }

  remove(id, data) {
    log.debug('remove shell connection ', id, data);
    return this.controller.killCurrentProcess(id, data.query.shellId);
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new OSCommandsService();
  app.use('/os-execution', service);

  // Get our initialize service to that we can bind hooks
  const mongoService = app.service('/os-execution');

  // Set up our before hooks
  mongoService.before(hooks.before);

  // Set up our after hooks
  mongoService.after(hooks.after);
  return service;
};

module.exports.OSCommandsService = OSCommandsService;
