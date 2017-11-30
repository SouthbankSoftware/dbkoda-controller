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
// Utility functions for index advisories
//

/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint camelcase: 0 */
/*  eslint prefer-arrow-callback: 0  */
/*  eslint object-shorthand: 0 */
/*  eslint vars-on-top: 0 */
/*  eslint dot-location: 0 */
/*  eslint no-loop-func: 0 */
/*  eslint no-undef: 0 */
/*  eslint no-plusplus: 0 */
/* eslint no-unused-vars: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint no-restricted-globals: 0 */
/* eslint block-scoped-var: 0 */

var dbkInx = {};

dbkInx.debug = false;

dbkInx.quick_explain = function(explainPlan) {
  var stepNo = 1;
  var output = '';

  var printSpaces = function(n) {
    var s = '';
    for (var i = 1; i < n; i++) {
      s += ' ';
    }
    return s;
  };
  var printInputStage = function(step, depth) {
    if ('inputStage' in step) {
      printInputStage(step.inputStage, depth + 1);
    }
    if ('inputStages' in step) {
      step.inputStages.forEach(function(inputStage) {
        printInputStage(inputStage, depth + 1);
      });
    }
    var keys = [];
    if ('filter' in step) {
      if ('$and' in step.filter) {
        // Array of filter conditions
        step.filter.$and.forEach(function(filter) {
          keys.push(Object.keys(filter));
        });
      } else if ('$or' in step.filter) {
        // Array of filter conditions
        step.filter.$or.forEach(function(filter) {
          keys.push(Object.keys(filter));
        });
      } else {
        keys.push(Object.keys(step.filter));
      }
    }
    if ('indexName' in step) {
      keys.push(step.indexName);
    }
    if ('sortPattern' in step) {
      Object.keys(step.sortPattern).forEach(function(skey) {
        keys.push(skey);
      });
    }
    output +=
      stepNo++ +
      ' ' +
      printSpaces(depth) +
      ' ' +
      step.stage +
      ' ' +
      keys +
      '\n';
  };

  printInputStage(explainPlan, 1);
  return output;
};

dbkInx.adviseAllCachedPlans = function() {
  db.getCollectionNames().forEach(function(collectionName) {
    // eslint-disable-line
    dbkInx.adviseCachedCollectionPlans(collectionName);
  });
};

dbkInx.adviseCachedCollectionPlans = function(collectionName) {
  var planCache = db.getCollection(collectionName).getPlanCache(); // eslint-disable-line
  planCache.listQueryShapes().forEach(function(shape) {
    planCache.getPlansByQuery(shape).forEach(function(plan) {
      var indexKeys = dbkInx.suggestIndexKeys(plan.reason.stats); // eslint-disable-line
      // printjson(indexKeys); // eslint-disable-line
    });
  });
};

dbkInx.adviseProfileQueries = function() {
  db.system.profile. // eslint-disable-line
  find({
    op: 'query'
  }).forEach(function(profile) {
    // eslint-disable-line
    // eslint-disable-line
    if (dbkInx.debug) printjson(profile.query);
    // var indexKeys = dbkInx.suggestIndexKeys(profile.execStats);
    // printjson(indexKeys);
  });
};

dbkInx.createKeys = function(collection, indexes) {
  // printjson(indexes);
  indexes.forEach(function(index) {
    var result = db.getCollection(collection).createIndex(index);
    if (dbkInx.debug) printjson(result);
  });
  if (dbkInx.debug) {
    print('..... Allindexes');
    db.getCollection(collection).getIndexes().forEach(function(indx) {
      printjson(indx.key);
    });
  }
};

dbkInx.testPlans = function() {
  db.Sakila_films.dropIndexes(); // eslint-disable-line
  for (var i = 1; i <= 1; i++) {
    if (dbkInx.debug) print(1);
    var explain = db.Sakila_films.
      explain().
      find({ Category: 'Documentary', Rating: 'PG' }).
      sort({ Length: 1 }).
      next();
    dbkInx.createKeys("Sakila_films", dbkInx.suggestIndexKeys(explain)); // eslint-disable-line

    db.Sakila_films.createIndex({ Category: 1 }); // eslint-disable-line
    if (dbkInx.debug) print(2);
    explain = db.Sakila_films.
      explain().
      find({ Category: 'Documentary', Rating: 'PG' }).
      sort({ Length: 1 }).
      next();
    dbkInx.createKeys("Sakila_films", dbkInx.suggestIndexKeys(explain)); // eslint-disable-line

    db.Sakila_films.createIndex({ Rating: 1 }); // eslint-disable-line
    if (dbkInx.debug) print(3);
    explain = db.Sakila_films.
      explain().
      find({ Category: 'Documentary', Rating: 'PG' }).
      sort({ Length: 1 }).
      next();
    dbkInx.createKeys("Sakila_films", dbkInx.suggestIndexKeys(explain)); // eslint-disable-line
    // print('ITERATING THROUGH ALL PLANS');

    explain = db.Sakila_films.
      explain().
      find({ Category: 'Documentary', Rating: 'PG' }).
      next();
    // printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line
    explain = db.Sakila_films.
      explain().
      find({ $or: [{ Rating: 'PG' }, { Category: 'Family' }] }).
      next();
    dbkInx.createKeys("Sakila_films", dbkInx.suggestIndexKeys(explain)); // eslint-disable-line
    db.Sakila_films.createIndex({ Rating: 1 }); // eslint-disable-line
    db.Sakila_films.createIndex({ Category: 1 }); // eslint-disable-line
    if (dbkInx.debug) print(5);
    explain = db.Sakila_films.
      explain().
      find({
        $or: [
          { Rating: 'PG', 'Rental Duration': '6' },
          { Category: 'Family', 'Rental Duration': '6' }
        ]
      }).
      sort({ Length: 1 }).
      next();
    // printjson(explain); // eslint-disable-line
    // printjson(explain.queryPlanner.winningPlan);
    dbkInx.createKeys("Sakila_films", dbkInx.suggestIndexKeys(explain)); // eslint-disable-line
    explain = db.Sakila_films.
      explain().
      find({
        $or: [
          { Rating: 'PG', 'Rental Duration': '6' },
          { Category: 'Family', 'Rental Duration': '6' }
        ]
      }).
      sort({ Length: -1, Rating: 1 }).
      next();
    // printjson(explain); // eslint-disable-line
    // printjson(explain.queryPlanner.winningPlan);
    dbkInx.createKeys("Sakila_films", dbkInx.suggestIndexKeys(explain)); // eslint-disable-line
    // Second time through there should be no better index available.
    dbkInx.createKeys("Sakila_films", dbkInx.suggestIndexKeys(explain)); // eslint-disable-line
  }

  // db.Sakila_films.dropIndexes(); // eslint-disable-line
};

