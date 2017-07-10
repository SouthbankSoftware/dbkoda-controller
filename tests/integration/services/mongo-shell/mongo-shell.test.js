/**
 * @Author: guiguan
 * @Date:   2017-04-18T08:02:52+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T11:27:25+10:00
 */

const winston = require('winston');
const uuidV1 = require('node-uuid');
const {launchSingleInstance, killMongoInstance, generateMongoData} = require('test-utils');
const MongoShell = require('../../../../src/controllers/mongo-shell').MongoShell;
const {
  connection,
  shell,
  TIMEOUT,
  events,
  getRandomPort,
} = require('../commons');
const assert = require('assert');

let connectionId;
let shellId;
const port = getRandomPort();

describe('test run shell command', () => {
  before(function (done) {
    this.timeout(TIMEOUT * 3);
    shell.removeAllListeners(events.OUTPUT);
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
    shell.removeAllListeners(events.OUTPUT);
    killMongoInstance(port);
  });

  afterEach(() => {
    shell.removeAllListeners(events.OUTPUT);
  });

  it('test run show collections', () => {
    shell.update(connectionId, {
      shellId,
      commands: 'use users;show collections',
    });
    return new Promise((resolve) => {
      shell.on(events.OUTPUT, (msg) => {
        winston.info('test run show collections, get command output ', msg);
        if (msg.output && msg.output.includes('user')) {
          resolve();
        }
      });
    });
  }).timeout(TIMEOUT);

  it('test run find command', () => {
    shell.update(connectionId, {
      shellId,
      commands: 'db.user.find()',
    });
    return new Promise((resolve) => {
      shell.on(events.OUTPUT, (msg) => {
        console.log('test run find command output message: ', msg);
        if (msg.output) {
          resolve();
        }
      });
    }).catch((err) => {
      winston.error('get error ', err);
      assert.equal(true, false);
    });
  }).timeout(TIMEOUT);

  it('test send empty command to mongo shell', () => {
    shell.update(connectionId, {
      shellId,
      commands: '',
    });
    return new Promise((resolve) => {
      shell.on(events.OUTPUT, (msg) => {
        if (msg.output && msg.output.indexOf(MongoShell.prompt) >= 0) {
          resolve();
        }
      });
    });
  }).timeout(TIMEOUT);

  it('test sending exit command to shell', () => {
    shell.update(connectionId, {
      shellId,
      commands: 'exit\nshow dbs\n',
    });
    return new Promise((resolve) => {
      shell.on(events.OUTPUT, (output) => {
        if (output && output.output && output.output.indexOf('show dbs') >= 0) {
          resolve();
        }
      });
    });
  }).timeout(TIMEOUT);

  it('test sending exit command to shell with semicolon', () => {
    shell.update(connectionId, {
      shellId,
      commands: 'exit;\nshow dbs\n',
    });
    return new Promise((resolve) => {
      shell.on(events.OUTPUT, (output) => {
        if (output && output.output && output.output.indexOf('show dbs') >= 0) {
          resolve();
        }
      });
    });
  }).timeout(TIMEOUT);

  it('test sending quit() command to shell with semicolon', () => {
    shell.update(connectionId, {
      shellId,
      commands: 'quit();\nshow dbs\n',
    });
    return new Promise((resolve) => {
      shell.on(events.OUTPUT, (output) => {
        if (output && output.output && output.output.indexOf('show dbs') >= 0) {
          resolve();
        }
      });
    });
  }).timeout(TIMEOUT);

  it('test shell connection with existed id', () => {
    const shellId = uuidV1();
    return shell.create({id: connectionId}, {query: {shellId}})
      .then((v) => {
      console.log('xxx:', v);
        assert.equal(v.id, connectionId);
      assert.equal(v.shellId, shellId);
      });
  });

  it('test sending tab twice', () => {
    shell.update(connectionId, {
      shellId,
      commands: 'show \t\t dbs\n',
    });
    return new Promise((resolve) => {
      shell.on(events.OUTPUT, (output) => {
        console.log('get send tab twice output ', output);
        if (output && output.output && output.output.length > 0) {
          resolve();
        }
      });
    });
  });
});
