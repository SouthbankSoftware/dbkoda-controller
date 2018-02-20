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
 * Created by joey on 9/2/18.
 */

const {parseDataByRules, parseAllKeys} = require('../../../../../../src/services/stats/knowledgeBase/driver/rule_parser');


const assert = require('assert');
const {rules1} = require('./mongo_rules_def');
const {replica34Stats} = require('./mongo_driver_stats');

describe('test driver knowledgebase', () => {
  it('test parse all keys', () => {
    const keys = parseAllKeys(rules1);
    assert.equal(keys.length, 6);
    assert.equal(keys[5], 'networkLoad');
  });

  it('test parse replica stats with rule1', () => {
    let values = parseDataByRules(rules1, replica34Stats, '3.4');
    assert.equal(values.activeRead, 30);
    assert.equal(values.bytesIn, undefined);
    assert.equal(values.networkLoad, 0);
    assert.equal(values.writeOpsRate, undefined);

    values = parseDataByRules(rules1, replica34Stats, '3.4', replica34Stats, 5000);
    assert.equal(values.activeRead, 30);
    assert.equal(values.bytesIn, 0);
    assert.equal(values.networkLoad, 0);
    assert.equal(values.writeOpsRate, 0);
    assert.equal(values.writeLatency, 0);
  });
});
