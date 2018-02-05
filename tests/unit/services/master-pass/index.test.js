const assert = require('assert');
const app = require('../../../../src/app');

describe('master-pass service', () => {
  it('registered the master-pass service', () => {
    const connect = app.service('master-pass');
    assert.ok(connect);
  });
});
