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
 * Created by joey on 26/9/17.
 */



const errors = require('feathers-errors');
const _ = require('lodash');
const hooks = require('./hooks');
const Driver = require('../../controllers/driver');

class DriverService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      put: {
        description: 'Run script through mongodb driver',
        parameters: [{
          in: 'query',
          name: 'url',
          type: 'string',
        }, {
          in: 'query',
          name: 'test',
          type: 'bool'
        }, {
          in: 'query',
          name: 'database',
          type: 'string'
        }, {
          in: 'query',
          name: 'discoverMembers',
          type: 'bool'
        }]
      },
    };
  }

  setup(app) {
    this.app = app;
    this.connection = app.service('mongo/connection/controller');
  }

  update(id, data) {
    const connect = this.connection.connections[id];
    const driver = new Driver(connect);
    return driver.runCommands(data.commands);
  }
}

module.exports = function () {
  const app = this;

  // Initialize our service with any options it requires
  const service = new DriverService();
  app.use('/mongo-driver', service);
  // Get our initialize service to that we can bind hooks
  const driverService = app.service('/mongo-driver');

  // Set up our before hooks
  driverService.before(hooks.before);

  // Set up our after hooks
  driverService.after(hooks.after);
  return service;
};

module.exports.DriverService = DriverService;
