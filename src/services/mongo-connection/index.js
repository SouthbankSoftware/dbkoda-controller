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
 * @Last modified by:   guiguan
 * @Last modified time: 2017-06-08T18:00:54+10:00
 */

const errors = require('feathers-errors');
const _ = require('lodash');
const hooks = require('./hooks');

class ConnectionService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      create: {
        description: 'Create a new connection',
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
          }
        ]
      },
      remove: {
        description: 'Remove a connection',
        parameters: [
          {
            in: 'query',
            name: 'id',
            type: 'int'
          }
        ]
      }
    };
  }

  setup(app) {
    this.app = app;
    this.mongoShell = app.service('/mongo-shells');
    this.controller = app.service('mongo/connection/controller');
  }

  create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current)));
    }
    return this.controller.create(params.query);
  }

  remove(id) {
    l.info('remove connection ', id);
    try {
      return this.controller.remove(id);
    } catch (err) {
      l.error('got errors.');
      l.error(err);
      return { id, error: err.message };
    }
  }

  /**
   * find all connections
   */
  find() {
    l.info('query connection');
    const connects = this.controller.connections;
    return new Promise(resolve => {
      resolve(
        _.keys(connects).map(key => {
          const con = connects[key];
          const shells = _.keys(con.shells).map(shellKey => {
            return { shellId: shellKey };
          });
          return { id: con.id, status: con.status, shells };
        })
      );
    });
  }

  /**
   * get the information about the given connection
   * @param id  connection id
   */
  get(id) {
    const connect = this.controller.connections[id];
    if (connect) {
      return new Promise(resolve => {
        const shells = _.keys(connect.shells).map(key => {
          return { shellId: key };
        });
        resolve(shells);
      });
    }
    throw new errors.AuthenticationError('Cannot find connection with the id ');
  }

  update(id, data) {
    return this.controller.update(id, data);
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new ConnectionService();
  app.use('/mongo-connection', service);
  // Get our initialize service to that we can bind hooks
  const mongoConnService = app.service('/mongo-connection');

  // Set up our before hooks
  mongoConnService.before(hooks.before);

  // Set up our after hooks
  mongoConnService.after(hooks.after);
  return service;
};

module.exports.ConnectionService = ConnectionService;
