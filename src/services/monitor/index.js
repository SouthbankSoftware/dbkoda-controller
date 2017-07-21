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
 * Created by joey on 29/6/17.
 */


const prom = require('prom-client');
const hooks = require('./hooks');

const collectDefaultMetrics = prom.collectDefaultMetrics;
const Registry = prom.Registry;
const register = new Registry();

collectDefaultMetrics({ register });
class Monitor {

  find(_) {
    const metrics = prom.register.metrics();
    return new Promise((resolve) => {
      resolve({text: metrics});
    });
  }
}

module.exports = function () {
  const app = this;

  // Initialize our service with any options it requires
  const service = new Monitor();
  app.use('/metrics', service, (req, res) => {
    res.format({
      'text/plain': function() {
        res.end(`${res.data.text}`);
      }
    });
  });

  // Get our initialize service to that we can bind hooks
  const monitorService = app.service('/metrics');

  // Set up our before hooks
  monitorService.before(hooks.before);

  // Set up our after hooks
  monitorService.after(hooks.after);
  return service;
};

module.exports.Monitor = Monitor;
