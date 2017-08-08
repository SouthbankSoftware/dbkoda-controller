/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T11:22:46+10:00
 */

const assert = require('assert');
const winston = require('winston');
const {
  launchSingleInstance,
  killMongoInstance,
} = require('../../../../src/index');

const {
  connection,
  TIMEOUT,
  getRandomPort,
} = require('../commons');

describe('integration test mongo-connection', () => {
  const port1 = getRandomPort();
  const port2 = getRandomPort();

  before(function () {
    this.timeout(TIMEOUT * 3);

    launchSingleInstance(port1);
    launchSingleInstance(port2, ' --auth --username admin --password 123456 --auth-db admin');
  });

  after(function () {
    this.timeout(TIMEOUT * 3);
    killMongoInstance(port1);
    killMongoInstance(port2);
  });

  it('connect to invalid single mongo instance', (done) => {
    const connect = connection;
    connect
      .create(
        {},
        {
          query: {
            url: 'mongodb://XXXXXX',
          },
        }
      )
      .catch((e) => {
        console.log('got error ', e.message);
        assert(e !== undefined);
        done();
      });
  }).timeout(TIMEOUT);

  it('connect to a default mongo single instance ', () => {
    const connect = connection;
    const res = connect.create(
      {},
      {
        query: {
          url: 'mongodb://localhost:' + port1,
        },
      }
    );
    return res.then((v) => {
      assert.equal(v.id !== undefined, true);
      assert.equal(v.shellId !== undefined, true);
      assert.equal(v.dbVersion !== undefined, true);
      assert.equal(v.shellVersion !== undefined, true);
      connect.remove(v.id).then((value) => {
        assert.equal(value.id, v.id);
        assert.equal(value.shellIds.length, 1);
      });
    });
  });
  it('connect to a mongo single instance with admin db', () => {
    const connect = connection;
    const res = connect.create(
      {},
      {
        query: {
          url: 'mongodb://localhost:' + port1 + '/admin',
        },
      },
    );
    return res.then((v) => {
      assert.equal(v.id !== undefined, true);
      assert.equal(v.shellId !== undefined, true);
      connection.remove(v.id);
    });
  });
  it('connect to a mongo single instance with credential', () => {
    const connect = connection;

    const res = connect.create(
      {},
      {
        query: {
          url: 'mongodb://admin:123456@localhost:' + port2 + '/admin',
        },
      },
    );
    return res.then((v) => {
      assert.equal(v.id !== undefined, true);
      assert.equal(v.shellId !== undefined, true);
      assert.equal(v.output !== undefined, true);
      return connect.remove(v.id);
    })
      .catch((err) => {
      winston.error('get error:', err);
    });
  });
  it('test connect to a mongo single instance with credential', () => {
    const connect = connection;

    const res = connect.create(
      {},
      {
        query: {
          url: 'mongodb://admin:123456@localhost:' + port2 + '/admin',
          test: true,
        },
      },
    );
    return res.then((v) => {
      assert.equal(v.id !== undefined, true);
      return connect.remove(v.id);
    });
  });
  it('connect to a mongo single instance with wrong credential', () => {
    const connect = connection;
    const res = connect.create(
      {},
      {
        query: {
          url: 'mongodb://localhost:' + port2 + '/admin',
        },
      },
    );
    return res.then((_v) => {
    }).catch((e) => {
      assert.notEqual(e, undefined);
    });
  });
  it('test connect to a mongo single instance with wrong credential', () => {
    const res = connection.create(
      {},
      {
        query: {
          url: 'mongodb://localhost:' + port2 + '/admin',
          test: true,
        },
      },
    );
    return res
      .then((v) => {
        assert.equal(v.success, true);
        connection.remove(v.id);
      })
      .catch((e) => {
        assert.notEqual(e, undefined);
      });
  });

  it('test get output message for initial connection', () => {
    return connection.create(
      {},
      {
        query: {
          url: 'mongodb://localhost:' + port1 + '/admin',
          test: false,
        },
      },
    ).then((v) => {
      console.log('connect response:', v);
      assert.equal(v.output !== undefined, true, 'there is no output in response object.');
      assert.equal(v.output.length > 0, true, 'the output has 0 length.');
      connection.remove(v.id);
    });
  });
});
