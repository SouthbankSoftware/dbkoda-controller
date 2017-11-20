//
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
//
// // Utility functions within the mongo shell.
//

/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint camelcase: 0 */
/*  eslint prefer-arrow-callback: 0  */
/*  eslint object-shorthand: 0 */
/*  eslint vars-on-top: 0 */


var dbe = {};

dbe.version = function() {
  // Get the vers
  return (db.version().split('.')); // eslint-disable-line
};

dbe.round = function(num) {
  return Math.round(num * 100) / 100;
};

dbe.majorVersion = function() {
  var version = dbe.version();
  var intversion = Number(version[0] + '.' + version[1]);
  return (intversion);
};

dbe.sampleCollection = function(dbName, collectionName) {
  //
  // Quick sampling of a collection to return attribute names
  // Just samples 20 documents and only returns to two levels (eg xx.yy NOT xx.yy.zz)
  //
  var data = [];
  var mydb = db; // eslint-disable-line
  var attributes = {};
  var obj;
  var docarray;
  var results;
  if (dbe.majorVersion > 3.0) {
    data = mydb.getSiblingDB(dbName).getCollection(collectionName)
      .aggregate([{
        $sample: {
          size: 20
        }
      }]).toArray();
  } else {
    data = mydb.getSiblingDB(dbName).getCollection(collectionName)
      .find({}, {
        _id: 0
      }).limit(20).toArray();
  }

  data.forEach(function(doc) {
    Object.keys(doc).forEach(function(key) {
      var keytype = typeof doc[key];
      // print(keytype);
      // print(doc[key]);
      if (doc[key]) {
        if (doc[key].constructor === Array) {
          keytype = 'array';
        }
      }
      attributes[key] = keytype;
      if (keytype == 'object') {
        obj = doc[key];
        if (obj) {
          Object.keys(obj).forEach(function(nestedKey) {
            attributes[key + '.' + nestedKey] = typeof obj[nestedKey];
          });
        }
      } else
      if (keytype === 'array') {
        docarray = doc[key];
        docarray.forEach(function(nestedDoc) {
          var obj = nestedDoc;
          Object.keys(obj).forEach(function(nestedKey) {
            attributes[key + '.' + nestedKey] = typeof obj[nestedKey];
          });
        });
      }
    });
  });
  results = Object.keys(attributes);
  results.unshift('_id');
  // console.log('listAttributes returning ' + results.length);
  return results.sort();
};

dbe.profileLevels = function(dbName) {
  var mydb = db.getSiblingDB(dbName); // eslint-disable-line
  var dbeSpl = {};
  if (mydb.serverStatus().process !== 'mongos') {
    dbeSpl = mydb.getSiblingDB(dbName).getProfilingStatus();
  } else {
    dbeSpl.mongos = true;
  }
  dbeSpl.dbName = dbName;
  return (dbeSpl);
};

dbe.aggregationArgs = function() {
  var out = [];
  out.push({
    'StepName': '$sample',
    'StepValue': '{size:N}'
  });
  out.push({
    'StepName': '$match',
    'StepValue': '{"attribute":"value"}'
  });
  out.push({
    'StepName': '$project',
    'StepValue': '{"attribute":1,"attribute":0}'
  });
  out.push({
    'StepName': '$group',
    'StepValue': '{"_id":{alias:"$attribute",alias:"$attribute"}'
  });
  out.push({
    'StepName': '$sort',
    'StepValue': '{"alias":1}'
  });
  out.push({
    'StepName': '$lookup',
    'StepValue': '{from : "collection", as : "alias", localField : "attribute", foreignField : "_id"}'
  });
  out.push({
    'StepName': '$unwind',
    'StepValue': '$alias'
  });
  return out;
};

dbe.aggregationPreFill = function(dbName, collectionName) {
  var ddOut = {};
  ddOut.Database = dbName;
  ddOut.CollectionName = collectionName;
  ddOut.PipeLine = dbe.aggregationArgs();
  return (ddOut);
};

