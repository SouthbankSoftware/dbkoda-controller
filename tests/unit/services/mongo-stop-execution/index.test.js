/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T09:36:13+10:00
 */

const assert = require('assert');
const app = require('../../../../src/app');

describe('mongo-stop-execution service', () => {
  it('registered the mongo-stop-execution service', () => {
    assert.ok(app.service('mongo-stop-execution'));
  });
});
