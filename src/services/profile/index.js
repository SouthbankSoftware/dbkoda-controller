/**
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

class Profile {
  constructor() {
    this.docs = {};
  }

  setup(app) {
    this.app = app;
    this.controller = app.service('mongo/profile/controller');
    this.connectCtr = app.service('mongo/connection/controller');
  }

  patch(id, data) {
    // data is the configuation for profile, it is [{level: 1, slowms: 200, dbName: 'test'}]
    log.debug('patch profile ', id, data);
    const connectObj = this.connectCtr.connections[id];
    return this.controller.patch(connectObj.driver, data);
  }

  get(id, params) {
    l.debug('get ' + id, params);
    const connectObj = this.connectCtr.connections[id];
    const { op } = params.query;
    const { driver, db } = connectObj;
    if (op === 'profile') {
      const { dbName, colName } = params.query;
      return this.controller.profile(driver, dbName, colName);
    } else if (op === 'configuration') {
      return this.controller.get(driver, db);
    }
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new Profile();
  app.use('/profile', service);
  // Get our initialize service to that we can bind hooks
  const profileService = app.service('/profile');

  // Set up our before hooks
  profileService.before(hooks.before);

  // Set up our after hooks
  profileService.after(hooks.after);
  return service;
};

module.exports.Profile = Profile;
