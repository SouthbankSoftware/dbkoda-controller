/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-24T11:03:10+11:00
 *
 * dbKoda - a modern, open source code editor, for MongoDB.
 * Copyright (C) 2017-2018 Southbank Software
 *
 * This file is part of dbKoda.
 *
 * dbKoda is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * dbKoda is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with dbKoda.  If not, see <http://www.gnu.org/licenses/>.
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
