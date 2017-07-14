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

/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */
/* eslint vars-on-top: 0 */

var dbeSS = {};


dbeSS.serverStatistics = function () {
  var output = {};
  var value;
  var rate;
  output.statistics = [];
  var serverStats = dbeSS.flattenServerStatus(db.serverStatus()).stats; // eslint-disable-line
  var uptime = serverStats.uptime;
  Object.keys(serverStats).forEach(function(stat) {
    value = serverStats[stat];
    rate = '';
    if (typeof value === 'number') {
      rate = (value / uptime).toFixed(4);
    }
    output.statistics.push({
      'statistic': stat,
      'value': value,
      'ratePs':rate
    });
  });
  return (output);
};

dbeSS.flattenServerStatus = function (dbServerStatus) {
  var flattenedServerStatus = {};
  flattenedServerStatus.stats = {};

  function internalflattenServerStatus(serverStatus, rootTerm) {
    var prefix = '';
    if (arguments.length > 1) {
      prefix = rootTerm + '.';
    }
    Object.getOwnPropertyNames(serverStatus).forEach(function(key) {
      var value = serverStatus[key];
      var valtype = typeof value;
      var fullkey = prefix + key;
      if (valtype == 'object') {
        // recurse into nested objects
        internalflattenServerStatus(value, prefix + key);
      } else {
        /* No more nesting */
        flattenedServerStatus.stats[fullkey] = value;
      }
    });
  }
  internalflattenServerStatus(dbServerStatus);
  return flattenedServerStatus;
};
