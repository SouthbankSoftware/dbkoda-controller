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
import flat from 'flat';
import _ from 'lodash';
/**
 * Created by joey on 9/1/18.
 */



export const serverStatistics = (stats) => {
  const serverStats = flat(stats);
  const uptime = serverStats.uptime;
  const output = {statistics: []};
  _.forOwn(serverStats, (value, key) => {
    let rate = 0;
    if (typeof value === 'number') { // eslint-disable-line
      // eslint-disable-line
      rate = (value / uptime).toFixed(4);
    }
    if (!key.match(/_mongo/)) {
      output.statistics.push({
        statistic: key,
        value,
        ratePs: rate
      });
    }
  });
  return output;
};

export const simpleStats = (stats) => {
  const returnStat = {};
  stats.statistics.forEach((stat) => {
    returnStat[stat.statistic] = stat.value;
  });
  return returnStat;
};

export const statDelta = (instat1, instat2) => {
  const stat1 = simpleStats(instat1);
  const stat2 = simpleStats(instat2);
  let delta;
  let rate;
  const statDelta = {};
  statDelta.timeDelta = stat2.uptime - stat1.uptime;
  // print("timedelta", statDelta.timeDelta);
  Object.keys(stat2).forEach((key) => {
    // print(key,typeof stat2[key]);
    if (typeof stat2[key] === 'number') {
      delta = stat2[key] - stat1[key];
      rate = delta / statDelta.timeDelta;
    } else {
      delta = null;
      rate = null;
    }
    statDelta[key] = {
      lastValue: stat2[key],
      firstValue: stat1[key],
      delta,
      rate
    };
  });
  return statDelta;
};

export const getField = (data, key, field) => {
  if (key in data && field in data[key]) {
    return data[key][field];
  }
  log.debug(`cant find key ${key}`);
  return null;
};

export const parseStats = (previous, newData) => {
  const finals = serverStatistics(newData);
  const output = {finals};
  if (previous) {
    const data = {};
    const deltas = statDelta(previous, finals);
    // *********************************************
    //  Network counters
    // *********************************************
    data.netIn = getField(deltas, 'network.bytesIn', 'rate');
    data.netOut = getField(deltas, 'network.bytesOut', 'rate');

    // ********************************************
    // Activity counters
    // ********************************************
    data.qry = getField(deltas, 'opcounters.query', 'rate');
    data.getmore = getField(deltas, 'opcounters.getmore', 'rate');
    data.command = getField(deltas, 'opcounters.command', 'rate');
    data.ins = getField(deltas, 'opcounters.insert', 'rate');
    data.upd = getField(deltas, 'opcounters.update', 'rate');
    data.del = getField(deltas, 'opcounters.delete', 'rate');

    data.activeRead = finals['globalLock.activeClients.readers'];
    data.activeWrite = finals['globalLock.activeClients.writers'];
    data.queuedRead = finals['globalLock.currentQueue.readers'];
    data.queuedWrite = finals['globalLock.currentQueue.writers'];
    if (getField(deltas, 'opLatencies.reads.ops', 'delta') > 0) {
      data.readLatency =
        getField(deltas, 'opLatencies.reads.latency', 'delta') /
        getField(deltas, 'opLatencies.reads.ops', 'delta');
    } else data.readLatency = 0;

    if (getField(deltas, 'opLatencies.writes.ops', 'delta') > 0) {
      data.writeLatency =
        getField(deltas, 'opLatencies.writes.latency', 'delta') /
        getField(deltas, 'opLatencies.writes.ops', 'delta');
    } else data.writeLatency = 0;

    if (getField(deltas, 'opLatencies.commands.ops', 'delta') > 0) {
      data.cmdLatency =
        getField(deltas, 'opLatencies.commands.latency', 'delta') /
        getField(deltas, 'opLatencies.commands.ops', 'delta');
    } else data.cmdLatency = 0;

    data.connections = getField(deltas, 'connections.current', 'lastValue');
    data.availableConnections = getField(deltas, 'connections.available', 'firstValue');
    data.asserts =
      getField(deltas, 'asserts.regular', 'rate') +
      getField(deltas, 'asserts.warning', 'rate') +
      getField(deltas, 'asserts.msg', 'rate') +
      getField(deltas, 'asserts.user', 'rate') +
      getField(deltas, 'asserts.rollovers', 'rate');

    // *********************************************************
    // Memory counters
    // *********************************************************

    data.cacheGets = getField(deltas, 'wiredTiger.cache.pages requested from the cache', 'rate');

    data.cacheHighWater = getField(deltas, 'wiredTiger.cache.maximum bytes configured', 'lastValue');

    data.cacheSize = getField(deltas, 'wiredTiger.cache.bytes currently in the cache', 'lastValue');

    data.cacheReadQAvailable = getField(deltas, 'wiredTiger.concurrentTransactions.read.available', 'lastValue');
    data.cacheReadQUssed = getField(deltas, 'wiredTiger.concurrentTransactions.read.out', 'lastValue');

    data.cacheWriteQAvailable = getField(deltas, 'wiredTiger.concurrentTransactions.write.available', 'lastValue');
    data.cacheWriteQUsed = getField(deltas, 'wiredTiger.concurrentTransactions.write.out', 'lastValue');

    data.diskBlockReads = getField(deltas, 'wiredTiger.block-manager.blocks read', 'rate');
    data.diskBlockWrites = getField(deltas, 'wiredTiger.block-manager.blocks written', 'rate');

    data.logByteRate = getField(deltas, 'wiredTiger.log.log bytes written', 'rate');

    data.logSyncTimeRate = getField(deltas, 'wiredTiger.log.log sync time duration (usecs)', 'rate');
    output.data = data;
  }
  return output;
};

