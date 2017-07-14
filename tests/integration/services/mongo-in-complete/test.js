/**
 * @Author: guiguan
 * @Date:   2017-04-18T08:02:52+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T11:27:25+10:00
 */

const winston = require('winston');
const {launchSingleInstance, killMongoInstance, generateMongoData} = require('test-utils');
const {
  connection,
  shell,
  TIMEOUT,
  events,
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
    killMongoInstance(port);
    shell.removeAllListeners(events.OUTPUT);
    return connection.remove(connectionId);
  });

  it('test run in-complete statement', () => {
    shell.update(connectionId, {
      shellId,
      commands: 'db.user.find(',
    });

    let incomplete = false;
    let expectedOutput = false;
    return new Promise((resolve) => {
      shell.on(events.OUTPUT, (msg) => {
        winston.info('test run in-complete statement: get output ', msg);
        if (msg.output && msg.output.includes('...') && !incomplete) {
          incomplete = true;
          shell.update(connectionId, {
            shellId,
            commands: 'use admin',
          });
        }
        if (msg.output && msg.output.indexOf('admin') >= 0) {
          expectedOutput = true;
        }
        if (incomplete && expectedOutput) {
          resolve();
        }
      });
    });
  }).timeout(TIMEOUT);
});
