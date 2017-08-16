/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T11:24:13+10:00
 */

const assert = require('assert');
const _ = require('lodash');
const {launchSingleInstance, killMongoInstance, generateMongoData} = require('test-utils');
const {
  connection,
  inspector,
  TIMEOUT,
  syncExecution,
  getRandomPort,
} = require('../commons');

const port = getRandomPort();

describe('single server inspector test', () => {
  before(function () {
    this.timeout(TIMEOUT * 3);
    launchSingleInstance(port);
    _.times(3, (i) => {
      const dbName = 'db' + i;
      _.times(3, (j) => {
        const colname = 'col' + j;
        generateMongoData(port, dbName, colname);
      });
    });
  });

  after(function () {
    this.timeout(TIMEOUT * 3);
    killMongoInstance(port);
  });

  it('test run inspect database on single server', () => {
    let connectionId;
    console.log('connect to controller');
    return new Promise((resolve, reject) => {
      connection
        .create(
          {},
          {
            query: {
              url: 'mongodb://localhost:' + port + '/db0',
            },
          },
        )
        .then((v) => {
          console.log('get connection response ', v);
          connectionId = v.id;
          return inspector.get(v.id);
        })
        .then((v) => {
          // check databases
          console.log('return check databases ', v);
          const dbs = v.result.filter((item) => {
            console.log('test items:', item);
            return item.text === 'Databases';
          });
          assert.equal(dbs[0].text, 'Databases');
          const inspectedDbs = (dbs[0].children = dbs[0].children.filter((db) => {
            console.log('@@@@ ', db);
            return db.text.indexOf('db') >= 0;
          }));
          return inspectedDbs;
        })
        .then((dbs) => {
          // check collections
          console.log('get dbs :', dbs);
          assert.equal(dbs.length, 3);
          dbs.map((db) => {
            assert.equal(db.children.length >= 3, true);
          });
          return connection.remove(connectionId);
        }).then(() => resolve())
        .catch((e) => {
          reject(e);
        });
    });
  }).timeout(TIMEOUT);

  it('test database and collection returned in order', () => {
    let id;
    return new Promise((resolve, reject) => {
      connection.create(
        {},
        {
          query: {
            url: 'mongodb://localhost:' + port + '/test1',
          },
        },
      ).then((v) => {
        id = v.id;
        return Promise.all([syncExecution.update(v.id, {
          shellId: v.shellId,
          commands: 'db.createCollection(\'aaaa\');',
          responseType: 'text',
        }),
          syncExecution.update(v.id, {
            shellId: v.shellId,
            commands: 'db.createCollection(\'bbbb\');',
            responseType: 'text',
          })
        ]);
      }).then((b) => {
        console.log('create collections ', b);
        return inspector.get(id);
      }).then((v) => {
        const dbs = v.result.filter((item) => {
          console.log('item.children = ', item);
          item.children = item.children.filter((child) => {
            return child.text.indexOf('db') === 0 || child.text === 'test1';
          });
          return item.text === 'Databases';
        });
        console.log('get dbs ', dbs);
        assert.equal(true, dbs[0].children.length == 4);
        assert.equal('db0', dbs[0].children[0].text);
        assert.equal('db1', dbs[0].children[1].text);
        assert.equal('db2', dbs[0].children[2].text);
        assert.equal('test1', dbs[0].children[3].text);
        const cls = dbs[0].children.filter((db) => {
          return db.text === 'test1';
        });
        console.log('get collections ', cls[0]);
        assert.equal(cls[0].children.length >= 2, true);
        assert.equal('aaaa', cls[0].children[0].text);
        assert.equal('bbbb', cls[0].children[1].text);
        resolve();
      }).catch((err) => {
        reject(err);
      });
    });
  }).timeout(TIMEOUT);
});
