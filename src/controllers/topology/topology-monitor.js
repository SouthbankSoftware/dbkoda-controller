/**
 * Created by joey on 11/12/17.
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-12T11:11:21+11:00
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

const _ = require('lodash');

class TopologyMonitor {
  constructor(db) {
    this.db = db;
    this.type = 'Unknown';
  }

  /**
   * start listening on topology change
   */
  start() {
    if (!this.db.topology) {
      return;
    }
    this.db.admin().command({ replSetGetStatus: 1 }, (err) => {
      if (!err) {
        console.log('start listening');
        this.db.topology.on('serverDescriptionChanged', (event) => {
          console.log('received serverDescriptionChanged');
          console.log(event);
          if (event && event.newDescription && event.newDescription.type !== 'Unknown') {
            // select a new primary
            this.queryMemberStatus().then((members) => {
              console.log('new memebers:', members);
              const primary = _.find(members, { state: 1 });
              console.log('primary:', primary);
            });
          }
        });
      } else {
        console.log('failed to monitor single');
      }
    });
  }

  queryMemberStatus() {
    return new Promise((resolve) => {
      this.db.admin().command({ replSetGetStatus: 1 }, (err, result) => {
        if (!result) {
          resolve(null);
          return;
        }
        resolve(result.members);
      });
    }).catch((err) => {
      l.error('failed to get replica set ', err);
    });
  }
}

module.exports = TopologyMonitor;