dbe.Top = function() {
  var mydb = db // eslint-disable-line
  var result = {};
  var topData;
  var colData;
  var colrow;
  var totalTime = 0;
  var i;

  result.top = [];

  if (mydb.serverStatus().process === 'mongos') {
    result.top.push({
      collection: 'top not available from mongos :-('
    });
  } else {
    topData = mydb.getSiblingDB('admin').runCommand({
      'top': 1
    });
    Object.keys(topData.totals).forEach(function(col) {
      // printjson(topData.totals[col]);
      if (topData.totals[col].hasOwnProperty('total')) { // eslint-disable-line
        colData = topData.totals[col];
        // printjson(colData);
        colrow = {};

        colrow.collection = col;
        colrow.sortTime = colData.total.time;
        totalTime += colData.total.time;
        colrow.time = colData.total.time;
        colrow.count = colData.total.count;
        colrow.readPct = 0;
        if (colrow.sortTime > 0) {
          colrow.readPct = dbe.round(((colData.readLock.time) * 100) / colrow.sortTime);
        }
        colrow.readPct = colrow.readPct.toFixed(2);
        result.top.push(colrow);
      }
    });
    result.top.sort(function(a, b) {
      return (b.sortTime - a.sortTime);
    });
    for (i = 0; i < result.top.length; i += 1) {
      result.top[i].pctTotal = dbe.round((result.top[i].sortTime * 100) / totalTime);
    }
  }
  return (result);
};

dbe.lpad = function(str, padString, length) {
  while (str.length < length) {
    str = padString + str;
  }
  return str;
};

dbe.rpad = function(str, padString, length) {
  while (str.length < length) {
    str += padString;
  }
  return str;
};

dbe.formatNumber = function(num) {
  return num.toFixed(2).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};

dbe.printNumber = function(num) {
  return (dbe.lpad(dbe.formatNumber(dbe.round(num)), ' ', 20));
};

dbe.databaseStorage = function() {
  var mydb = db.getSiblingDB("admin"); // eslint-disable-line
  var shardData = {};
  var output = {};
  var dbList = mydb.adminCommand({
    listDatabases: 1
  });
  if (dbList.ok == 1) {
    var dbData = dbList.databases.sort(function(a, b) {
      return b.sizeOnDisk - a.sizeOnDisk;
    });

    dbData.forEach(function(dbd) {
      if (dbd.hasOwnProperty('shards')) {
        Object.keys(dbd.shards).forEach(function(s) {
          if (shardData.hasOwnProperty(s)) {
            shardData[s] += dbd.shards[s];
          } else {
            shardData[s] = dbd.shards[s];
          }
        });
      }
      dbd.sizeMb = dbe.formatNumber(dbd.sizeOnDisk / 1048576);
    });
    output.storageByDb = dbData;
    output.shardData = shardData;
  }
  return output;
};

dbe.storageAnalysis = function() {
  var mydb = db.getSiblingDB("admin"); // eslint-disable-line
  var output = {};
  var dbList = mydb.adminCommand({
    listDatabases: 1
  });
  if (dbList.ok == 1) {
    var dbData1 = dbList.databases.sort(function(a, b) {
      return b.sizeOnDisk - a.sizeOnDisk;
    });

    output.name = 'total';
    output.children = [];
    dbData1.forEach(function(dbd) {
      var dbData = {};
      dbData.name = dbd.name;

      var db1 = db.getSiblingDB(dbd.name); // eslint-disable-line
      var collArr = [];
      db1.getCollectionNames().forEach(function(cname) {
        var stats = db1.getCollection(cname).stats();
        if (stats.code === 13) {
          return;
        }
        var collData = {
          name: cname,
        };
        collData.children = [];
        var indexes = [];
        Object.keys(stats.indexSizes).forEach(function(idx) {
          indexes.push({
            name: idx,
            size: stats.indexSizes[idx]
          });
        });
        collData.children.push({
          name: 'data',
          size: stats.storageSize
        });
        collData.children.push({
          name: 'indexes',
          children: indexes
        });
        collArr.push(collData);
      });
      collArr.sort(function(a, b) {
        return b.storageSizeMB - a.storageSizeMB;
      });
      dbData.children = collArr;
      output.children.push(dbData);
    });
  }
  return output;
};

