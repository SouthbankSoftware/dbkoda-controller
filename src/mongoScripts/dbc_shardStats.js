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
// Utility functions within the mongo shell.
//
/* Mongo 3.0 does not support modern javascript idioms */
/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */

var dbcShards = {};

dbcShards.trimServerName = function(serverName) {
  // print ("servername="+serverName);
  var newServerName = serverName;
  var dotPos = serverName.indexOf('.');
  var colonPos = serverName.indexOf(':');
  var slashPos = serverName.indexOf('/');
  if (slashPos > 0) {
    newServerName = serverName.substr(0, slashPos);
  } else if (colonPos + dotPos > 1) {
    newServerName = serverName.substr(0, dotPos) + serverName.substr(colonPos);
  }
  // if (newServerName.length>12) {  newServerName=  serverName.substr(0, 8) +
  // serverName.substr(colonPos) } print ("new servername="+newServerName);
  return newServerName;
};

dbcShards.chunks = function () {
  var myDb = db.getSiblingDB("config"); // eslint-disable-line
  var results = {};
  results.chunks = myDb.chunks.aggregate([
      {
        $group: {
          _id: {
            shard: '$shard'
          },
          chunks: {
            $sum: 1
          }
        }
      },
      {
        $project: {
          shard: '$_id.shard',
          chunks: '$chunks',
          _id: 0
        }
      }
    ])
    .toArray();
  return results;
};

dbcShards.threads = function () {
  var hostStats = {};
  var poolStats = db.adminCommand({ shardConnPoolStats: 1 }); // eslint-disable-line
  var id;
  poolStats.threads.forEach(function(pst) {
    pst.hosts.forEach(function(host) {
      id = dbcShards.trimServerName(host.host);
      if (!hostStats.hasOwnProperty(id)) {
        hostStats[id] = {};
        hostStats[id].longString = host.host;
        hostStats[id].created = host.created;
      }

      hostStats[id].count = hostStats[id].count + 1 || 1;
      hostStats[id].created += host.created;
    });
  });
  return hostStats;
};



dbcShards.collectionChunks = function () {
  var myDb = db.getSiblingDB("config"); // eslint-disable-line
  var results = {};
  results = myDb.chunks.aggregate([
      { $group: { _id: { ns: '$ns', shard: '$shard' }, count: { $sum: 1 } } },
      {
        $project: {
          ns: '$_id.ns',
          shard: '$_id.shard',
          chunks: '$count',
          _id: 0
        }
      },{$sort:{"chunks":-1}}
    ])
    .toArray();
  return results;
};

dbcShards.details = function() {
  var output = {};
  var thrdata = dbcShards.threads();
  var threadsByHost = [];
  Object.keys(thrdata).forEach(function(host) {
    // print(host);
    // printjson(thrdata[host]);
    threadsByHost.push({host:host, created:thrdata[host].created});
  });
  output.chunks = dbcShards.chunks().chunks;
  output.threadsByHost = threadsByHost;
  output.collectionChunks = dbcShards.collectionChunks();
  return (output);
};
