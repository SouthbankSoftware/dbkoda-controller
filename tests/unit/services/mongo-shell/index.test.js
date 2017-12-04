/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-24T01:42:57+11:00
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
const app = require('../../../../src/app');
const {MongoShell} = require('../../../../src/controllers/mongo-shell');

describe('mongo-shell service', () => {
  it('registered the mongo-shells service', () => {
    assert.ok(app.service('mongo-shells'));
  });

  it('test replace password from mongo url', () => {
    const shell = new MongoShell({}, '.');

    let output = shell.filterOutput('connecting to: mongodb://aaaa:bbbb@localhost');
    assert.equal(output.indexOf('bbbb') === -1, true);

    output = shell.filterOutput('connecting to: mongodb://localhost:27017');
    assert.equal(output, 'connecting to: mongodb://localhost:27017');

    output = shell.filterOutput('connecting to: mongodb://aaaa:bbbb@localhost:27017');
    assert.equal(output.indexOf('bbbb') === -1, true);
  });

  it('test create mongo shell parameter with user name and password', () => {
    const connectionObject = { username: 'user1',
      password: '123456',
      database: 'admin',
      url: 'mongodb://xxxxxxxxxxx.ap-southeast-2.compute.amazonaws.com/admin',
      ssl: '',
      test: false,
      authorization: true,
      id: '4f7e0f30-44cf-11e7-8744-f3f4a4c6e36a',
      shellId: '4f7e0f31-44cf-11e7-8744-f3f4a4c6e36a',
      hosts: 'xxxxxxxxxxx.ap-southeast-2.compute.amazonaws.com:27017',
      options: undefined };
    const shell = new MongoShell(connectionObject, '.');
    const parameters = shell.createMongoShellParameters();
    assert.equal(parameters.length, 5);
    assert.equal(parameters[0], connectionObject.url);
    assert.equal(parameters[1], '--username');
    assert.equal(parameters[2], connectionObject.username);
    assert.equal(parameters[3], '--password');
    assert.equal(parameters[4], connectionObject.password);
  });

  it('test create mongo shell parameter without user name and password', () => {
    const connectionObject = {
      database: 'test',
      url: 'mongodb://xxxxxxxxxxx.ap-southeast-2.compute.amazonaws.com/admin',
      ssl: '',
      test: false,
      authorization: true,
      id: '4f7e0f30-44cf-11e7-8744-f3f4a4c6e36a',
      shellId: '4f7e0f31-44cf-11e7-8744-f3f4a4c6e36a',
      hosts: 'xxxxxxxxxxx.ap-southeast-2.compute.amazonaws.com:27017',
      options: undefined };
    const shell = new MongoShell(connectionObject, '.');
    const parameters = shell.createMongoShellParameters();
    assert.equal(parameters.length, 1);
    assert.equal(parameters[0], connectionObject.url);
  });
});
