/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T13:23:33+10:00
 */

const assert = require('assert');
const request = require('request');
const app = require('../../src/app');

describe('dbCoda Controller tests', () => {
  before(function(done) {
    this.server = app.listen(3031);
    this.server.once('listening', () => done());
  });

  after(function(done) {
    this.server.close(done);
  });

  it('shows a 404 HTML page', (done) => {
    request(
      {
        url: 'http://localhost:3031/path/to/nowhere',
        headers: {
          Accept: 'text/html',
        },
      },
      (err, res, body) => {
        assert.equal(res.statusCode, 404);
        assert.ok(body.indexOf('<html>') !== -1);
        done(err);
      },
    );
  });

  it('shows a 404 JSON error without stack trace', (done) => {
    request(
      {
        url: 'http://localhost:3031/path/to/nowhere',
        json: true,
      },
      (err, res, body) => {
        assert.equal(res.statusCode, 404);
        assert.equal(body.code, 404);
        assert.equal(body.message, 'Page not found');
        assert.equal(body.name, 'NotFound');
        done(err);
      },
    );
  });
});
