/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-23T16:57:54+11:00
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

const errors = require('feathers-errors');
const hooks = require('./hooks');

class ReconnectionService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      create: {
        description: 'Reconnect to a mongo instance',
        parameters: [
          {
            in: 'query',
            name: 'url',
            type: 'string'
          },
          {
            in: 'query',
            name: 'test',
            type: 'bool'
          },
          {
            in: 'query',
            name: 'database',
            type: 'string'
          },
          {
            in: 'query',
            name: 'discoverMembers',
            type: 'bool'
          },
          {
            in: 'query',
            name: 'id',
            type: 'int'
          },
          {
            in: 'query',
            name: 'shellId',
            type: 'int'
          }
        ]
      }
    };
  }

  setup(app) {
    this.app = app;
    this.controller = app.service('mongo/connection/controller');
  }

  create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current)));
    }
    const connect = this.controller.connections[params.query.id];
    if (!connect) {
      throw new errors.Conflict('Connection ID not existed.');
    }

    return this.controller.create(params.query);
  }
}

module.exports = function() {
  const app = this;
  // Initialize our service with any options it requires
  const service = new ReconnectionService();
  app.use('/mongo-reconnection', service);
  // Get our initialize service to that we can bind hooks
  const mongoConnService = app.service('/mongo-reconnection');

  // Set up our before hooks
  mongoConnService.before(hooks.before);

  // Set up our after hooks
  mongoConnService.after(hooks.after);
  return service;
};

module.exports.ReconnectionService = ReconnectionService;
