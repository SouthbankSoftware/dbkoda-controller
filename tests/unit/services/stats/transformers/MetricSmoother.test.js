/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-02-19T15:49:13+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-20T21:24:12+11:00
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

import _ from 'lodash';
import MetricSmoother from '~/services/stats/transformers/MetricSmoother';
import assert from 'assert';

const EXHALE_VALUE_PRECISION = 6;

describe('MetricSmoother', () => {
  let smoother;
  let values;

  before(() => {
    smoother = new MetricSmoother(3);
    values = [
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 1519015092892,
        value: {
          activeReadSample: 34,
          network_bytesInPs: 81.4,
          network_bytesOutPs: 4508.2,
          wtIO_logSyncLatencyMs: 67,
          wtIO_writeLatencyMs: 89,
          wtTransactions_readPct: 0.78125,
          wtTransactions_writePct: 7.33,
          db_storage: [
            { SampleCollections: { dataSize: 103080500 } },
            { admin: { dataSize: 834 } },
            { local: { dataSize: 64384 } },
            { test: { dataSize: 0 } }
          ]
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 1519015093892,
        value: {
          activeReadSample: 45,
          network_bytesInPs: 60.3,
          network_bytesOutPs: 4000.6,
          wtIO_logSyncLatencyMs: 89,
          wtIO_writeLatencyMs: 89,
          wtTransactions_readPct: 1,
          wtTransactions_writePct: 7.33,
          db_storage: [
            { SampleCollections: { dataSize: 103080600 } },
            { admin: { dataSize: 934 } },
            { local: { dataSize: 64384 } },
            { test: { dataSize: 100 } }
          ]
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 1519015094892,
        value: {
          activeReadSample: 46,
          network_bytesInPs: 54,
          network_bytesOutPs: 4000.6,
          wtIO_logSyncLatencyMs: 89,
          wtIO_writeLatencyMs: 89,
          wtTransactions_readPct: 1,
          wtTransactions_writePct: 7.33,
          db_storage: [
            { SampleCollections: { dataSize: 103040600 } },
            { admin: { dataSize: 934 } },
            { test: { new: 123, dataSize: null } }
          ]
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 1519015095892,
        value: {
          activeReadSample: 47,
          network_bytesInPs: 54,
          network_bytesOutPs: 4000.6,
          wtIO_logSyncLatencyMs: 89,
          wtIO_writeLatencyMs: 89,
          wtTransactions_readPct: 1,
          wtTransactions_writePct: 7.33,
          db_storage: [
            { SampleCollections: { dataSize: 103050600 } },
            { admin: { dataSize: 934 } },
            { test: { new: 124, dataSize: null } }
          ]
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 1519015096892,
        value: {
          activeReadSample: 48,
          network_bytesInPs: 54,
          network_bytesOutPs: 4000.6,
          wtIO_logSyncLatencyMs: 90,
          wtTransactions_readPct: 1,
          wtTransactions_writePct: 7.33,
          db_storage: [
            { SampleCollections: { dataSize: 103050600 } },
            { admin: { dataSize: Number.NaN } },
            { test: { new: 125, dataSize: null } }
          ]
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 1519015097892,
        value: {
          activeReadSample: 48,
          network_bytesInPs: 54,
          network_bytesOutPs: 4000.6,
          wtIO_logSyncLatencyMs: 91,
          wtTransactions_readPct: null,
          wtTransactions_writePct: 7.33,
          db_storage: [
            { SampleCollections: { dataSize: 103050600 } },
            { admin: { dataSize: 934 } },
            { test: { new: 125, dataSize: null } }
          ]
        }
      }
    ];
  });

  it('should be able to start with smoothing first value', () => {
    const [nextValue] = values;

    assert.deepEqual(smoother.transform(_.cloneDeep(nextValue)), nextValue);
  });

  it('should be able to process second value', () => {
    const [, nextValue] = values;
    const smoothedValue = smoother.transform(_.cloneDeep(nextValue));

    const _get = value => _.get(value, 'value.db_storage[0].SampleCollections.dataSize');

    assert.equal(
      _get(smoothedValue),
      _.round((_get(values[0]) + _get(values[1])) / 2),
      EXHALE_VALUE_PRECISION
    );
  });

  it('should be able to process third value', () => {
    const [, , nextValue] = values;
    const smoothedValue = smoother.transform(_.cloneDeep(nextValue));

    const _get = value => _.get(value, 'value.db_storage[0].SampleCollections.dataSize');

    assert.equal(
      _get(smoothedValue),
      _.round((_get(values[0]) + _get(values[1]) + _get(values[2])) / 3, EXHALE_VALUE_PRECISION)
    );
  });

  it('should be able to process fourth value and drop the first value', () => {
    const [, , , nextValue] = values;
    const smoothedValue = smoother.transform(_.cloneDeep(nextValue));

    const _get = value => _.get(value, 'value.db_storage[0].SampleCollections.dataSize');

    assert.equal(
      _get(smoothedValue),
      _.round((_get(values[1]) + _get(values[2]) + _get(values[3])) / 3, EXHALE_VALUE_PRECISION)
    );
  });

  it('can handle missing and NaN values by ignoring them from calculation but keeping their quorum in time window', () => {
    const [, , , , nextValue] = values;
    const smoothedValue = smoother.transform(_.cloneDeep(nextValue));

    assert.equal(smoothedValue.value.db_storage.length, 3);
    assert.equal(smoothedValue.value.db_storage[2].test.dataSize, null);
    assert.equal(smoothedValue.value.db_storage[2].test.new, 124);
    assert.equal(smoothedValue.value.db_storage[1].admin.dataSize, 934);
  });

  it('can dynamically resize smoothing window', () => {
    smoother.windowSize = 2;

    const [, , , , , nextValue] = values;
    const smoothedValue = smoother.transform(_.cloneDeep(nextValue));

    assert.equal(smoothedValue.value.wtIO_logSyncLatencyMs, 90.5);
    assert.equal(smoothedValue.value.wtIO_writeLatencyMs, null);
  });
});
