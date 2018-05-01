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
/* eslint prefer-destructuring: 0 */
/* eslint no-loop-func: 0 */
/* eslint no-undef: 0 */

//
// Controller script that returns connection information.
//  Normal usage is to call the sample function for a specific time period
// with a sleep time.  Eg sample(5000,100) samples a 5 second interval, sleeping
// for 100ms between each call to currentOp().  Note that this is a blocking call
// The call will return a structure that has connections which were found
// during the sample period and information about the operations they called.
//

var dbkTopConnections = {};
dbkTopConnections.dbkCurrentSample = {};

dbkTopConnections.sample = function(sampleTime, sleepTime) {
  // Both sampleTime and sleepTime are in ms
  var startTime = new Date();
  var elapsed = 0;
  var inprogs = [];
  var count = 0;
  while (elapsed < sampleTime) {
    db.currentOp().inprog.forEach(function(ip) {
      if (!ip.microsecs_running) {
        ip.microsecs_running = 0;
      }
      if (!ip.appName) {
        ip.appName = '';
      }
      inprogs.push({
        loopId: count,
        host: ip.host,
        desc: ip.desc,
        threadId: ip.threadId,
        connectionId: ip.connectionId,
        client: ip.client,
        appName: ip.appName,
        opid: ip.opid,
        ns: ip.ns,
        op: ip.op,
        command: ip.command,
        currentOpTime: ip.currentOpTime,
        planSummary: ip.planSummary,
        us_running: ip.microsecs_running + 0
      });
    });
    count += 1;
    var endTime = new Date();
    elapsed = endTime - startTime;
    // print(elapsed);
    sleep(sleepTime);
  }

  // Create structured version of the data we just obtained.
  var connections = {};

  inprogs.forEach(function(ip) {
    if (!(ip.connectionId in connections)) {
      connections[ip.connectionId] = {
        host: ip.host,
        appName: ip.appName,
        client: ip.client,
        lastCommand: null,
        lastns: null,
        planSummary: null,
        ops: {}
      };
    }
    if (ip.opid in connections[ip.connectionId].ops) {
      // we've seen this op already
      if (connections[ip.connectionId].ops[ip.opid].us < ip.us_running) {
        // update time elasped
        connections[ip.connectionId].ops[ip.opid].us = ip.us_running;
        connections[ip.connectionId].ops[ip.opid].currentOpTime = ip.currentOpTime;
      }
    } else {
      // add the operation to the cconnection.
      connections[ip.connectionId].ops[ip.opid] = {
        ns: ip.ns,
        op: ip.op,
        us: ip.us_running,
        command: ip.command,
        planSummary: ip.planSummary,
        currentOpTime: ip.currentOpTime
      };
    }
    // Last thing sampled is always the "last" op
    connections[ip.connectionId].lastCommand = ip.command;
    connections[ip.connectionId].lastns = ip.ns;
    connections[ip.connectionId].lastOp = ip.op;
    connections[ip.connectionId].planSummary = ip.planSummary;
  });

  Object.keys(connections).forEach(function(c) {
    var count = 0;
    var us = 0;
    Object.keys(connections[c].ops).forEach(function(o) {
      count += 1;
      us += connections[c].ops[o].us;
    });
    connections[c].us = us;
    connections[c].opCount = count;
  });

  // Get an array of the keys:
  var connectionIds = Object.keys(connections);

  // Then sort by using the keys to lookup the values in the original object:
  var connectionsByUs = connectionIds.sort(function(a, b) {
    return connections[b].us - connections[a].us;
  });

  dbkTopConnections.dbkCurrentSample = {
    connections: connections,
    connectionsByUs: connectionsByUs
  };
  return dbkTopConnections.dbkCurrentSample;
};

dbkTopConnections.top5 = function(sampleTime, sleepTime) {
  dbkTopConnections.sample(sampleTime, sleepTime);
  dbkTopConnections.dbkCurrentSample.connectionsByUs.slice(0, 5).forEach(function(c) {
    var connection = dbkTopConnections.dbkCurrentSample.connections[c];
    // eslint-disable-next-line
    print(
      connection.client,
      connection.lastOp,
      connection.planSummary,
      connection.lastns,
      JSON.stringify(connection.lastCommand).substring(0, 30),
      connection.us
    );
  });
};

dbkTopConnections.toCollection = function() {
  db.topConnections.drop();
  Object.keys(dbkTopConnections.dbkCurrentSample.connections).forEach(function(c) {
    var data = dbkTopConnections.dbkCurrentSample.connections[c];
    // if ('$db' in data.lastCommand) delete data.lastCommand['$db'];
    Object.keys(data.ops).forEach(function(op) {
      // printjson(data.ops[op].command);
      // if ('$db' in data.ops[op].command) delete data.ops[op].command['$db'];
      data.ops[op].command = 'find';
    });
    data.lastCommand = 'find';
    // printjson(data);
    db.topConnections.insert(data);
  });
};
