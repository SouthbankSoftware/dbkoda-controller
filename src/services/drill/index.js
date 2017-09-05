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

class DrillService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      create: {
        description: 'Create a new connection',
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
          },
          {
            in: 'query',
            required: false,
            name: 'ssl',
            type: 'boolean',
          },
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
      get: {
        description: 'Proxy Drill Service',
        parameters: [
          {
            in: 'path',
            required: true,
            name: 'id',
            type: 'string',
          },
          {
            in: 'query',
            name: 'sql',
            type: 'string',
          },
        ],
      },
    };
  }
  setup(app) {
    this.app = app;
    this.controller = app.service('drill/rest/controller');
  }
  create(params) {
    l.info('create apache drill connection ', params);
    return this.controller.create(params);
  }
  async get(id, params) {
    const connect = this.controller.connections[id];
    if (connect) {
        return await connect({
            uri: '/query.json',
            method: 'POST',
            body: params.sql
          });
    }
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new DrillService();
  app.use('/drill', service);

  // Get our initialize service to that we can bind hooks
  const drillService = app.service('/drill');

  // Set up our before hooks
  drillService.before(hooks.before);

  // Set up our after hooks
  drillService.after(hooks.after);
  return service;
};

module.exports.Service = DrillService;
