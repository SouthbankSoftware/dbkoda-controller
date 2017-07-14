/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T11:29:29+10:00
 */

const assert = require('assert');
const app = require('../../../../src/app');

describe('mongo-reconnection service', () => {
  it('registered the mongo-reconnection service', () => {
    const connect = app.service('mongo-reconnection');
    assert.ok(connect);
  });
});
