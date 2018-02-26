/**
 * @flow
 *
 * @Author: Guy Harrison <gharriso>
 * @Date:   2018-02-20T14:01:28+11:00
 * @Email:  guy@southbanksoftware.com
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-21T11:43:06+11:00
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

import type {
    ObservaleValue
} from '../observables/ObservableWrapper';

import Transformer from './Transformer';

const sprintf = require('sprintf-js').sprintf; //eslint-disable-line



/**
 * Detect anomalies and raise alarms
 *
 * @gharriso you can hot-reloading the corresponding unit test as:
 *
 *    yarn test:unit --grep Alarm --watch
 */

// TODO: THis goes in config one day

const simpleThresholds = [{
        metric: 'query_scanToDocRatio',
        l1: 0,
        l2: 20,
        'alarmPath': 'alarm.mongo.scanToDocRatio',
        warningMessage: '%d documents scanned for every document returned: review Indexes and slow queries',
        notes: 'large scans - enronloop.js for instance will cause this alarm'
    },
    {
        metric: 'connections_inusePct',
        l1: 0,
        l2: 90,
        'alarmPath': 'alarm.mongo.connectionsInUse',
        warningMessage: '%d%% of connections are in use',
        notes: 'use makeconnections to cause this alarm'
    },
    {
        metric: 'queue_queuedPct',
        l1: 0,
        l2: 90,
        'alarmPath': 'alarm.mongo.queue_queuedPct',
        warningMessage: '%d%% of read write operations are queued. Possible lock contention',
        notes: 'inccounter.sh with 500+ connections may cause this alarm'
    },
    {
        metric: 'wtTransactions_readPct',
        l1: 0,
        l2: 90,
        'alarmPath': 'alarm.wiredtiger.wtTransactions_readPct',
        warningMessage: '%d%% of wiredTiger read transaction tickets are in use. ',
        notes: 'inccounter.sh with 500+ connections may cause this alarm.  Also you can reduce the number of tickets with wiredTigerConcurrentReadTransactions'
    },
    {
        metric: 'wtTransactions_writePct',
        l1: 0,
        l2: 90,
        'alarmPath': 'alarm.wiredtiger.wtTransactions_writePct',
        warningMessage: '%d%% of wiredTiger write transaction tickets are in use. ',
        notes: 'inccounter.sh with 500+ connections may cause this alarm.  Also you can reduce the number of tickets with wiredTigerConcurrentWriteTransactions'
    },
    {
        metric: 'wtIO_logSyncLatencyUs',
        l1: 1000,
        l2: 10000,
        'alarmPath': 'alarm.disk.wtIO_logSyncLatencyUs',
        warningMessage: 'wiredTiger log (sync) writes are taking %d microseconds on average. Consider tuning disk layout/type',
        notes: 'This alarm should fire under moderate load on our underpowered system'
    },
    {
        metric: 'wtIO_writeLatencyUs',
        l1: 1000,
        l2: 10000,
        'alarmPath': 'alarm.disk.wtIO_writeLatencyUs',
        warningMessage: 'wiredTiger disk writes are taking %d microseconds on average. Consider tuning disk layout/type',
        notes: 'This alarm should fire under moderate load on our underpowered system'
    },
    {
        metric: 'wtIO_readLatencyUs',
        l1: 1000,
        l2: 10000,
        'alarmPath': 'alarm.disk.wtIO_readLatencyUs',
        warningMessage: 'wiredTiger disk reads are taking %d microseconds on average. Consider tuning disk layout/type',
        notes: 'This alarm should fire under moderate load on our underpowered system'
    },
    {
        metric: 'wtCache_MissPct',
        l1: 5,
        l2: 80,
        'alarmPath': 'alarm.wiredtiger.wtCache_MissPct',
        warningMessage: 'Required data is not found in wiredTiger cache in %d%% of requests. Consider increasing cache size',
        notes: 'This alarm should fire under moderate load providing you reduce the wiredTiger cache size'
    }
];

