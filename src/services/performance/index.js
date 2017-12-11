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
 * Created by joey on 11/12/17.
 */

const hooks = require('./hooks');
const SSHCounter = require('../../controllers/performance/SSHCounter');

class PerformanceService {
  constructor(options) {
    this.options = options || {};
    this.events = [''];
  }

  setup(app) {
    this.connectCtr = app.service('mongo/connection/controller');
    this.performanceCtr = new SSHCounter(this.connectCtr);
  }

  create(params) {
    this.performanceCtr.create(params);
  }
}

module.exports = function () {
  const app = this;

  // Initialize our service with any options it requires
  const service = new PerformanceService();
  app.use('/performance', service);

  // Get our initialize service to that we can bind hooks
  const mongoService = app.service('/performance');

  // Set up our before hooks
  mongoService.before(hooks.before);

  // Set up our after hooks
  mongoService.after(hooks.after);
  return service;
};

module.exports.PerformanceService = PerformanceService;

