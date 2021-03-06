/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-13T13:56:20+10:00
 */

const { launchSingleInstance, killMongoInstance, generateMongoData } = require('test-utils');
const {
  connection,
  shell,
  TIMEOUT,
  events,
  getRandomPort,
  MLAUNCH_TIMEOUT
} = require('../commons');

let connectionId;
let shellId;
const port = getRandomPort();

describe('test run shell command', () => {
  before(function(done) {
    this.timeout(TIMEOUT * 3);
    launchSingleInstance(port);
    setTimeout(() => generateMongoData(port, 'test', 'user', 1000), MLAUNCH_TIMEOUT);
    setTimeout(() => generateMongoData(port, 'users', 'user', 2000), MLAUNCH_TIMEOUT);
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
    }, MLAUNCH_TIMEOUT * 2);
  });

  after(function() {
    this.timeout(TIMEOUT);
    killMongoInstance(port);
    shell.removeAllListeners(events.OUTPUT);
    return connection.remove(connectionId);
  });

  it('test run in-complete statement', () => {
    shell.update(connectionId, {
      shellId,
      commands: 'db.user.find('
    });

    let incomplete = false;
    let expectedOutput = false;
    return new Promise(resolve => {
      shell.on(events.OUTPUT, msg => {
        console.log('test run in-complete statement: get output ', msg);
        if (msg.output && msg.output.includes('...') && !incomplete) {
          incomplete = true;
          setTimeout(() => {
            shell.update(connectionId, {
              shellId,
              commands: 'use admin'
            });
          }, 1000);
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
