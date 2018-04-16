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
 *
 *
 * @Author: Wahaj Shamim <wahaj>
 * @Date:   2017-02-13T12:23:52+11:00
 * @Email:  wahaj@southbanksoftware.com
 * @Last modified by:   chris
 * @Last modified time: 2017-09-11T15:36:13+10:00
 */

/* eslint-disable class-methods-use-this */

const errors = require('feathers-errors');
const _ = require('lodash');
const treeNodeTypes = require('./tree_node_types').TreeNodeType;

class MongoServerInspector {
  inspect(driver, db) {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.inspectDatabases(driver, db),
        this.inspectUsers(driver),
        this.inspectAllRoles(driver, db),
        this.inspectReplicaMembers(db),
      ])
        .then((value) => {
          l.debug('generate tree topology ', value);
          resolve(
            value.filter((v) => {
              return v !== null && v !== undefined;
            })
          );
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * discover all databases in a mongodb instance
   */
  inspectDatabases(driver, currentDb) {
    return new Promise((resolve, _reject) => {
      const adminDb = currentDb.admin();
      const inspectResult = {text: 'Databases', children: []};
      adminDb
        .listDatabases()
        .then((dbs) => {
          const promises = [];
          // inspect into each database
          dbs.databases.map((database) => {
            promises.push(this.inspectDatabase(driver, database.name));
          });
          Promise.all(promises)
            .then((values) => {
              inspectResult.children = _.sortBy(values, 'text');
              // inspectResult = _.sortBy(inspectResult, 'text');
              resolve(inspectResult);
            })
            .catch((err) => {
              l.error('failed to inspect database ', err);
            });
        })
        .catch((err) => {
          log.warn(err.message);
          this.inspectDatabase(driver, currentDb.databaseName)
            .then((value) => {
              inspectResult.children = [value];
              resolve(inspectResult);
            });
        });
    }).catch((err) => {
      l.error('get error ', err);
      return new errors.BadRequest(err);
    });
  }

  /**
   * inspect the given database
   *
   * @param db  the database driver instance
   * @param name  the name of the database need to be inspected.
   * @returns {Promise} resolve the databse json object
   */
  inspectDatabase(db, name) {
    return new Promise((resolve) => {
      db
        .db(name)
        .collections()
        .then((collections) => {
          const dbData = {text: name, type: treeNodeTypes.DATABASE};
          dbData.children = _.map(collections, (col) => {
            return {
              text: col.collectionName,
              type: treeNodeTypes.COLLECTION,
            };
          });
          dbData.children = _.sortBy(dbData.children, 'text');
          return {dbData, collections};
        })
        .then((value) => {
          const promises = [];
          const {dbData} = value;
          value.collections.map((col) => {
            promises.push(
              this.inspectIndex(col, _.find(dbData.children, {text: col.collectionName}))
            );
          });
          return Promise.all(promises).then(() => {
            resolve(dbData);
          });
        });
    });
  }

  /**
   * inspect the index under a collection
   *
   * @param db  db driver instance
   * @param col the collection instance
   */
  inspectIndex(col, data) {
    return new Promise((resolve) => {
      col.indexes((err, indexes) => {
        if (!indexes) {
          resolve();
          return;
        }
        const idx = indexes.filter((index) => {
          return index.name !== '_id_';
        });
        const result = idx.map((index) => {
          return {text: index.name, type: treeNodeTypes.INDEX};
        });
        if (result.length === 0) {
          resolve(null);
        } else {
          data.children = result;
        }
        resolve();
      });
    }).catch((err) => {
      l.error('failed to get index', err);
    });
  }

  /**
   * query users from mongodb instance
   *
   * @param db
   */
  inspectUsers(driver) {
    const users = {text: 'Users', children: []};
    return new Promise((resolve) => {
      const userCollection = driver.db('admin').collection('system.users');
      if (!userCollection) {
        resolve(users);
        return;
      }
      userCollection.find({}, {_id: 1, 'user': 1, 'db': 1}).toArray((err, items) => {
        if (err || !items || items.length <= 0) {
          resolve(users);
          return;
        }
        const children = items.map((item) => {
          return {text: item._id, user: item.user, db: item.db, type: treeNodeTypes.USERS};
        });
        users.children = _.uniqBy(children, (e) => {
          return e.text;
        });
        resolve(users);
      });
      // db.command({usersInfo: 1}, (err, result) => {
      //   if (!result) {
      //     resolve(users);
      //     return;
      //   }
      //   users.children = _.map(result.users, (user) => {
      //     return {text: user.user, db: user.db, type: treeNodeTypes.USERS};
      //   });
      //   resolve(users);
      // });
    }).catch((err) => {
      l.error('get error ', err);
      return users;
    });
  }

  inspectAllRoles(driver, db) {
    const allRoles = { text: 'Roles', children: [] };
    return new Promise((resolve) => {
      const promises = [];
      const adminDb = db.admin();
      adminDb.listDatabases().then((dbs) => {
        _.map(dbs.databases, (currentDb) => {
          promises.push(this.inspectRoles(driver, currentDb));
        });
        Promise.all(promises).then((values) => {
          values = values.filter((value) => {
            return value;
          });
          allRoles.children = values;
          allRoles.children = allRoles.children.filter((roles) => {
            return !roles.children.length <= 0;
          });
          resolve(allRoles);
        });
      }).catch((err) => {
        log.warn(err.message);
        resolve(allRoles);
      });
    }).catch((err) => {
      log.error('get error ', err);
      return allRoles;
    });
  }

  inspectRoles(driver, currentDb) {
    return new Promise((resolve) => {
      const dbName = currentDb.name;
      const showBuiltin = (dbName === 'admin');
      driver.db(dbName).command({ rolesInfo: 1, showBuiltinRoles: showBuiltin })
        .then((roleList) => {
          const roles = { text: dbName, children: [], type: treeNodeTypes.ROLES };
          if (!roleList || roleList.length <= 0) {
            resolve(roles);
            return roles;
          }
          if (showBuiltin) {
            roles.children[0] = { text: 'Built-In', children: [] };
          }
          _.each(roleList.roles, (role) => {
            if (showBuiltin && role.isBuiltin) {
              roles.children[0].children.push({
                text: role.role,
                db: role.db,
                type: treeNodeTypes.DEFAULT_ROLE
              });
            } else {
              roles.children.push({
                text: role.role,
                db: role.db,
                type: treeNodeTypes.ROLE
              });
            }
          });
          resolve(roles);
        })
        .catch((err) => {
          l.error('inspectRoles error ', err);
          resolve();
        });
      });
  }

  getMemberState(member) {
    if (member.state == 0) {
      return '(STARTUP)'; // startup
    }
    if (member.state == 1) {
      return '(P)'; // primary
    }
    if (member.state == 2) {
      return '(S)'; // secondary
    }
    if (member.state == 3) {
      return '(R)'; // recovering
    }
    if (member.state == 5) {
      return '(STARTUP2)';
    }
    if (member.state == 7) {
      return '(A)'; // arbiter
    }
    if (member.state == 8) {
      return '(D)'; // down
    }
    if (member.state == 9) {
      return '(ROLLBACK)';
    }
    if (member.state == 10) {
      return '(REMOVED)';
    }
    return '(UNKNOWN)';
  }

  /**
   * discover members under replica set
   *
   * @param db
   */
  inspectReplicaMembers(db) {
    const replica = {text: 'Replica Set', children: []};
    return new Promise((resolve) => {
      // db.command({isMaster: 1}, (err, result) => {
      //   if (!result || !result.hosts || result.hosts.length <= 0) {
      //     resolve(null);
      //     return;
      //   }
      //   replica.children = result.hosts.map((host) => {
      //     return {text: host + ' ' + this.getMemberState(host), type: treeNodeTypes.REPLICA_MEMBER};
      //   });
      //   if (result && result.arbiters) {
      //     result.arbiters.map((arbiter) => {
      //       replica.children.push({text: arbiter + ' (A)', type: treeNodeTypes.ARBITER});
      //     });
      //   }
      //   resolve(replica);
      // });

      db.admin().command({replSetGetStatus: 1}, (err, result) => {
        if (!result) {
          resolve(null);
          return;
        }
        if (result && result.members && result.members.length > 0) {
          replica.children = _.map(result.members, (member) => {
            const memberState = this.getMemberState(member);
            let treeNodeType;
            switch (memberState) {
              case '(P)':
                treeNodeType = treeNodeTypes.PRIMARY;
                break;
              case '(S)':
                treeNodeType = treeNodeTypes.SECONDARY;
                break;
              case '(A)':
                treeNodeType = treeNodeTypes.ARBITER;
                break;
              default:
                treeNodeType = treeNodeTypes.REPLICA_MEMBER;
            }
            return {text: member.name + ' ' + memberState, type: treeNodeType};
          });
        }
        resolve(replica);
      });
    }).catch((err) => {
      l.error('failed to get replica set ', err);
    });
  }
}

module.exports = MongoServerInspector;
