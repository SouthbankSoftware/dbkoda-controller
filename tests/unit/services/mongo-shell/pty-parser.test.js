/*
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
/**
 * Created by joey on 14/8/17.
 */


const assert = require('assert');
const Parser = require('../../../../src/controllers/mongo-shell/pty-parser');
const Buffer = require('../../../../src/controllers/mongo-shell/buffer');

describe('test pty parser', () => {
  it('test csi parser for G Moves the cursor to column n', () => {
    const parser = new Parser();
    const escapeCode = String.fromCharCode(27, 91) + '3G';  // [3G
    parser.parse(escapeCode);
    assert.equal(parser.bufferX, 2);
    assert.equal(parser.params.length, 1);
    assert.equal(parser.params[0], 3);
  });

  it('test csi parser for J Clears part of the screen. ', () => {
    const parser = new Parser();
    let escapeCode = String.fromCharCode(27, 91) + 'J';  // [J
    parser.buffers = [];
    parser.buffers.push(new Buffer('abc123'));
    parser.bufferX = 3;
    parser.parse(escapeCode);
    assert.equal(parser.bufferX, 3);
    assert.equal(parser.params.length, 1);
    assert.equal(parser.params[0], 0);
    assert.equal(parser.buffers[0].data, 'abc');

    escapeCode = String.fromCharCode(27, 91) + '1J';  // [1J
    parser.buffers = [];
    parser.buffers.push(new Buffer('abc123'));
    parser.bufferX = 3;
    parser.parse(escapeCode);
    assert.equal(parser.bufferX, 3);
    assert.equal(parser.params.length, 1);
    assert.equal(parser.params[0], 1);
    assert.equal(parser.buffers[0].data, '123');
  });
});
