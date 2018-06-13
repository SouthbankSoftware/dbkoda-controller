/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-13T13:56:36+10:00
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

const { launchSingleInstance, killMongoInstance, generateMongoData } = require('test-utils');
const assert = require('assert');
const {
  connection,
  TIMEOUT,
  syncExecution,
  getRandomPort,
  shell,
  MLAUNCH_TIMEOUT
} = require('../commons');
const os = require('os');

let connectionId;
let shellId;
const port = getRandomPort();

describe('test run shell command', () => {
  before(function(done) {
    if (os.platform() === 'win32') {
      this.skip();
    } else {
      this.timeout(TIMEOUT * 3);
      launchSingleInstance(port);
      setTimeout(() => {
        generateMongoData(port, 'test', 'user', 1000);
        generateMongoData(port, 'users', 'user', 2000);
        setTimeout(() => {
          connection
            .create(
              {},
              {
                query: {
                  url: 'mongodb://localhost:' + port + '/test'
                }
              }
            )
            .then(v => {
              console.log('create connection ', v);
              connectionId = v.id;
              shellId = v.shellId;
              done();
            })
            .catch(e => {
              console.log('error:', e);
            });
        }, MLAUNCH_TIMEOUT);
      }, MLAUNCH_TIMEOUT);
    }
  });

  after(function() {
    this.timeout(TIMEOUT);
    connection.remove(connectionId);
    killMongoInstance(port);
  });

  it('test run show collections through sync service', () => {
    return new Promise((resolve, reject) => {
      syncExecution.timeout = 30000;
      syncExecution
        .update(connectionId, {
          shellId,
          commands: 'use users',
          responseType: 'text'
        })
        .then(o => {
          console.log('get user users output:', o);
          return syncExecution.update(connectionId, {
            shellId,
            commands: 'show collections\n',
            responseType: 'text'
          });
        })
        .then(output => {
          console.log('xxxx test run show collections through sync service:', output);
          resolve(output);
        })
        .catch(err => {
          console.log('err ', err);
          reject(err);
        });
    });
  }).timeout(TIMEOUT);

  it('test run show dbs through sync service', () => {
    return new Promise((resolve, reject) => {
      syncExecution.timeout = 30000;
      return syncExecution
        .update(connectionId, {
          shellId,
          commands: 'show dbs',
          responseType: 'text'
        })
        .then(output => {
          console.log('show dbs output ', output);
          assert.equal(output.indexOf('test') >= 0, true);
          resolve(output);
        })
        .catch(err => {
          reject(err);
        });
    });
  }).timeout(TIMEOUT);

  it('test run promise request through sync service', () => {
    const promises = [];
    promises.push(
      syncExecution.update(connectionId, {
        shellId,
        commands: 'show dbs',
        responseType: 'text'
      })
    );
    promises.push(
      syncExecution.update(connectionId, {
        shellId,
        commands: 'show collections',
        responseType: 'text'
      })
    );
    promises.push(
      syncExecution.update(connectionId, {
        shellId,
        commands: 'use test',
        responseType: 'text'
      })
    );

    return new Promise((resolve, reject) => {
      Promise.all(promises)
        .then(v => {
          console.log('run promise request through sync service xxxx:', v);
          assert.equal(v.length, 3);
          resolve();
        })
        .catch(err => reject(err));
    });
  }).timeout(TIMEOUT);

  it('run sync commands in different shell id', () => {
    let shell1Id;
    let shell2Id;
    let shell3Id;
    return shell
      .create({ id: connectionId })
      .then(o => {
        shell1Id = o.shellId;
        return shell.create({ id: connectionId });
      })
      .then(o => {
        shell2Id = o.shellId;
        return shell.create({ id: connectionId });
      })
      .then(o => {
        shell3Id = o.shellId;
        console.log('shell id ', shell1Id, shell2Id, shell3Id);
        const promises = [];
        promises.push(
          syncExecution.update(connectionId, {
            shellId: shell1Id,
            commands: 'show dbs',
            responseType: 'text'
          })
        );
        promises.push(
          syncExecution.update(connectionId, {
            shellId: shell2Id,
            commands: 'show collections',
            responseType: 'text'
          })
        );
        promises.push(
          syncExecution.update(connectionId, {
            shellId: shell3Id,
            commands: 'use test',
            responseType: 'text'
          })
        );
        return Promise.all(promises);
      })
      .then(o => {
        console.log('get output ', o);
        assert.equal(o.length, 3);
      });
  }).timeout(TIMEOUT);
});
