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

/* Mongo 3.0 does not support modern javascript idioms */
/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */

var dbeCR = {};

dbeCR.getCache = function (dbName, collectionName) {
    // Get out all the plan cache entries for a query
    var mydb = db.getSiblingDB(dbName); // eslint-disable-line
    var planCache = [];
    var plans;
    var collection = mydb.getSiblingDB(dbName).getCollection(collectionName); // eslint-
    collection.getPlanCache().listQueryShapes().forEach(function(qs) {
        var planCacheEntry = {};
        planCacheEntry.queryShape = qs;
         plans = collection.getPlanCache()
        .getPlansByQuery(qs.query, qs.sort, qs.projection);
        plans.sort(function(a, b) {
            return b.reason.score - a.reason.score;
        });
        planCacheEntry.winningPlan = plans[0];
        planCache.push(planCacheEntry);
    });
    return planCache;
};

dbeCR.getStats = function(dbName, collectionName) {
    var mydb = db.getSiblingDB(dbName); // eslint-disable-line
    var collection = mydb.getSiblingDB(dbName).getCollection(collectionName);
    return (collection.stats());
};

dbeCR.getProfileData = function(dbName, collectionName) {
        var mydb = db.getSiblingDB(dbName); // eslint-disable-line
    var ns = dbName + '.' + collectionName;
    var profileData = mydb.getSiblingDB(dbName).getCollection('system.profile').aggregate([{
            $match: {
                'ns': ns,
                'op': 'query'
            }
        },
        {
            $group: {
                _id: {
                    'filter': '$query.filter'
                },
                'count': {
                    $sum: 1
                },
                'millis-sum': {
                    $sum: '$millis'
                },
                'nreturned-sum': {
                    $sum: '$nreturned'
                },
                'planSummary-first': {
                    $first: '$planSummary'
                },
                'docsExamined-sum': {
                    $sum: '$docsExamined'
                }
            }
        },
        {
            $sort: {
                'millis-sum': -1
            }
        }
    ]);
    return (profileData);
};

dbeCR.collStats = function (dbName) {
  var myDB = db.getSiblingDB(dbName); // eslint-disable-line
  var collArr = [];
  var result = {};
  myDB.getCollectionNames().forEach(function(cname) {
    var stats = myDB.getCollection(cname).stats();
   // printjson(stats);
    collArr.push({
      'ns':stats.ns,
      'count':stats.count,
      'storageSizeMB':stats.storageSize / 1048576,
      'totalIndexSizeMB':stats.totalIndexSize / 1048576
    });
  });
  collArr.sort(function (a, b) { return (b.storageSizeMB - a.storageSizeMB); });
  result.collStats = collArr;
  return (result);
};
