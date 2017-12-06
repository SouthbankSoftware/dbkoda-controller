const winston = require('winston');
const {launchSingleInstance, killMongoInstance, generateMongoData} = require('test-utils');
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
  before(function (done) {
    if (os.platform() === 'win32') {
      this.skip();
    } else {
      this.timeout(TIMEOUT * 3);
      launchSingleInstance(port);
      setTimeout(() => {
        generateMongoData(port, 'test', 'user', '--num 1000');
        generateMongoData(port, 'users', 'user', '--num 2000');
        setTimeout(() => {
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
              done();
            })
            .catch((e) => {
              console.log('error:', e);
            });
        }, MLAUNCH_TIMEOUT);
      }, MLAUNCH_TIMEOUT);
    }
  });

  after(function () {
    this.timeout(TIMEOUT);
    connection.remove(connectionId);
    killMongoInstance(port);
  });

  it('test run show collections through sync service', () => {
    return new Promise((resolve, reject) => {
      syncExecution.timeout = 30000;
      syncExecution.update(connectionId, {
        shellId,
        commands: 'use users',
        responseType: 'text',
      }).then((o) => {
        console.log('get user users output:', o);
        return syncExecution.update(connectionId, {
          shellId,
          commands: 'show collections\n',
          responseType: 'text',
        });
      }).then((output) => {
        console.log('xxxx test run show collections through sync service:', output);
        resolve(output);
      }).catch((err) => {
        console.log('err ', err);
        reject(err);
      });
    });
  }).timeout(TIMEOUT);

  it('test run show dbs through sync service', () => {
    return new Promise((resolve, reject) => {
      syncExecution.timeout = 30000;
      return syncExecution.update(connectionId, {
        shellId,
        commands: 'show dbs',
        responseType: 'text',
      }).then((output) => {
        console.log('show dbs output ', output);
        assert.equal(output.indexOf('test') >= 0, true);
        resolve(output);
      }).catch((err) => {
        reject(err);
      });
    });
  }).timeout(TIMEOUT);

  it('test run promise request through sync service', () => {
    const promises = [];
    promises.push(syncExecution.update(connectionId, {
      shellId,
      commands: 'show dbs',
      responseType: 'text'
    }));
    promises.push(syncExecution.update(connectionId, {
      shellId,
      commands: 'show collections',
      responseType: 'text'
    }));
    promises.push(syncExecution.update(connectionId, {
      shellId,
      commands: 'use test',
      responseType: 'text'
    }));

    return new Promise((resolve, reject) => {
      Promise.all(promises).then((v) => {
        console.log('run promise request through sync service xxxx:', v);
        assert.equal(v.length, 3);
        resolve();
      }).catch(err => reject(err));
    });
  }).timeout(TIMEOUT);

  it('run sync commands in different shell id', () => {
    let shell1Id;
    let shell2Id;
    let shell3Id;
    return shell.create({id: connectionId}).then((o) => {
      shell1Id = o.shellId;
      return shell.create({id: connectionId});
    }).then((o) => {
      shell2Id = o.shellId;
      return shell.create({id: connectionId});
    }).then((o) => {
      shell3Id = o.shellId;
      console.log('shell id ', shell1Id, shell2Id, shell3Id);
      const promises = [];
      promises.push(syncExecution.update(connectionId, {
        shellId: shell1Id,
        commands: 'show dbs',
        responseType: 'text'
      }));
      promises.push(syncExecution.update(connectionId, {
        shellId: shell2Id,
        commands: 'show collections',
        responseType: 'text'
      }));
      promises.push(syncExecution.update(connectionId, {
        shellId: shell3Id,
        commands: 'use test',
        responseType: 'text'
      }));
      return Promise.all(promises);
    }).then((o) => {
      console.log('get output ', o);
      assert.equal(o.length, 3);
    });
  }).timeout(TIMEOUT);
});