dbkInx.suggestIndexKeys = function(explainPlan) {
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
  // var indexKeys=dbkIdx.suggestIndexKeys(explainDoc);
  // db.Sakila_films.createIndex(indexKeys);
  // var indexEntries = {};
  // var existingIndexEntries = {};
  // var orDetected = false;
  // var multiIndexes = [];
  var indId = 0;
  var indKeys = []; // Global for the filter recusive routine
  indKeys[0] = {};

  if (dbkInx.debug) {
    print(dbkInx.quick_explain(explainPlan.queryPlanner.winningPlan));
  } // Print explain summary if debug

  // Function to generate indexes to match a given filter
  filterParser = function(filter) {
    var firstArg = Object.keys(filter)[0];
    if (firstArg === '$or') {
      var orCount = 0;
      filter.$or.forEach(function(subfilter) {
        if (orCount > 0) {
          indId++; // New index for each OR condition
          indKeys[indId] = {};
        }
        filterParser(subfilter);
        orCount += 1;
      });
    } else if (firstArg === '$and') {
      filter.$and.forEach(function(subfilter) {
        filterParser(subfilter);
      });
    } else {
      var keys = Object.keys(filter);
      // printjson(filter);
      keys.forEach(function(key) {
        // printjson(key);
        indKeys[indId][key] = 1;
      });
    }
    return indKeys;
  };

  var checkInputStage = function(step, depth) {
    if ('inputStage' in step) {
      checkInputStage(step.inputStage, depth + 1);
    }
    if ('inputStages' in step) {
      step.inputStages.forEach(function(inputStage) {
        checkInputStage(inputStage, depth + 1);
      });
    }
    //
    // We should have got every index we need other than for a sort
    // already.  Only if a sort turns up do we need to add more keys
    //

    if (step.stage === 'SORT') {
      if (Object.keys(indKeys[0]).length === 0) {
        // no indexes yet, so just want one for the sort
        Object.keys(step.sortPattern).forEach(function(key) {
          indKeys[0][key] = step.sortPattern[key];
        });
      } else {
        Object.keys(step.sortPattern).forEach(function(key) {
          for (var idx = 0; idx < indKeys.length; idx += 1) {
            indKeys[idx][key] = step.sortPattern[key];
          }
        });
      }
    }
  };

  var baseIndexes = filterParser(explainPlan.queryPlanner.parsedQuery);
  // printjson(baseIndexes);
  checkInputStage(explainPlan.queryPlanner.winningPlan, 1);

  if (dbkInx.debug) {
    print('Suggested Indexes');
    printjson(indKeys);
  }

  // Check for existing indexes
  var dbName = explainPlan.queryPlanner.namespace.split('.')[0];
  var collectionName = explainPlan.queryPlanner.namespace.split('.')[1];
  var indexes = db.
    getSiblingDB(dbName).
    getCollection(collectionName).
    getIndexes();
  var existingIndexes = [];
  for (var idx = 0; idx < indKeys.length; idx += 1) {
    indexes.forEach(function(existingIndex) {
      if (dbkInx.debug) {
        print('====Checking for index match');
        printjson(existingIndex.key);
        printjson(indKeys[idx]);
      }
      if (JSON.stringify(existingIndex.key) === JSON.stringify(indKeys[idx])) {
        existingIndexes.push(idx);
        if (dbkInx.debug) {
          print('====Index already exists');
        }
      }
    });
  }

  var advisedIndexes = [];
  for (var idx = 0; idx < indKeys.length; idx += 1) {  //eslint-disable-line
    if (!(idx in existingIndexes)) {
      advisedIndexes.push(indKeys[idx]);
    }
  }
  if (dbkInx.debug) {
    print(
      'was ',
      indKeys.length,
      ' indexes ',
      advisedIndexes.length,
      ' not existing'
    );
    printjson(existingIndexes);
    printjson(indKeys);
  }

  return advisedIndexes;
};
