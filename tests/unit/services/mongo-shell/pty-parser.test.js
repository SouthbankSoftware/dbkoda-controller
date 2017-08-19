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
    assert.equal(parser.buffers[0].data, '23');
  });

  it('test csi parser for K EL – Erase in Line', () => {
    const parser = new Parser();
    const escapeCode = String.fromCharCode(27, 91) + 'K';  // [K
    parser.buffers = [];
    parser.buffers.push(new Buffer('abc123'));
    parser.bufferX = 3;
    parser.parse(escapeCode);
    assert.equal(parser.bufferX, 3);
    assert.equal(parser.params.length, 1);
    assert.equal(parser.params[0], 0);
    assert.equal(parser.buffers[0].data, 'abc');
  });

  it('test parser for parsing normal string with enter at the last', () => {
    let parser = new Parser();
    parser.parse('MongoDB shell version v3.4.0\r\n');
    assert.equal(parser.buffers.length, 2);
    assert.equal(parser.buffers[0].data, 'MongoDB shell version v3.4.0');
    assert.equal(parser.buffers[1].data, '');

    parser = new Parser();
    parser.parse('connecting to: mongodb://localhost\r\n' +
      'MongoDB server version: 3.4.0\r\n' +
      'Server has startup warnings: \r\n' +
      '2017-08-15T23:34:04.190+0000 I STORAGE  [initandlisten] \r\n' +
      '2017-08-15T23:34:04.807+0000 I CONTROL  [initandlisten] \r\n' +
      '2017-08-15T23:34:04.807+0000 I CONTROL  [initandlisten] ** WARNING: Access control is not enabled for the database.\r\n' +
      '2017-08-15T23:34:04.807+0000 I CONTROL  [initandlisten] **          Read and write access to data and configuration is unrestricted.\r\n' +
      '2017-08-15T23:34:04.807+0000 I CONTROL  [initandlisten] \r\n' +
      'show dbs\r\n');
    assert.equal(parser.buffers.length, 10);
    assert.equal(parser.buffers[0].data, 'connecting to: mongodb://localhost');
    assert.equal(parser.buffers[8].data, 'show dbs');
    assert.equal(parser.buffers[9].data, '');
  });

  it('test parse FEEDLINE \n character', () => {
    const parser = new Parser();
    parser.parse('first line \n second line');
    assert.equal(parser.buffers.length, 2);
    assert.equal(parser.buffers[0].data, 'first line ');
    assert.equal(parser.buffers[1].data, ' second line');
  });

  it('test parse carriage return \r character', () => {
    const parser = new Parser();
    parser.parse('first line \r second line');
    assert.equal(parser.buffers.length, 1);
    assert.equal(parser.buffers[0].data, ' second line');
  });
});
