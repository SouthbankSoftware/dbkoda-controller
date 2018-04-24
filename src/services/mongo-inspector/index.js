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
 * @Last modified time: 2017-06-08T18:01:07+10:00
 */

const hooks = require('./hooks');

class InspectorService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      get: {
        description: 'Inspect a Mongo Instance',
        parameters: [
          {
            in: 'path',
            name: 'id',
            type: 'string'
          }
        ]
      }
    };
  }

  setup(app) {
    this.controller = app.service('mongo/inspector/controller');
  }

  get(id, _params) {
    l.info('inspect mongo instance ', id);
    return this.controller.inspectMongo(id);
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new InspectorService();
  app.use('/mongo-inspector', service);

  const inspectorService = app.service('/mongo-inspector');

  // Set up our before hooks
  inspectorService.before(hooks.before);

  // Set up our after hooks
  inspectorService.after(hooks.after);

  return service;
};

module.exports.InspectorService = InspectorService;