dbe.collectionStorageAnalysis = function(dbName, collectionName, sampleSize) {
  return (dbk_Cs.collectionSize(dbName, collectionName, sampleSize)); // eslint-disable-line
};

//
// Provide a breakdown of storage for a sample of data
//
dbe.sizeEstimateArray = function(sample, sampleSize, collectionDocCount, adjustmentRatio) {
  var sizes = {};

  //
  // Add up data for each element in the sample data
  //
  sample.forEach(function(d) {
    if (typeof sizes.total == 'undefined') {
      sizes.total = Object.bsonsize(d);
    } else {
      sizes.total += Object.bsonsize(d);
    }

    Object.keys(d).forEach(function(e) {
      var typeofE = typeof d[e];
      if (typeofE === 'object') {
        var elemSize = Object.bsonsize(d[e]);
        if (typeof sizes[e] == 'undefined') {
          sizes[e] = elemSize;
        } else {
          sizes[e] += elemSize;
        }
      }
    });
  });
  // Work out unallocated size and adjust for compression
  // and sampling
  var adjustedSizes = {};
  var accounted = 0;
  Object.keys(sizes).forEach(function(e) {
    // print (e+" "+sizes[e]);
    if (e !== 'total') {
      accounted += sizes[e];
      adjustedSizes[e] = sizes[e] * adjustmentRatio;
      // print ('adjusted '+e+' '+adjustedSizes[e]);
    }
  });
  adjustedSizes.other = (sizes.total - accounted) * adjustmentRatio;
  var children = [];
  // Reformat into the structure expected by the starburst chart
  Object.keys(adjustedSizes).forEach(function(f) {
    children.push({
      name: f,
      size: adjustedSizes[f]
    });
  });
  return children;
};

dbe.explainIndexes = function(explainPlan) {
  //
  // This function accepts an execution plan and generates an index
  // definition that would avoid COLLSCAN and Sort
  //
  // Only works when there are one level of nesting in conditions.  Eg
  // You can't nest $and within $or
  // $or only generates a single index for $OR, where multiple would be
  // preferable
  //
  // TODO: This won't work with deeply nested conditions and not
  //      ideal for $or conditions
  //
  // Usage:
  // var indexKeys=dbe.explainIndexes(explainDoc.queryPlanner.winningPlan);
  // db.Sakila_films.createIndex(indexKeys);
  var indexEntries = {};

  var checkInputStage = function(step, depth) {
    if ('inputStage' in step) {
      checkInputStage(step.inputStage, depth + 1);
    }
    if ('inputStages' in step) {
      step.inputStages.forEach(function(inputStage) {
        checkInputStage(inputStage, depth + 1);
      });
    }
    if (step.stage === 'COLLSCAN') { // Create index for COLLSCAN
      var filter = step.filter;
      var filterKeys = Object.keys(filter);
      if (filterKeys[0] === '$and' || filterKeys[0] === '$or') {
        // TODO: Ideally should create more than one index for OR
        var andFilters;
        if (filterKeys[0] === '$and') {
          andFilters = filter.$and;
        } else {
          andFilters = [];
          andFilters.push(filter.$or[0]); // Only first OR condition in index
        }
        andFilters.forEach(function(afilter) {
          Object.keys(afilter).forEach(function(akey) {
            indexEntries[akey] = 1;
          });
        });
      } else {
        var attr = filterKeys[0];
        indexEntries[attr] = 1;
      }
    } else if (step.stage === 'SORT') { // Create index for SORT
      Object.keys(step.sortPattern).forEach(function(key) {
        indexEntries[key] = step.sortPattern[key];
      });
    }
  };
  checkInputStage(explainPlan, 1);
  return indexEntries;
};
