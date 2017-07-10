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

//
/* Mongo 3.0 does not support modern javascript idioms */
/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */
//

var dbc_rsStats = {};

 dbc_rsStats.lags = function() {
  var rs1 = rs.status(); // eslint-disable-line
  var lags = [];
  var lag;
  var optimeBase;
  rs1.members.forEach(function(mem) {
    if (mem.stateStr === 'PRIMARY') {
      optimeBase = mem.optime.ts.t;
    }
  });
  rs1.members.forEach(function(mem) {
    if (mem.hasOwnProperty('optime')) {
      lag = optimeBase - mem.optime.ts.t;
      lags.push({ host: mem.name, lag:lag });
    }
  });
  return (lags);
};

dbc_rsStats.details = function() {
  var output = {};
  output.lags = dbc_rsStats.lags();
  output.members = dbc_rsStats.members();
  return output;
};

dbc_rsStats.members = function() {
  var rs1 = rs.status(); // eslint-disable-line
  var members = [];
  var optimedate;
  rs1.members.forEach(function (r) {
    if (r.hasOwnProperty('optimeDate')) {
      optimedate = r.optimeDate.toJSON();
    } else {
      optimedate = null;
    }
    members.push({
      name: r.name,
      state: r.stateStr,
      uptimeHrs: r.uptime / 3600,
      opttime: optimedate
    });
  });
  return members;
};
