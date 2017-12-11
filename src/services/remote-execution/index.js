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

const hooks = require('./hooks');

class RemoteExecService {
  constructor(options) {
    this.options = options || {};
    this.events = ['ssh-shell-output', 'ssh-execution-end'];
    this.docs = {
      create: {
        description: 'create new ssh connection',
        parameters: [
          {
            in: 'query',
            required: true,
            name: 'hostname',
            type: 'string',
          },
          {
            in: 'query',
            required: true,
            name: 'port',
            type: 'string',
          }
        ],
      },
      remove: {
        description: 'Remove a connection',
        parameters: [{
          in: 'query',
          name: 'id',
          type: 'int',
        }]
      },
      update: {
        description: 'execute command via ssh connection',
        parameters: [
          {
            in: 'path',
            required: true,
            name: 'id',
            type: 'string',
          },
          {
            in: 'query',
            name: 'cmd',
            type: 'string',
          },
        ],
      },
    };
  }

  setup(app) {
    this.app = app;
    this.controller = app.service('ssh/remote-execution/controller');
  }

  create(data) {
    return this.controller.connect(data);
  }
  update(id, params) {
    return this.controller.execute(id, params);
  }
  patch(id, params) {
    return this.controller.updateWindow(id, params);
  }
  remove(id) {
    return this.controller.remove(id);
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new RemoteExecService({app_ref: app});
  app.use('/ssh-remote-execution', service);

  // Get our initialize service to that we can bind hooks
  const remoteExecService = app.service('/ssh-remote-execution');

  // Set up our before hooks
  remoteExecService.before(hooks.before);

  // Set up our after hooks
  remoteExecService.after(hooks.after);
  return service;
};

module.exports.RemoteExecService = RemoteExecService;
