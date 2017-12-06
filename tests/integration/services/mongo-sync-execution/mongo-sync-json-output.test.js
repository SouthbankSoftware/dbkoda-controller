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
      generateMongoData(port, 'test', 'user', '--num 1000');
      generateMongoData(port, 'users', 'user', '--num 2000');

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
