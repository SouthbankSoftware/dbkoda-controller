/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-01-29T15:13:01+11:00
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

const winston = require('winston');
const {launchSingleInstance, killMongoInstance, generateMongoData} = require('test-utils');
// const assert = require('assert');
const {
  connection,
  TIMEOUT,
  syncExecution,
  getRandomPort,
  MLAUNCH_TIMEOUT
} = require('../commons');
const os = require('os');

let connectionId;
let shellId;
const port = getRandomPort();

describe('test run shell command', () => {
  before(function (done) {
    if (os.platform() === 'win32') {
      this.skip();
    } else {
      this.timeout(TIMEOUT * 3);
      launchSingleInstance(port);
      generateMongoData(port, 'test', 'user', 1000);
      generateMongoData(port, 'users', 'user', 2000);

      connection
        .create(
          {},
          {
            query: {
              url: 'mongodb://localhost:' + port + '/test',
            },
          },
        )
        .then((v) => {
          winston.info('create connection ', v);
          connectionId = v.id;
          shellId = v.shellId;
          setTimeout(() => done(), MLAUNCH_TIMEOUT);
        })
        .catch((e) => {
          console.log('error:', e);
        });
    }
  });

  after(function () {
    this.timeout(TIMEOUT);
    connection.remove(connectionId);
    killMongoInstance(port);
  });


  it('test explain output for json', () => {
    return new Promise((resolve, reject) => {
      syncExecution.update(connectionId, {
        shellId,
        commands: 'use test1',
        responseType: 'text'
      }).then(() => {
        return syncExecution.update(connectionId, {
          shellId,
          commands: 'db.user.find().explain("executionStats")',
          responseType: 'json'
        });
      }).then((output) => {
        console.log('write output xXXX: ', output);
        JSON.parse(output);
        return syncExecution.update(connectionId, {
          shellId,
          commands: 'db.user.find().explain()',
          responseType: 'json'
        });
      }).then((output) => {
        JSON.parse(output);
        return syncExecution.update(connectionId, {
          shellId,
          commands: 'db.user.find().explain("allPlansExecution")',
          responseType: 'json'
        });
      }).then((output) => {
        JSON.parse(output);
        resolve();
      }).catch(err => reject(err));
    });
  }).timeout(TIMEOUT);

  it('test get log global command', () => {
    return new Promise((resolve, reject) => {
      syncExecution.update(connectionId, {
        shellId,
        commands: 'db.getSiblingDB("admin").runCommand({ getLog: "global" })',
        responseType: 'json'
      }).then((output) => {
        console.log('get log output ');
        console.log(output);
        // JSON.parse(output);
        resolve();
      }).catch(err => reject(err));
    });
  }).timeout(TIMEOUT);

  // TODO: this test case crash node js process on windows
  // it('test server statistic command', () => {
  //   return new Promise((resolve, reject) => {
  //     syncExecution.update(connectionId, {
  //       shellId,
  //       commands: 'dbeSS.serverStatistics()'
  //     }).then((output) => {
  //       JSON.parse(output.replace(/[\r\n\t]*/g, ''));
  //       resolve();
  //     }).catch(err => reject(err));
  //   });
  // }).timeout(TIMEOUT);

  it('test get collection stats command', () => {
    return new Promise((resolve, reject) => {
      syncExecution.update(connectionId, {
        shellId,
        commands: 'db.getSiblingDB("test").user.stats(1024)',
        responseType: 'json'
      }).then((output) => {
        console.log('test get log global command get output');
        console.log(output);
        JSON.parse(output.replace(/[\r\n\t]*/g, ''));
        resolve();
      }).catch(err => reject(err));
    });
  }).timeout(TIMEOUT);

  it('test get user roles command', () => {
    return new Promise((resolve, reject) => {
      syncExecution.update(connectionId, {
        shellId,
        commands: 'db.getSiblingDB("test").getRoles({rolesInfo: 1, showPrivileges: false, showBuiltinRoles: true})',
        responseType: 'json'
      }).then((output) => {
        console.log('test get user roles command get output', output);
        JSON.parse(output.replace(/[\r\n\t]*/g, ''));
        resolve();
      }).catch(err => reject(err));
    });
  }).timeout(TIMEOUT);

  it('test get user roles command', () => {
    return new Promise((resolve, reject) => {
      syncExecution.update(connectionId, {
        shellId,
        commands: 'db.getSiblingDB("admin").runCommand( { getParameter : "*" })',
        responseType: 'json'
      }).then((output) => {
        console.log('test get user roles command get output', output);
        JSON.parse(output);
        resolve();
      }).catch(err => reject(err));
    });
  }).timeout(TIMEOUT);
});
