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
 * Created by joey on 18/12/17.
 */

const findRules = require('../../../../../../src/services/stats/knowledgeBase/ssh').findRules;
const assert = require('assert');

describe('test knowledge base rules', () => {
  it('test loading kb rules', () => {
    const rules = {
      'linux': [{
        os: 'linux',
        release: 'ubuntu',
        version: '14.0'
      }]
    };
    let matched = findRules({osType: 'linux', release: 'ubuntu', version: '14.0'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'ubuntu');
    assert.equal(matched.version, '14.0');

    matched = findRules({osType: 'linux', release: 'ubuntu', version: '14'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'ubuntu');
    assert.equal(matched.version, '14.0');

    matched = findRules({osType: 'linux', release: 'ubuntu'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'ubuntu');
    assert.equal(matched.version, '14.0');
  });

  it('test loading db default rules', () => {
    const rules = {
      'linux': [{
        os: 'linux',
        release: 'all',
      }, {
        os: 'linux',
        release: 'ubuntu',
        version: '14.0'
      }]
    };
    let matched = findRules({osType: 'linux', release: 'ubuntu', version: '14.0'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'ubuntu');
    assert.equal(matched.version, '14.0');

    matched = findRules({osType: 'linux'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'all');
    assert.equal(matched.version, undefined);
  });

  it('test loading linux rules', () => {
    const rules = {
      'linux': [{
        os: 'linux',
        release: 'all',
      }, {
        os: 'linux',
        release: 'ubuntu',
        version: '14.0'
      }, {
        os: 'linux',
        release: 'centos',
      }, {
        os: 'linux',
        release: 'Red Hat Enterprise Linux Server',
      }]
    };
    let matched = findRules({osType: 'linux', release: 'ubuntu', version: '14.0'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'ubuntu');
    assert.equal(matched.version, '14.0');

    matched = findRules({osType: 'linux', release: 'centos'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'centos');
    assert.equal(matched.version, undefined);

    matched = findRules({osType: 'linux', release: 'Red Hat'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'Red Hat Enterprise Linux Server');
    assert.equal(matched.version, undefined);
  });

  it('test find rules based on various versions', () => {
    const rules = {
      'linux': [{
        os: 'linux',
        release: 'all',
      }, {
        os: 'linux',
        release: 'ubuntu',
        version: '14.0'
      }, {
        os: 'linux',
        release: 'ubuntu',
        version: 'all'
      }, {
        os: 'linux',
        release: 'ubuntu',
        version: '16.0.1'
      }]
    };
    let matched = findRules({osType: 'linux', release: 'ubuntu', version: '14.0'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'ubuntu');
    assert.equal(matched.version, '14.0');

    matched = findRules({osType: 'linux', release: 'ubuntu', version: '12.0'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'ubuntu');
    assert.equal(matched.version, 'all');

    matched = findRules({osType: 'linux', release: 'ubuntu', version: '16.0.1'}, rules);
    assert.equal(matched.os, 'linux');
    assert.equal(matched.release, 'ubuntu');
    assert.equal(matched.version, '16.0.1');
  });
});
