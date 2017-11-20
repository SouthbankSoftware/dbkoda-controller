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

var dbkInx={};

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
