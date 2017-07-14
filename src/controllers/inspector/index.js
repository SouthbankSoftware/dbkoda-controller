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
 * @Last modified time: 2017-06-08T17:54:55+10:00
 */

const hooks = require('feathers-hooks-common');
const errors = require('feathers-errors');
const mongodb = require('mongodb');
const MongoShardsInspector = require('./mongo_shards');
const MongoServerInspector = require('./mongo_server');

/**
 * inspect database instance
 */
class InspectorController {
  setup(app) {
    this.app = app;
    this.mongoConnection = app.service('mongo/connection/controller');
    this.shardsInspector = new MongoShardsInspector();
    this.serverInspector = new MongoServerInspector();
  }

  /**
   * inspect the mongo instance for databases, collections, etc.
   *
   * @param id
   * @returns {Promise}
   */
  inspectMongo(id) {
    const connection = this.mongoConnection.connections[id];
    if (!connection) {
      l.error('cant find connection with the id ', id);
      throw new errors.BadRequest('cant find connection with the id ' + id);
    }
    const db = connection.driver;

    return new Promise((resolve, reject) => {
      db
        .command({isMaster: 1})
        .then((value) => {
          if (value.configsvr || db.serverConfig.constructor == mongodb.Mongos) {
            l.info('inspect mongo os');
            const configTree = this.shardsInspector.inspect(db);
            return configTree;
          }
          l.info('inspect mongo instance');
          const configTree = this.serverInspector.inspect(db);
          return configTree;
        })
        .then((v) => {
          resolve({profileId: id, result: v});
        })
        .catch((err) => {
          l.error('failed to run is master ', err);
          reject(err);
        });
    }).catch((err) => {
      l.error('failed to inspect mongo server ', err);
      return new errors.BadRequest(err);
    });
  }
}

module.exports = function () {
  const app = this;

  // Initialize our service with any options it requires
  const service = new InspectorController();
  app.use('mongo/inspector/controller', service);
  app.service('mongo/inspector/controller').before({
    // Users can not be created by external access
    create: hooks.disallow('external'),
    remove: hooks.disallow('external'),
    update: hooks.disallow('external'),
    find: hooks.disallow('external'),
    get: hooks.disallow('external'),
  });
  app.service('mongo/inspector/controller').after({
    // Users can not be created by external access
    create: hooks.disallow('external'),
    remove: hooks.disallow('external'),
    update: hooks.disallow('external'),
    find: hooks.disallow('external'),
    get: hooks.disallow('external'),
  });
  return service;
};

module.exports.InspectorController = InspectorController;