const standardDeviationThresholds = {
    minimumSamples: 3,
    thresholds: [{
        metric: 'connections_current',
        l1: 1,
        l2: 3,
        'alarmPath': 'alarm.mongo.connections_current',
        warningMessage: 'You have an unusually high number of connections (mean=%.2f,sd=%.2f, current=%d)',
        notes: 'Use node makeconnections.js to fire'
    },
    {
        metric: 'latency_readWaitUsPs',
        l1: 1,
        l2: 3,
        'alarmPath': 'alarm.mongo.connections_current',
        warningMessage: 'Connections are spending an unusually large amount of time waiting for reads (mean=%.2f,sd=%.2f, current=%d)',
        notes: 'randCrud.js, randQry.js enronloop2.js'
    },
    {
        metric: 'latency_writeWaitUsPs',
        l1: 1,
        l2: 3,
        'alarmPath': 'alarm.mongo.connections_current',
        warningMessage: 'Connections are spending an unusually large amount of time waiting for writes (mean=%.2f,sd=%.2f, current=%d)',
        notes: 'randCrud.js, randQry.js enronloop2.js'
    },
    {
        metric: 'wtCache_evictionsPs',
        l1: 1,
        l2: 3,
        'alarmPath': 'alarm.wiredtiger.wtCache_evictionsPs',
        warningMessage: 'Rate of evictions from wiredTiger cache is unusually high (mean=%.2f,sd=%.2f, current=%d)',
        notes: 'randCrud.js, randQry.js enronloop2.js'
    }]
};

export default class Alarm extends Transformer {
    /* we don't want to send stats back to ui yet */
    _detachStats = (nextValue: ObservaleValue) => {
        delete nextValue.stats;
    };

    _simpleThresholds = (nextValue: ObservaleValue) => {
        const {
            stats,
            value
        } = nextValue;
        simpleThresholds.forEach((st) => {
            const path = [st.metric];
            const valueStats = _.get(stats, path);
            // const { mean, sd, count } = _.get(stats, path);
            const currentValue = _.get(value, path);
            const debugData = {
                path,
                valueStats,
                currentValue
            };

            if (currentValue > st.l1) {
                let level = 1;
                if (currentValue > st.l2) {
                    level = 2;
                }
                const message = sprintf(st.warningMessage, currentValue);
                _.set(value, st.alarmPath, {
                    level,
                    message,
                    debugData
                });
            }
        });
    };

    _standardDeviations = (nextValue: ObservaleValue) => {
        const {
            stats,
            value
        } = nextValue;
        standardDeviationThresholds.thresholds.forEach((st) => {
          console.log(st.metric);
            const path = [st.metric];
            console.log(path);
            const valueStats = _.get(stats, path);
            if (valueStats) {
            console.log(valueStats);
            const {
                mean,
                sd,
                count
            } = _.get(stats, path);
            const currentValue = _.get(value, path);
            const debugData = {
                path,
                valueStats,
                currentValue
            };
            if (count >= standardDeviationThresholds.minimumSamples) {
                if (currentValue > (mean + sd * st.l1)) {
                    let level = 1;
                    if (currentValue > (mean + sd * st.l2)) {
                        level = 2;
                    }
                    const message = sprintf(st.warningMessage, mean, sd, currentValue);
                    _.set(value, st.alarmPath, {
                        level,
                        message,
                        debugData
                    });
                }
            }
          }
        });
    };

    transform = (nextValue: ObservaleValue): ObservaleValue => {
        this._simpleThresholds(nextValue);
        this._standardDeviations(nextValue);

        // this._detachStats(nextValue);
        // nextValue.value.alarm = ({ok:1});

        nextValue.value.alarm && l.debug(`Alarm: ${JSON.stringify(nextValue.value.alarm, null, 2)}`);

        return nextValue;
    };
}
