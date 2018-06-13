/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-13T11:14:58+10:00
 */

const assert = require('assert');
const { launchSingleInstance, killMongoInstance } = require('test-utils');
const { connection, shell, TIMEOUT, getRandomPort, MLAUNCH_TIMEOUT } = require('../commons');
const os = require('os');

describe('test run shell command authentication', () => {
  const port = getRandomPort();
  before(function(done) {
    if (os.platform() === 'win32') {
      this.skip();
    } else {
      this.timeout(TIMEOUT * 3);
      launchSingleInstance(port, '--auth --username admin --password 123456 --auth-db admin');
      setTimeout(() => done(), MLAUNCH_TIMEOUT * 2);
    }
  });

  after(function() {
    this.timeout(TIMEOUT * 3);
    killMongoInstance(port);
  });

  it('test authorization connection with wrong credential disable test', () => {
    return connection
      .create(
        {},
        {
          query: {
            url: 'mongodb://localhost:' + port,
            authorization: true,
            test: false
          }
        }
      )
      .then(v => {
        assert.equal(true, false);
        connection.remove(v.id);
      })
      .catch(err => {
        assert.equal(err.codeName, 'Unauthorized');
      });
  });

  it('test authorization connection with wrong credential enable test', () => {
    return connection
      .create(
        {},
        {
          query: {
            url: 'mongodb://localhost:' + port,
            authorization: true,
            test: true
          }
        }
      )
      .then(() => {
        assert.fail();
      })
      .catch(err => {
        assert.equal(err.codeName, 'Unauthorized');
      });
  });

  it('test authorization connection with correct credential', () => {
    return connection
      .create(
        {},
        {
          query: {
            url: 'mongodb://admin:123456@localhost:' + port + '/admin',
            authorization: true,
            test: false
          }
        }
      )
      .then(response => {
        console.log('get response ', Object.keys(response));
        assert.equal(true, Object.keys(response).includes('id'));
      })
      .catch(err => {
        assert.fail(err);
      });
  });

  it('test connect multiple shell connection for one instance', () => {
    return connection
      .create(
        {},
        {
          query: {
            url: 'mongodb://admin:123456@localhost:' + port + '/test',
            authorization: true,
            test: false,
            database: 'admin'
          }
        }
      )
      .then(response => {
        console.log('get response ', Object.keys(response));
        assert.equal(true, Object.keys(response).includes('id'));
        return response;
      })
      .then(value => {
        shell
          .create({ id: value.id }, {})
          .then(value => {
            assert.equal(Object.keys(value).includes('shellId'), true);
          })
          .catch(err => {
            assert.fail(err);
          });
      })
      .catch(err => {
        assert.fail(err);
      });
  });
});
