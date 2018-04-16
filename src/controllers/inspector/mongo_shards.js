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
 * @Last modified time: 2017-06-08T17:56:14+10:00
 */

/* eslint-disable class-methods-use-this */

const errors = require('feathers-errors');
const _ = require('lodash');
const MongoServerInspector = require('./mongo_server');
const treeNodeTypes = require('./tree_node_types').TreeNodeType;

class MongoShardsInspector {
  constructor() {
    this.serverInspector = new MongoServerInspector();
  }

  inspect(driver, db) {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.getAllShards(driver),
        this.getAllConfigs(driver),
        this.getAllMongos(driver),
        this.serverInspector.inspectDatabases(driver, db),
        this.serverInspector.inspectUsers(driver),
        this.serverInspector.inspectAllRoles(driver, db),
        this.serverInspector.inspectReplicaMembers(db),
      ])
        .then((value) => {
          resolve(
            value.filter((v) => {
              return v !== null && v !== undefined;
            })
          );
        })
        .catch((err) => {
          reject(err);
        })
        .catch((err) => {
          reject(err);
        });
    }).catch((err) => {
      l.error('get error ', err);
    });
  }

  getAllConfigs(db) {
    return new Promise((resolve) => {
      const adminDB = db.db(MongoShardsInspector.ADMIN_DB);
      const configTree = { text: 'Config Servers', children: [] };
      adminDB
        .command({ getShardMap: 1 })
        .then((shardMap) => {
          if (shardMap.map && shardMap.map.config) {
            const confHosts = shardMap.map.config.split('/')[1].split(',');
            confHosts.map((conf) => {
              configTree.children.push({ text: conf, type: treeNodeTypes.CONFIG });
            });
            resolve(configTree);
          }
        })
        .catch((err) => {
          l.error('failed to get shard map ', err);
          resolve(configTree);
        });
    }).catch((err) => {
      l.info('cant run get shard map command ', err);
    });
  }

  getAllShards(driver) {
    return new Promise((resolve) => {
      const collection = driver
        .db(MongoShardsInspector.CONFIG_DB)
        .collection(MongoShardsInspector.SHARDS_COLLECTION);
      collection.find({}).toArray((err, docs) => {
        const shardsTree = { text: 'Shards' };
        shardsTree.children = [];
        _.map(docs, (doc) => {
          const shards = doc.host.split(',');
          if (shards && shards.length > 1) {
            let shardRepName = '';
            const nameSplit = shards[0].split('/');
            if (nameSplit.length > 1) {
              shardRepName = nameSplit[0];
              shards[0] = nameSplit[1];
            }
            const shardTree = { text: shardRepName };
            shardTree.children = _.map(shards, (shard) => {
              return { text: shard, type: treeNodeTypes.SHARD };
            });
            shardsTree.children.push(shardTree);
          } else {
            shardsTree.children.push({ text: shards });
          }
        });
        return resolve(shardsTree);
      });
    }).catch((err) => {
      l.error('get all shards error', err);
      throw new errors.BadRequest(err);
    });
  }

  getAllMongos(db) {
    return new Promise((resolve) => {
      const collection = db
        .db(MongoShardsInspector.CONFIG_DB)
        .collection(MongoShardsInspector.MONGOS_COLLECTION);
      collection.find({}).toArray((err, docs) => {
        const shardsTree = { text: 'Routers', children: [] };
        _.map(docs, (doc) => {
          shardsTree.children.push({ text: doc._id, type: treeNodeTypes.MONGOS });
        });
        resolve(shardsTree);
      });
    }).catch((err) => {
      l.error('get all mongos error', err);
      throw new errors.BadRequest(err);
    });
  }
}

MongoShardsInspector.SHARDS_COLLECTION = 'shards';
MongoShardsInspector.MONGOS_COLLECTION = 'mongos';
MongoShardsInspector.CONFIG_DB = 'config';
MongoShardsInspector.ADMIN_DB = 'admin';

module.exports = MongoShardsInspector;
