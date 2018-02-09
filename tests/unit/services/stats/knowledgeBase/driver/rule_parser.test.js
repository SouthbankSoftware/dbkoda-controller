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
 * Created by joey on 6/2/18.
 */
const {checkVersion, getDataFromSourcePath, parseCalculations, parseSingleStatDefValue, parseDataByRules, findAllVars} = require('../../../../../../src/services/stats/knowledgeBase/driver/rule_parser');


const assert = require('assert');

describe('test driver rules parser', () => {
  it('test version match', () => {
    assert.equal(checkVersion('3.2.0', '3.2.*'), true);
    assert.equal(checkVersion('3.1.0', '3.2.*'), false);
    assert.equal(checkVersion('3.2.0', '3.2'), false);
    assert.equal(checkVersion('3.2', '3.2.*'), true);
  });

  it('test getDataFromSourcePath', () => {
    const stats = {
      'opLatencies': {
        'reads': {
          'latency': 0,
          'ops': 0
        },
        'writes': {
          'latency': 0,
          'ops': 0
        },
        'commands': {
          'latency': 4032,
          'ops': 15
        }
      }
    };
    let value = getDataFromSourcePath(stats, 'opLatencies.reads.ops');
    assert.equal(value, 0);

    value = getDataFromSourcePath(stats, 'opLatencies.commands.ops');
    assert.equal(value, 15);

    value = getDataFromSourcePath(stats, 'opLatencies.commands');
    assert.equal(value.latency, 4032);

    value = getDataFromSourcePath(stats, 'opLatencies.invalid');
    assert.equal(value, undefined);

    value = getDataFromSourcePath(stats, undefined);
    assert.equal(value, undefined);
  });

  it('test parseSingleStatDefValue', () => {
    const rules = [
      {
        'name': 'writeOpsRate',
        'type': 'rate',
        'defaultSource': 'opLatencies.writes.ops'
      },
      {
        'name': 'writeOpsRate',
        'type': 'rate',
        'versions': [{
          'versionMask': '3.2.*',
          'source': 'globalLock.active.readers'
        }, {
          'versionMask': '3.3.*',
          'source': 'globalLock.active.writers'
        }]
      }
    ];
    let value = parseSingleStatDefValue({opLatencies: {writes: {ops: 99}}}, rules[0]);
    assert.equal(value, 99);

    value = parseSingleStatDefValue({globalLock: {active: {readers: 77}}}, rules[1], '3.2.2');
    assert.equal(value, 77);

    value = parseSingleStatDefValue({globalLock: {active: {writers: 77}}}, rules[1], '3.3');
    assert.equal(value, 77);
  });

  it('test parse data for simple value', () => {
    const rules = {
      'statisticDefinitions': [{
        'name': 'activeRead',
        'type': 'final',
        'defaultSource': 'globalLock.activeClients.readers',
        'versions': [{
          'versionMask': '3.2.*',
          'source': 'globalLock.active.readers'
        }]
      },
        {
          'name': 'writeOpsRate',
          'type': 'rate',
          'defaultSource': 'opLatencies.writes.ops'
        },
        {
          'name': 'writeLatencyRate',
          'type': 'rate',
          'defaultSource': 'opLatencies.writes.latency'
        }
      ]
    };
    const values = parseDataByRules(rules, {
      globalLock: {active: {readers: 100}},
      opLatencies: {writes: {ops: 324, latency: 99}}
    }, '3.2.2', {globalLock: {active: {readers: 23}}, opLatencies: {writes: {ops: 88, latency: 2}}});
    assert.equal(values.activeRead, 100);
    assert.equal(values.writeLatencyRate, 97);
    assert.equal(values.writeOpsRate, 236);
  });

  it('test findAllVars', () => {
    let vars = findAllVars('a + b');
    assert.equal(vars.length, 2);
    assert.equal(vars[0], 'a');
    assert.equal(vars[1], 'b');

    vars = findAllVars('a + b * c / d');
    assert.equal(vars.length, 4);
    assert.equal(vars[0], 'a');
    assert.equal(vars[1], 'b');
    assert.equal(vars[2], 'c');
    assert.equal(vars[3], 'd');
  });

  it('test parseCalculations', () => {
    const value = parseCalculations([{
      'name': 'writeLatency',
      'expression': 'writeLatencyRate/writeOpsRate',
    }], {writeLatencyRate: 10, writeOpsRate: 2});
    assert.equal(value.writeLatency, 5);
  });

  it('test parse urles', () => {
    const rules = {
      'statisticDefinitions': [
        {
          'name': 'activeRead',
          'type': 'final',
          'defaultSource': 'globalLock.activeClients.readers',
          'versions': [
            {
              'versionMask': '3.2.*',
              'source': 'globalLock.active.readers'
            }
          ]
        },
        {
          'name': 'writeOpsRate',
          'type': 'rate',
          'defaultSource': 'opLatencies.writes.ops'
        },
        {
          'name': 'writeLatencyRate',
          'type': 'rate',
          'defaultSource': 'opLatencies.writes.latency'
        }
      ],
      'calculations': [
        {
          'name': 'writeLatency',
          'expression': 'writeLatencyRate/writeOpsRate',
          'ifZeroDivide': 0
        },
        {
          'name': 'networkLoad',
          'expression': 'writeOpsRate'
        }
      ]
    };
    let values = parseDataByRules(rules, {}, '3.2.2', {});
    assert.equal(values.activeRead, undefined);

    const stats = {
      globalLock: {
        activeClients: {readers: 10},
        active: {
          readers: 1
        }
      },
      opLatencies: {writes: {ops: 33, latency: 44}},
    };

    const prevStats = {
      globalLock: {
        activeClients: {readers: 10},
        active: {
          readers: 1
        }
      },
      opLatencies: {writes: {ops: 33, latency: 44}},
    };
    values = parseDataByRules(rules, stats,
      '3.2.2',
      {}
    );
    assert.equal(values.activeRead, 1);
    assert.equal(values.writeLatencyRate, 44);
    assert.equal(values.writeOpsRate, 33);
    assert.equal(values.networkLoad, 33);
    assert.equal(parseFloat(values.writeLatency, 10).toFixed(2), 1.33);

    values = parseDataByRules(rules, stats,
      '3.4',
      {}
    );
    assert.equal(values.activeRead, 10);
    assert.equal(values.writeLatencyRate, 44);
    assert.equal(values.writeOpsRate, 33);
    assert.equal(values.networkLoad, 33);
    assert.equal(parseFloat(values.writeLatency, 10).toFixed(2), 1.33);

    values = parseDataByRules(rules, stats,
      '3.4',
      prevStats
    );
    assert.equal(values.activeRead, 10);
    assert.equal(values.writeLatencyRate, 0);
    assert.equal(values.writeOpsRate, 0);
    assert.equal(values.networkLoad, 0);
    assert.equal(parseFloat(values.writeLatency, 10).toFixed(2), 0);
  });
});

