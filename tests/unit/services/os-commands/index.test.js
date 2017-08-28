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
 * Created by joey on 28/8/17.
 */

const assert = require('assert');

const {findCommandParameters} = require('../../../../src/controllers/os-commands');

describe('mongo-command test suite', () => {
  it('test mongo commands argument parser', () => {
    const params = findCommandParameters('mongodump --host localhost --port 27017 --db agg --collection   products --numParallelCollections 4 -o "/Users/joey/Downloads/test db/dump" ');
    assert.equal(params.length, 13);
    assert.equal(params[0], 'mongodump');
    assert.equal(params[12], '/Users/joey/Downloads/test db/dump');
  });
});
