/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T13:11:42+10:00
 */
const assert = require('assert');
const os = require('os');
const {launchSingleInstance, killMongoInstance} = require('test-utils');
const {
  connection,
  autoComplete,
  TIMEOUT,
  shell,
  getRandomPort,
  MLAUNCH_TIMEOUT
} = require('../commons');

let id;
let shellId;

describe('test run auto complete command', () => {
  const port = getRandomPort();

  const createConnect = (done) => {
    connection
      .create(
        {},
        {
          query: {
            url: 'mongodb://localhost:' + port,
            authorization: true,
            test: false,
          },
        },
      )
      .then((response) => {
        id = response.id;
        shellId = response.shellId;
        done();
      });
  };

  before(function (done) {
    if (os.platform() === 'win32') {
      done();
    } else {
      this.timeout(TIMEOUT);
      launchSingleInstance(port);
      setTimeout(() => createConnect(done), MLAUNCH_TIMEOUT);
    }
  });

  after(function () {
    this.timeout(TIMEOUT);
    killMongoInstance(port);
    return connection.remove(id);
  });

  it('send command for auto complete response', () => {
    if (os.platform() !== 'win32') {
      return autoComplete.get(id, {
        query: {shellId, command: 'db'},
      }).then((response) => {
        console.log('get output ', response);
        assert.equal(response.length > 2, true);
        return autoComplete.get(id, {query: {shellId, command: 'db.'}});
      }).then((response) => {
        assert.equal(response.length > 50, true);
        return shell.update(id, {shellId, commands: 'var asdfghxxxx=100;'});
      }).then((_response) => {
        // test user defined variable
        return autoComplete.get(id, {query: {shellId, command: 'asdfg'}});
      }).then((response) => {
        assert.equal(response.length, 1);
        assert.equal(response[0].indexOf('asdfghxxxx') >= 0, true);
        return autoComplete.get(id, {query: {shellId, command: 'dbc'}});
      }).then((response) => {
        assert.equal(response.length > 0, true);
      }).catch((err) => {
        console.log('err:', err);
        // assert.fail(err);
      });
    }
  }).timeout(TIMEOUT);
});
