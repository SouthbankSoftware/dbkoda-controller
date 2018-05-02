const assert = require('assert');
const {
  aggregateResult,
  iterateProperty
} = require('../../../../src/controllers/profiling/profiling-controller');

describe('test profile', () => {
  it('test parse find query result', () => {
    const query = [
      {
        op: 'query',
        ns: 'test.test',
        query: {
          find: 'test',
          filter: {
            a: 10
          },
          limit: 10,
          singleBatch: false,
          sort: {
            a: -1
          },
          projection: {
            _id: 0
          }
        },
        millis: 10
      },
      {
        op: 'query',
        ns: 'test.test',
        query: {
          find: 'test',
          filter: {
            a: 10
          },
          limit: 13,
          singleBatch: false,
          sort: {
            a: -1
          },
          projection: {
            _id: 0
          }
        },
        millis: 10
      },
      {
        op: 'query',
        ns: 'admin.test',
        query: {
          find: 'test',
          filter: {
            a: 10
          },
          limit: 10,
          singleBatch: false,
          sort: {
            a: -1
          },
          projection: {
            _id: 0
          }
        },
        millis: 223
      },
      {
        op: 'query',
        ns: 'admin.test',
        query: {
          find: 'test',
          filter: {
            a: 20,
            b: 10
          },
          limit: 1320,
          singleBatch: false,
          sort: {
            a: -1
          },
          projection: {
            _id: 0
          }
        },
        millis: 1320
      },
      {
        op: 'insert',
        ns: 'test.test',
        query: {
          insert: 'test',
          documents: [
            {
              _id: '5acc09e6910479d8bf5c05be'
            }
          ],
          ordered: true
        },
        millis: 3884
      }
    ];
    const result1 = aggregateResult(query, { limit: 20 });
    const keys = Object.keys(result1);
    assert.equal(keys.length, 4);
    assert.equal(result1[keys[3]].count, 2);
    assert.equal(result1[keys[3]].millis, 20);
    assert.equal(result1[keys[2]].count, 1);
    assert.equal(result1[keys[2]].millis, 223);
    assert.equal(result1[keys[1]].count, 1);
    assert.equal(result1[keys[1]].millis, 1320);
    assert.equal(result1[keys[0]].count, 1);
    assert.equal(result1[keys[0]].millis, 3884);
  });

  it('test iterateProperty', () => {
    const query = {
      find: 'test',
      filter: {
        a: 10
      },
      limit: 10,
      singleBatch: false,
      sort: {
        a: -1
      },
      projection: {
        _id: 0
      }
    };
    const stacks = iterateProperty(query, 'query', []);
    assert.equal(stacks.length, 6);
    const expected = [
      'query.find',
      'query.filter.a',
      'query.limit',
      'query.singleBatch',
      'query.sort.a',
      'query.projection._id'
    ];
    assert.deepEqual(stacks, expected);
  });
});
