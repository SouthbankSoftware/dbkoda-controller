const assert = require('assert');
const _ = require('lodash');
const { launchReplicaSet, killMongoInstance } = require('test-utils');
const { connection, inspector, TIMEOUT, getRandomPort, MLAUNCH_TIMEOUT } = require('../commons');

const port = getRandomPort();

describe.skip('replica server inspector test', () => {
  // skipping this test due to an exception in mongodb driver 3.1.3
  before(function(done) {
    this.timeout(TIMEOUT * 3);
    launchReplicaSet(port, 3, ' --arbiter --name replset');
    setTimeout(() => done(), MLAUNCH_TIMEOUT * 2);
  });

  after(function() {
    this.timeout(TIMEOUT * 3);
    killMongoInstance(port);
  });

  it('test run inspect database on replicas', () => {
    return new Promise(resolve => {
      const url = `mongodb://localhost:${port},localhost:${port + 1},localhost:${port +
        2}/test?replicaSet=replset`;
      console.log(url);
      let connectionId;
      connection
        .create(
          {},
          {
            query: {
              url
            }
          }
        )
        .then(v => {
          connectionId = v.id;
          return inspector.get(v.id);
        })
        .then(v => {
          console.log('output:', v);
          assert.equal(v.profileId, connectionId);
          const replica = _.filter(v.result, r => r.text === 'Replica Set');
          console.log('replica:', replica);
          assert.equal(replica[0].children.length, 4);
          return connection.remove(connectionId);
        })
        .then(() => resolve())
        .catch(err => resolve(err));
    });
  }).timeout(TIMEOUT);
});
