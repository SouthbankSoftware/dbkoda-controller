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
    this.bControllerInit = false;
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
      update: {
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
  // setup(app) {
  //   this.app = app;
  //   this.controller = app.service('drill/rest/controller');
  // }
  initController() {
    if (this.options.app_ref) {
      const drillRestController = require('../../controllers/drill-rest');
      this.options.app_ref.configure(drillRestController);
      this.controller = this.options.app_ref.service('drill/rest/controller');
      this.bControllerInit = true;
    }
  }
  create(params) {
    console.log('bControllerInit 1', this.bControllerInit);
    if (!global.IS_JAVA) {
      const err = new Error('Java undetected');
      err.code = 'JAVA_UNDETECTED';
      throw err;
    }
    if (!this.bControllerInit) {
      this.initController();
      console.log('bControllerInit 2', this.bControllerInit);
    }
    l.info('create apache drill connection ', params);
    return this.controller.create(params);
  }
  update(id, params) {
    console.log('drill get:', params);
    return this.controller.getData(id, params);
  }
  remove(params) {
    return this.controller.remove(params);
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new DrillService({app_ref: app});
  app.use('/drill', service);

  // Get our initialize service to that we can bind hooks
  const drillService = app.service('/drill');

  // Set up our before hooks
  drillService.before(hooks.before);

  // Set up our after hooks
  drillService.after(hooks.after);
  return service;
};

module.exports.DrillService = DrillService;
