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

//
/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */
/* eslint vars-on-top: 0 */

// Structure and function to store aggregate builder data in the shell
var dbk_agg = {};
dbk_agg.aggregates = {};

dbk_agg.aggId = 0;
dbk_agg.sampleSize = 100; // No of rows we sample by default

// Returns a new identifier for the aggregate builder
dbk_agg.newAggBuilder = function(dbName, collectionName) {
  dbk_agg.aggId += 1;
  var newAgg = {};
  newAgg.dbName = dbName;
  newAgg.collectionName = collectionName;
  newAgg.steps = [];
  newAgg.steps[0] = { $sample: { size: dbk_agg.sampleSize } };
  newAgg.stepResults = [];
  newAgg.stepAttributes = [];
  dbk_agg.aggregates[dbk_agg.aggId] = newAgg;
  return dbk_agg.aggId;
};

//
// Resets all caches and existings steps
//
dbk_agg.resetAgg = function(aggId) {
  dbk_agg.aggregates[aggId].stepResults = [];
  dbk_agg.aggregates[aggId].stepAttributes = [];
  dbk_agg.steps = [];
};
// add a new step
dbk_agg.addStep = function(aggId, stepJson) {
  dbk_agg.aggregates[aggId].steps.push(stepJson);
};
// insert a step in the middle
dbk_agg.insertStep = function(aggId, stepId, stepJson) {
  print(aggId, stepId, stepJson);
  // TODO:  todo
};
//  Replace an existing step
dbk_agg.replaceStep = function(aggId, stepId, stepJson) {
  dbk_agg.aggregates[aggId].steps[stepId] = stepJson;
  // TODO: IFstep is different
    // rebuid cache of results and attributes
    // return FALSE if the step is not valid \
};
// Delete a step and move all steps above down
dbk_agg.removeStep = function(aggId, stepId) {
  var steps = dbk_agg.aggregates[aggId].steps;
  var nsteps = steps.length;
  for (var step = stepId; step <= steps.length; step += 1) {
    if (step < nsteps - 1) steps[step] = steps[step + 1];
  }
  steps = steps.slice(0, -1);
  dbk_agg.aggregates[aggId].steps = steps;
  return steps;
};
// return current status of all steps
dbk_agg.removeStep = function(aggId, stepId) {
  print(stepId);
};

// Set/Replace all steps
dbk_agg.setAllSteps = function(aggId, stepArray) {
  dbk_agg.aggregates[aggId].steps = stepArray;
};

// get the results for all steps up to an including the
// current step.
// TODO: Caching
// (Do caching by remembering results and the pipeline that geneated them,
//   if pipeline changes, regenerate automatically )
//

dbk_agg.getResults = function(aggId, stepId) {
  var agg = dbk_agg.aggregates[aggId];
  var results = [];

  var partialPipeline = agg.steps.slice(0, stepId + 1);
  results = db.getSiblingDB(agg.dbName) // eslint-disable-line
    .getCollection(agg.collectionName)
    .aggregate(partialPipeline)
    .toArray();
  dbk_agg.aggregates[aggId].stepResults[stepId] = results;
  // printjson(partialPipeline);

  return results;
};
dbk_agg.attributesFromArray = function(data) {
  //
  // Quick sampling of a collection to return attribute names
  // TODO: Support deeper nesting
  //
  var attributes = {};
  var obj;
  var docarray;
  var results;

  data.forEach(function(doc) {
    Object.keys(doc).forEach(function(key) {
      var keytype = typeof doc[key];
      // print(key);
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
      } else if (keytype === 'array') {
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
  // printjson(attributes);
  results = Object.keys(attributes);
  // printjson(results);
  // console.log('listAttributes returning ' + results.length);
  return results.sort();
};

// Get the attributes for a given step
// TODO: Caching
// TODO: During execution, save any errors into a sturcutre
//       that the front end can read
dbk_agg.getAttributes = function(aggId, stepId) {
  var inputData = dbk_agg.getResults(aggId, stepId);
  // printjson(inputData[0]);
  var attributes = dbk_agg.attributesFromArray(inputData);
  return attributes;
};

//
//  Create Some test data
//
dbk_agg.testData = function() {
  var myAgg = dbk_agg.newAggBuilder('SampleCollections', 'Sakila_films');
  dbk_agg.addStep(myAgg, { $match: { Rating: 'R' } });
  dbk_agg.addStep(myAgg, {
    $group: {
      _id: {
        Category: '$Category'
      },
      count: { $sum: 1 },
      'Length-sum': { $sum: '$Length' }
    }
  });

  dbk_agg.addStep(myAgg, { $sort: { 'Length-sum': -1 } });
  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'Sakila_films');
  dbk_agg.addStep(myAgg, { $unwind: '$Actors' });
  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'DBEnvyLoad_orders');
  dbk_agg.setAllSteps(myAgg, [
    { $match: { orderStatus: 'C' } },
    {
      $project: {
        CustId: 1,
        lineItems: 1
      }
    },
    { $unwind: '$lineItems' },
    {
      $group: {
        _id: {
          CustId: '$CustId',
          ProdId: '$lineItems.prodId'
        },
        prodCount: { $sum: '$lineItems.prodCount' },
        prodCost: { $sum: '$lineItems.Cost' }
      }
    },
    { $sort: { prodCost: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'DBEnvyLoad_customers',
        as: 'c',
        localField: '_id.CustId',
        foreignField: '_id'
      }
    },
    {
      $lookup: {
        from: 'DBEnvyLoad_products',
        as: 'p',
        localField: '_id.ProdId',
        foreignField: '_id'
      }
    },
    { $unwind: '$p' },
    { $unwind: '$c' }, // Get rid of single element arrays
    {
      $project: {
        Customer: '$c.CustomerName',
        Product: '$p.ProductName',
        prodCount: 1,
        prodCost: 1,
        _id: 0
      }
    }
  ]);
};


