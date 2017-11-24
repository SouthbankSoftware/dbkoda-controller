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

var dbkInx = {};

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
    print(step.stage);
    if (step.stage === 'AND_SORTED') {
      addIndexEntries();
    } else if (step.stage === 'OR') {
      // create seperate index recomendations for each step of the OR.
      // BUT - do we need to since there must be indexes already, right?
      printjson('OR recomendations'); // eslint-disable-line
      if ('inputStages' in step) {
        step.inputStages.forEach(function(inputStage) {
          printjson(dbkInx.suggestIndexKeys(inputStage)); // eslint-disable-line
        });
      }
    } else if (step.stage === 'COLLSCAN' || step.stage === 'FETCH') {
      // Create index for COLLSCAN or FETCH
      addIndexEntries(); // only neccessary for FETCH but no harm done
      if ('filter' in step) {
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
      }
    } else if (step.stage === 'IXSCAN') {
      Object.keys(step.keyPattern).forEach(function(pattern) {
        existingIndexEntries[pattern] = 1;
      });
    } else if (step.stage === 'SORT') {
      // Add any previous index steps
      addIndexEntries();
      // Create index for SORT
      Object.keys(step.sortPattern).forEach(function(key) {
        indexEntries[key] = step.sortPattern[key];
      });
    }
  };
  checkInputStage(explainPlan, 1);
  return indexEntries;
};

dbkInx.adviseAllCachedPlans = function() {
  db.getCollectionNames().forEach(function(collectionName) { // eslint-disable-line
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
  db.system.profile // eslint-disable-line
    .find({
      op: 'query'
    })
    .forEach(function(profile) { // eslint-disable-line
      // eslint-disable-line
      // printjson(profile.query);
      // var indexKeys = dbkInx.suggestIndexKeys(profile.execStats);
      // printjson(indexKeys);
    });
};

dbkInx.testPlans = function() {
  db.Sakila_films.dropIndexes(); // eslint-disable-line

  var explain = db.Sakila_films // eslint-disable-line
    .explain()
    .find({ Category: 'Documentary', Rating: 'PG' })
    .sort({ Length: 1 })
    .next();
  printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line

  db.Sakila_films.createIndex({ Category: 1 }); // eslint-disable-line

  var explain = db.Sakila_films // eslint-disable-line
    .explain()
    .find({ Category: 'Documentary', Rating: 'PG' })
    .sort({ Length: 1 })
    .next();
  printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line

  db.Sakila_films.createIndex({ Rating: 1 }); // eslint-disable-line

  var explain = db.Sakila_films // eslint-disable-line
    .explain()
    .find({ Category: 'Documentary', Rating: 'PG' })
    .sort({ Length: 1 })
    .next();
  printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line
  explain.queryPlanner.rejectedPlans.forEach(function(plan) {
    printjson(dbkInx.suggestIndexKeys(plan)); // eslint-disable-line
  });

  var explain = db.Sakila_films // eslint-disable-line
    .explain()
    .find({ Category: 'Documentary', Rating: 'PG' })
    .next();
  printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line
  var explain = db.Sakila_films // eslint-disable-line
    .explain()
    .find({ $or: [{ Rating: 'PG' }, { Category: 'Family' }] })
    .next();
  printjson(dbkInx.suggestIndexKeys(explain.queryPlanner.winningPlan)); // eslint-disable-line

  db.Sakila_films.dropIndexes(); // eslint-disable-line
};
