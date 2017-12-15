/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-12T14:23:10+11:00
 *
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

export const items = ['topology'];

const Rx = require('rxjs');
const Observable = require('../Observable');

class TopologyMonitor implements Observable {
  constructor() {
    this.rxObservable = new Rx.Subject();
    this.type = 'Unknown';
  }

  init(profileId, options) {
    this.rxObservable = new Rx.Subject();
    this.profileId = profileId;
    this.mongoConnection = options ? options.mongoConnection : null;
    this.db = this.mongoConnection ? this.mongoConnection.driver : null;
    this.start(this.db);
  }

  /**
   * start listening on topology change
   */
  start(db) {
    if (!db || !db.topology) {
      this.rxObservable.error('failed to find mongodb driver.');
      return;
    }
    db.admin().command({replSetGetStatus: 1}, (err) => {
      if (!err) {
        l.info('start monitoring topology');
        db.topology.on('serverDescriptionChanged', (event) => {
          console.log('received serverDescriptionChanged,', event);
          if (event && event.newDescription && event.newDescription.type !== 'Unknown') {
            l.info('replicaset topology was changed');
            this.queryMemberStatus(db).then((members) => {
              l.info('new members:', members);
              this.rxObservable.next({profileId: this.profileId, timestamp: (new Date()).getTime(), value: {topology: members}});
            }).catch(err => this.rxObservable.error(err));
          }
        });
      } else {
        l.info('cant monitor single/shard cluster');
        this.rxObservable.error('this is not mongodb replicaset connection.');
      }
    });
  }

  queryMemberStatus(db) {
    return new Promise((resolve, reject) => {
      db.admin().command({replSetGetStatus: 1}, (err, result) => {
        if (!result || err) {
          reject(err);
          return;
        }
        resolve(result.members);
      });
    }).catch((err) => {
      l.error('failed to get replica set ', err);
      this.rxObservable.error(err);
    });
  }

  destroy() {
    if (this.db.topology) {
      this.db.topology.close();
      this.rxObservable.unsubscribe();
    }
  }
}

module.exports = TopologyMonitor;
