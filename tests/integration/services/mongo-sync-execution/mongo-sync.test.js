
const winston = require('winston');
const {launchSingleInstance, killMongoInstance, generateMongoData} = require('test-utils');
const assert = require('assert');
const {
  connection,
  TIMEOUT,
  syncExecution,
  getRandomPort,
} = require('../commons');

let connectionId;
let shellId;
const port = getRandomPort();

describe('test run shell command', () => {
  before(function (done) {
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
        done();
      })
      .catch((e) => {
        console.log('error:', e);
      });
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
        commands: 'use users\nshow collections\n',
        responseType: 'text',
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
        console.log('show dbs ourput ', output);
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
        // assert.equal(true, v[0].indexOf('local') >= 0, 'show dbs assert failed.');
        // assert.equal(true, v[1].indexOf('user') >= 0, 'show collections assert failed.');
        // assert.equal(true, v[2].indexOf('switched to db test') >= 0, 'use test assert failed.');
        resolve();
      }).catch(err => reject(err));
    });
  }).timeout(TIMEOUT);
});
