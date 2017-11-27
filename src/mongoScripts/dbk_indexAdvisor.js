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
    return (s);
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
    output += stepNo++ + ' ' + printSpaces(depth) + ' ' + step.stage + ' ' + keys + '\n';
  };

  printInputStage(explainPlan, 1);
  return (output);
};

dbkInx.createIndexes = function(explainDoc) {
   var explainPlan = explainDoc.queryPlanner.winningPlan;
   var startPlan = dbkInx.quick_explain(explainPlan);
   var namespace = explainPlan.queryPlanner.split();
   // WIP here
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
  // var indexKeys=dbkIdx.suggestIndexKeys(explainDoc.queryPlanner.winningPlan);
  // db.Sakila_films.createIndex(indexKeys);
  var indexEntries = {};
  var existingIndexEntries = {};
  var orDetected = false;
  var multiIndexes = [];
  if (dbkInx.debug) print(dbkInx.quick_explain(explainPlan));  // Print explain summary if debug
  var addIndexEntries = function() {
    // For SORT or FETCH, add any index patterns from prev steps
    Object.keys(existingIndexEntries).forEach(function(iKey) {
      indexEntries[iKey] = existingIndexEntries[iKey];
    });
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
    // print(step.stage);
    if (step.stage === 'AND_SORTED') {
      addIndexEntries(); // Any indexes used below should be merged into a single index
    } else if (step.stage === 'OR') {
      // create seperate index recomendations for each step of the OR.
      // BUT - do we need to since there must be indexes already, right?
      // printjson("OR recomendations"); // eslint-disable-line
      orDetected = true;
    } else if (step.stage === 'COLLSCAN' || step.stage === 'FETCH') {
      // Create index for COLLSCAN or FETCH
     addIndexEntries();  // Shouldn't be index stages under COLLSCAN
      if ('filter' in step) {
        var filter = step.filter;
        var filterKeys = Object.keys(filter);
        if (filterKeys[0] === '$and' || filterKeys[0] === '$or') {
          var andFilters;
          if (filterKeys[0] === '$and') {
            // print('.... AND');
            andFilters = filter.$and;
          } else {
            // print('.... OR');
            andFilters = [];
            andFilters.push(filter.$or[0]); // Only first OR condition in index
          }
          andFilters.forEach(function(afilter) {
            Object.keys(afilter).forEach(function(akey) {
              indexEntries[akey] = 1;
            });
          });
        } else {
          // filter has no $and OR $or
          // TODO: Nested conditions will be hard to catch
          // print('.... NOT AND OR');
          // printjson(filterKeys);
          filterKeys.forEach(function(fkey) {
            indexEntries[fkey] = 1;
            // This must be a fetch from a previous IXSCAN so that will be
            // the most recent added to multiIndexes
              multiIndexes[multiIndexes.length - 1][fkey] = 1;
          });
        }
      }
    } else if (step.stage === 'IXSCAN') {
      multiIndexes.push(step.keyPattern);
      Object.keys(step.keyPattern).forEach(function(pattern) {
        existingIndexEntries[pattern] = 1;
      });
    } else if (step.stage === 'SORT') {
      // Add any previous index steps
      if (orDetected) {
        for (var mi = 0; mi < multiIndexes.length; mi += 1) {
          Object.keys(step.sortPattern).forEach(function(key) {
            multiIndexes[mi][key] = step.sortPattern[key];
          });
        }
      } else {
        Object.keys(step.sortPattern).forEach(function(key) {
          indexEntries[key] = step.sortPattern[key];
        });
        addIndexEntries();
      }

      // Create index for SORT
      Object.keys(step.sortPattern).forEach(function(key) {
        indexEntries[key] = step.sortPattern[key];
      });
    }
  };
  checkInputStage(explainPlan, 1);
  var returnValue = [];
  if (orDetected) returnValue = multiIndexes;
  else returnValue.push(indexEntries);
  return returnValue;
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
  db.system.profile; // eslint-disable-line
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

dbkInx.testPlans = function() {
  db.Sakila_films.dropIndexes(); // eslint-disable-line

  var explain = db.Sakila_films.
    explain().
    find({ Category: 'Documentary', Rating: 'PG' }).
    sort({ Length: 1 }).
    next();
  printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line

  db.Sakila_films.createIndex({ Category: 1 }); // eslint-disable-line

  explain = db.Sakila_films.
    explain().
    find({ Category: 'Documentary', Rating: 'PG' }).
    sort({ Length: 1 }).
    next();
 printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line

  db.Sakila_films.createIndex({ Rating: 1 }); // eslint-disable-line

  explain = db.Sakila_films.
    explain().
    find({ Category: 'Documentary', Rating: 'PG' }).
    sort({ Length: 1 }).
    next();
  printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line
  // print('ITERATING THROUGH ALL PLANS');
  explain.queryPlanner.rejectedPlans.forEach(function(plan) {
    // if (dbkInx.debug) printjson(plan);
    printjson(dbkInx.suggestIndexKeys(plan)); // eslint-disable-line
  });

  explain = db.Sakila_films.
    explain().
    find({ Category: 'Documentary', Rating: 'PG' }).
    next();
  // printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line
  explain = db.Sakila_films.
    explain().
    find({ $or: [{ Rating: 'PG' }, { Category: 'Family' }] }).
    next();
  printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line
  db.Sakila_films.createIndex({ Rating: 1 }); // eslint-disable-line
  db.Sakila_films.createIndex({ Category: 1 }); // eslint-disable-line
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
  printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line
  db.Sakila_films.dropIndexes(); // eslint-disable-line
};
