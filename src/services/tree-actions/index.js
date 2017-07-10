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
 * Created by joey on 7/7/17.
 */

const errors = require('feathers-errors');
const hooks = require('./hooks');
const { executeTreeActions } = require('../../controllers/tree-actions');

class TreeActionService {

  constructor(options) {
    this.options = options || {};
    this.events = ['shell-output', 'mongo-execution-end'];
    this.docs = {
      description: 'This service is used to run tree actions commands',
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
          name: 'type',
          type: 'string'
        }, {
          in: 'query',
          required: true,
          name: 'parameters',
          type: 'string'
        }]
      }
    };
  }

  setup(app) {
    this.controller = app.service('mongo/connection/controller');
  }

  get(id, data) {
    log.info('request ', data, ' for connection ', id);
    const con = this.controller.connections[id];
    if (!con) {
      throw new errors.BadRequest('Cant find connection ', id);
    }
    return executeTreeActions(con.driver, data.query);
  }
}

module.exports = function () {
  const app = this;

  // Initialize our service with any options it requires
  const service = new TreeActionService();
  app.use('/tree-actions', service);

  // Get our initialize service to that we can bind hooks
  const collection = app.service('/tree-actions');

  // Set up our before hooks
  collection.before(hooks.before);

  // Set up our after hooks
  collection.after(hooks.after);
  return service;
};

module.exports.TreeActionService = TreeActionService;
