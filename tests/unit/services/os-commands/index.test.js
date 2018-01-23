/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-08-30T14:10:42+10:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-01-17T16:45:37+11:00
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

import assert from 'assert';
import tokeniseCmdString from '~/controllers/os-commands/tokeniseCmdString';

describe('mongo-command test suite', () => {
  it('can properly tokenise command string', () => {
    const input =
      '  mongodump --host "10.211.55.2" --port "27017" --db "SampleCollections" -u "test" -p "^&&&<>\';| \\"test\\"" --collection "Sakila_customers" --authenticationDatabase "admin" --numParallelCollections "4" -o "/Users/guiguan/Downloads/dump"  ';
    const output = tokeniseCmdString(input);

    assert.deepEqual(output, [
      'mongodump',
      '--host',
      '10.211.55.2',
      '--port',
      '27017',
      '--db',
      'SampleCollections',
      '-u',
      'test',
      '-p',
      '^&&&<>\';| "test"',
      '--collection',
      'Sakila_customers',
      '--authenticationDatabase',
      'admin',
      '--numParallelCollections',
      '4',
      '-o',
      '/Users/guiguan/Downloads/dump',
    ]);
  });
});
