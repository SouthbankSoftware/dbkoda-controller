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
 * @Author: chris
 * @Date:   2017-04-05T11:47:34+10:00
 * @Email:  chris@southbanksoftware.com
 * @Last modified by:   guiguan
 * @Last modified time: 2017-06-08T18:01:42+10:00
 */

const hooks = require('./hooks');

class StopService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      description: 'A service to cancel an action on the shell with the passed id',
      get: {
        description: 'Send the cancel command to the shell',
        parameters: [{
          in: 'path',
          required: true,
          name: 'id',
          type: 'string'
        },
        {
          in: 'query',
          required: true,
          name: 'shellId',
          type: 'string'
        }]
      }
    };
  }

  setup(app) {
    this.controller = app.service('mongo/connection/controller');
  }

  get(id, params) {
    l.info('Stopping execution of ' + id + ' / ' + params.query.shellId);
    const shell = this.controller.getMongoShell(id, params.query.shellId);
    let result;
    if (shell.executing) {
      result = Promise.resolve(shell.write('\x03'));
    } else {
      result = Promise.reject('No commands are currently executing');
    }
    return result;
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new StopService();
  app.use('/mongo-stop-execution', service);

  // Get our initialize service to that we can bind hooks
  const mongoStopExecutionService = app.service('/mongo-stop-execution');

  // Set up our before hooks
  mongoStopExecutionService.before(hooks.before);

  // Set up our after hooks
  mongoStopExecutionService.after(hooks.after);
  return service;
};

module.exports.Service = StopService;
