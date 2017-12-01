//
//  *
//  * dbKoda - a modern, open source code editor, for MongoDB.
//  * Copyright (C) 2017-2018 Southbank Software
//  *
//  * This file is part of dbKoda.
//  *
//  * dbKoda is free software: you can redistribute it and/or modify
//  * it under the terms of the GNU Affero General Public License as
//  * published by the Free Software Foundation, either version 3 of the
//  * License, or (at your option) any later version.
//  *
//  * dbKoda is distributed in the hope that it will be useful,
//  * but WITHOUT ANY WARRANTY; without even the implied warranty of
//  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  * GNU Affero General Public License for more details.
//  *
//  * You should have received a copy of the GNU Affero General Public License
//  * along with dbKoda.  If not, see <http://www.gnu.org/licenses/>.
//

/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0  */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */
/* eslint vars-on-top: 0 */

var dbeSS = {};

dbeSS.serverStatistics = function() {
  var output = {};
  var value;
  var rate;
  output.statistics = [];
  var serverStats = dbeSS.flattenServerStatus(db.serverStatus()).stats; // eslint-disable-line
  var uptime = serverStats.uptime;
  Object.keys(serverStats).forEach(function(stat) {
    // print(stat);
    value = serverStats[stat];
    rate = null;
    if (typeof value === "number") {
      rate = (value / uptime).toFixed(4);
    }
    if (!stat.match(/_mongo/)) {
      output.statistics.push({
        statistic: stat,
        value: value,
        ratePs: rate
      });
    }
  });
  return output;
};

dbeSS.flattenServerStatus = function(dbServerStatus) {
  var flattenedServerStatus = {};
  flattenedServerStatus.stats = {};

  function internalflattenServerStatus(serverStatus, rootTerm) {
    var prefix = "";
    if (arguments.length > 1) {
      prefix = rootTerm + ".";
    }
    Object.getOwnPropertyNames(serverStatus).forEach(function(key) {
      if (key !== "_mongo") {
        var value = serverStatus[key];
        if (value.constructor === NumberLong) {
          // eslint-disable-line
          // eslint-disable-line
          value = value.toNumber();
        }
        var valtype = typeof value;
        var fullkey = prefix + key;
        // print(key, value, valtype, fullkey);
        if (valtype == "object") {
          // recurse into nested objects
          internalflattenServerStatus(value, prefix + key);
        } else {
          /* No more nesting */
          flattenedServerStatus.stats[fullkey] = value;
        }
      }
    });
  }
  internalflattenServerStatus(dbServerStatus);
  return flattenedServerStatus;
};

dbeSS.mStat = function(repeat, sleepTime) {
  for (var count = 0; count < repeat; count += 1) {
    sleep(sleepTime); // eslint-disable-line
  }
};

dbeSS.simpleStats = function() {
  return dbeSS.convertStat(dbeSS.serverStatistics());
};

dbeSS.convertStat = function(serverStat) {
  var returnStat = {};
  serverStat.statistics.forEach(function(stat) {
    returnStat[stat.statistic] = stat.value;
  });
  return returnStat;
};

dbeSS.statDelta = function(instat1, instat2) {
  var stat1 = dbeSS.convertStat(instat1);
  var stat2 = dbeSS.convertStat(instat2);
  var delta;
  var rate;
  var statDelta = {};
  statDelta.timeDelta = stat2.uptime - stat1.uptime;
  // print("timedelta", statDelta.timeDelta);
  Object.keys(stat2).forEach(function(key) {
    // print(key,typeof stat2[key]);
    if (typeof stat2[key] === "number") {
      delta = stat2[key] - stat1[key];
      rate = delta / statDelta.timeDelta;
    } else {
      delta = null;
      rate = null;
    }
    statDelta[key] = {
      lastValue: stat2[key],
      firstValue: stat1[key],
      delta: delta,
      rate: rate
    };
  });
  return statDelta;
};

// dbeSS.report = function(sleepSeconds) {
//   // TODO: Statistic names change over versions
//   var data = {};
//   var start = dbeSS.serverStatistics();
//   sleep(sleepSeconds * 1000); // eslint-disable-line
//   var deltas = dbeSS.statDelta(start, dbeSS.serverStatistics());
//   print("Network");
//   print("-------");
//   // printjson(deltas['network.bytesIn']); // eslint-disable-line
//   data.netIn = deltas["network.bytesIn"].rate;
//   data.netOut = deltas["network.bytesOut"].rate;
//   print("bytes/sec In: " + data.netIn + " Out: " + data.netOut);
//   print("MongoDB");
//   print("-------");
//   data.qry = deltas["opcounters.query"].rate;
//   data.getmore = deltas["opcounters.getmore"].rate;
//   data.command = deltas["opcounters.command"].rate;
//   data.ins = deltas["opcounters.insert"].rate;
//   data.upd = deltas["opcounters.update"].rate;
//   data.del = deltas["opcounters.delete"].rate;
//   print(
//     "Operations qry: " +
//       data.qry +
//       " more:" +
//       data.getmore +
//       " cmd: " +
//       data.command +
//       " ins: " +
//       data.ins +
//       " upd: " +
//       data.upd +
//       " del: " +
//       data.del
//   );
//   return data;
// };

dbeSS.summary = function(sample1, sample2) {
  // TODO: Statistic names change over versions
  var data = {};
  var deltas = dbeSS.statDelta(sample1, sample2);
  var finals = dbeSS.convertStat(sample2);
  data.netIn = deltas["network.bytesIn"].rate;
  data.netOut = deltas["network.bytesOut"].rate;

  data.qry = deltas["opcounters.query"].rate;
  data.getmore = deltas["opcounters.getmore"].rate;
  data.command = deltas["opcounters.command"].rate;
  data.ins = deltas["opcounters.insert"].rate;
  data.upd = deltas["opcounters.update"].rate;
  data.del = deltas["opcounters.delete"].rate;

  data.activeRead = finals["globalLock.activeClients.readers"];
  data.activeWrite = finals["globalLock.activeClients.writers"];
  data.queuedRead = finals["globalLock.currentQueue.readers"];
  data.queuedWrite = finals["globalLock.currentQueue.writers"];
  // var lockRe = /locks.*acquireCount.*floatApprox
  //
  // The "time acquiring" counts for locks seem to appoear only after some significant
  // waits have occured.  Sometimes it's timeAcquiringMicros, and
  // sometimes it's timeAcquireingMicros.*k.floatApprox
  //
  // print(deltas['opLatencies.reads.ops']);
  if (deltas["opLatencies.reads.ops"].delta > 0) {
    data.readLatency =
      deltas["opLatencies.reads.latency"].delta /
      deltas["opLatencies.reads.ops"].delta;
  } else data.readLatency = 0;

  if (deltas["opLatencies.writes.ops"].delta > 0) {
    data.writeLatency =
      deltas["opLatencies.writes.latency"].delta /
      deltas["opLatencies.writes.ops"].delta;
  } else data.writeLatency = 0;

  if (deltas["opLatencies.commands.ops"].delta > 0) {
    data.cmdLatency =
      deltas["opLatencies.commands.latency"].delta /
      deltas["opLatencies.commands.ops"].delta;
  } else data.cmdLatency = 0;

  data.connections = deltas["connections.current"].lastValue;
  data.availableConnections = deltas["connections.available"].firstValue;
  data.asserts =
    deltas["asserts.regular"].rate +
    deltas["asserts.warning"].rate +
    deltas["asserts.msg"].rate +
    deltas["asserts.user"].rate +
    deltas["asserts.rollovers"].rate;

  return data;
};
