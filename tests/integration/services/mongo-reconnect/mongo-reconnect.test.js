/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T11:24:40+10:00
 */

const assert = require('assert');
const {
  launchSingleInstance,
  killMongoInstance,
} = require('test-utils');

const {
  connection,
  TIMEOUT,
  getRandomPort,
} = require('../commons');

describe('integration test mongo-reconnection', () => {
  const port1 = getRandomPort();

  before(function() {
    this.timeout(TIMEOUT * 3);

    launchSingleInstance(port1);
  });

  after(function() {
    this.timeout(TIMEOUT * 3);
    killMongoInstance(port1);
  });

  it('connect to a mongo instance with id and shellid', () => {
    const connect = connection;
    return connect
      .create(
        {},
        {
          query: {
            url: 'mongodb://localhost:' + port1 + '/test',
            id: 100,
            shellId: 101,
          },
        },
      )
      .then((res) => {
        assert.equal('100', res.id);
        assert.equal('101', res.shellId);
        connection.remove(res.id);
      });
  }).timeout(10000);
});
