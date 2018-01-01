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
dbk_agg.debug = false;

// Returns a new identifier for the aggregate builder
dbk_agg.newAggBuilder = function(dbName, collectionName) {
  dbk_agg.aggId += 1;
  var newAgg = {};
  newAgg.dbName = dbName;
  newAgg.collectionName = collectionName;
  newAgg.steps = [];
  // If version is above 3.2
  if (
    db.version().match(/^([012]|3.0|3.1).*/gim) ||
    version().match(/^([012]|3.0|3.1).*/gim)
  ) {
    newAgg.steps[0] = {
      $limit: dbk_agg.sampleSize
    };
  } else {
    newAgg.steps[0] = {
      $sample: {
        size: dbk_agg.sampleSize
      }
    };
  }

  newAgg.stepResults = [];
  newAgg.stepAttributes = [];
  newAgg.stepCodes = [0];
  dbk_agg.aggregates[dbk_agg.aggId] = newAgg;
  dbk_agg.getAttributes(dbk_agg.aggId, 0, true);
  if (dbk_agg.debug) print('nagb aggId=' + dbk_agg.aggId);
  return {
    id: dbk_agg.aggId
  };
};

dbk_agg.getAggStatus = function(aggId) {
  var output = {};
  var agg = dbk_agg.aggregates[aggId];
  output.stepCodes = agg.stepCodes;
  output.steps = agg.steps;
  output.stepAttributes = agg.stepAttributes;
  return output;
};
// add a new step
dbk_agg.addStep = function(aggId, stepJson) {
  dbk_agg.aggregates[aggId].steps.push(stepJson);
  var stepId = dbk_agg.aggregates[aggId].steps.length;
  dbk_agg.getAttributes(aggId, stepId, true);
};

// Delete a step and move all steps above down
dbk_agg.removeStep = function(aggId, stepId) {
  var agg = dbk_agg.aggregates[aggId];
  var steps = agg.steps;
  var nsteps = steps.length;
  for (var step = stepId; step <= steps.length; step += 1) {
    if (step < nsteps - 1) steps[step] = steps[step + 1];
  }
  steps = steps.slice(0, -1);
  agg.stepResults = agg.stepResults.slice(0, -1);
  agg.stepAttributes = agg.stepAttributes.slice(0, -1);
  agg.stepCodes = agg.stepCodes.slice(0, -1);
  dbk_agg.aggregates[aggId].steps = steps;
  return steps;
};
// return current status of all steps
dbk_agg.getStep = function(aggId, stepId) {
  return dbk_agg.aggregates[aggId].steps[stepId];
};
// Set/Replace all steps
// If preserve is set to true, then we don't delete any existing steps
dbk_agg.setAllSteps = function(aggId, stepArray, preserve) {
  if (preserve === 'undefined') {
    preserve = false;
  }

  var oldLen = dbk_agg.aggregates[aggId].steps.length - 1;
  var newLen = stepArray.length;
  var ind;
  var oldStep;
  if (dbk_agg.debug) print('oldLen=' + oldLen + ' newLen=' + newLen);
  // Replace existing steps
  for (var stepId = 1; stepId <= newLen; stepId += 1) {
    if (dbk_agg.debug) print('step ' + stepId);
    ind = stepId - 1; // incomming array does not include first hidden step
    oldStep = dbk_agg.aggregates[aggId].steps[stepId];
    if (dbk_agg.debug) print('oldStep=' + oldStep);
    var newStep = stepArray[ind];
    if (oldStep !== newStep) {
      if (dbk_agg.debug) print('step has changed');
      dbk_agg.aggregates[aggId].steps[stepId] = newStep;
      dbk_agg.getAttributes(aggId, stepId, true);
    }
  }
  if (dbk_agg.debug) print('done');
  // Trim any other steps
  if (!preserve) {
    if (newLen < oldLen) {
      for (var indx = oldLen; indx > newLen; indx -= 1) {
        if (dbk_agg.debug) print('removing redunant step ' + indx);
        dbk_agg.removeStep(aggId, indx);
      }
    }
  }
};

// Is the step a valid BSON object?
dbk_agg.validateStep = function(step) {
  var returnval = {};
  returnval.type = typeof step;
  return returnval;
};

// get the results for all steps up to an including the
// current step.
// TODO: Caching
// (Do caching by remembering results and the pipeline that geneated them,
//   if pipeline changes, regenerate automatically )
//

dbk_agg.getResults = function(aggId, stepId, reset) {
  var agg = dbk_agg.aggregates[aggId];
  var results = [];
  var error = 0;
  if (reset === true) {
    if (dbk_agg.debug) print('reseting results');
    var partialPipeline = agg.steps.slice(0, stepId + 1);
    if (dbk_agg.debug) printjson(partialPipeline); // eslint-disable-line
    mydb = db.getSiblingDB(agg.dbName); // eslint-disable-line
    try {
      results = mydb // eslint-disable-line
        .getCollection(agg.collectionName)
        .aggregate(partialPipeline)
        .toArray();
    } catch (err) {
      error = err.code;
    }
    // var subset = results.slice(0, 10);

    dbk_agg.aggregates[aggId].stepResults[stepId] = results;
    if (dbk_agg.debug) {
      print('result len', dbk_agg.aggregates[aggId].stepResults[stepId].length);
    }

    dbk_agg.aggregates[aggId].stepCodes[stepId] = error;
  } else {
    results = dbk_agg.aggregates[aggId].stepResults[stepId];
  }

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
dbk_agg.getAttributes = function(aggId, stepId, reset) {
  var attributes;
  if (reset) {
    var inputData = dbk_agg.getResults(aggId, stepId, reset);
    dbk_agg.aggregates[aggId].stepResults[stepId] = inputData.slice(0, 20); // Limit max documents here
    if (dbk_agg.debug) printjson(inputData[0]); // eslint-disable-line
    attributes = dbk_agg.attributesFromArray(inputData);
    dbk_agg.aggregates[aggId].stepAttributes[stepId] = attributes;
  } else {
    attributes = dbk_agg.aggregates[aggId].stepAttributes[stepId];
  }
  return attributes;
};

//
//  Create Some test data
//
dbk_agg.testData = function() {
  print('starting');
  var myAgg = dbk_agg.newAggBuilder('SampleCollections', 'Sakila_films').id;
  print('aggId=' + myAgg);
  var steps1 = [
    {
      $match: {
        Rating: 'R'
      }
    },
    {
      $group: {
        _id: {
          Category: '$Category'
        },
        count: {
          $sum: 1
        },
        'Length-sum': {
          $sum: '$Length'
        }
      }
    },
    {
      $sort: {
        'Length-sum': -1
      }
    }
  ];
  dbk_agg.setAllSteps(myAgg, steps1);
  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'Sakila_films').id;
  var steps2 = [
    {
      $unwind: '$Actors'
    }
  ];
  dbk_agg.setAllSteps(myAgg, steps2);

  var bigSteps = [
    // eslint-disable-line
    {
      $match: {
        orderStatus: 'C'
      }
    },
    {
      $project: {
        CustId: 1,
        lineItems: 1
      }
    },
    {
      $unwind: '$lineItems'
    },
    {
      $group: {
        _id: {
          CustId: '$CustId',
          ProdId: '$lineItems.prodId'
        },
        prodCount: {
          $sum: '$lineItems.prodCount'
        },
        prodCost: {
          $sum: '$lineItems.Cost'
        }
      }
    },
    {
      $sort: {
        prodCost: -1
      }
    },
    {
      $limit: 10
    },
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
    {
      $unwind: '$p'
    },
    {
      $unwind: '$c'
    }, // Get rid of single element arrays
    {
      $project: {
        Customer: '$c.CustomerName',
        Product: '$p.ProductName',
        prodCount: 1,
        prodCost: 1,
        _id: 0
      }
    }
  ];
  var smallSteps = [
    // eslint-disable-line
    {
      $match: {
        Rating: 'R'
      }
    },
    {
      $group: {
        _id: {
          Category: '$Category'
        },
        count: {
          $sum: 1
        }
      }
    }
  ];
  print('setall 1');
  dbk_agg.setAllSteps(myAgg, bigSteps);
  print('setall 2');
  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'DBEnvyLoad_orders').id;
  dbk_agg.setAllSteps(myAgg, smallSteps);
  print('after smallSteps count=' + dbk_agg.aggregates[myAgg].steps.length);
  print('smallSteps=' + smallSteps.length);
  dbk_agg.setAllSteps(myAgg, bigSteps);

  print('setall 3');
  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'DBEnvyLoad_orders').id;
  // dbk_agg.setAllSteps(myAgg, bigSteps);
  // dbk_agg.setAllSteps(myAgg, smallSteps);
  var badSteps = [
    {
      $batch: {
        Rating: 'R'
      }
    },
    {
      $group: {
        _id: {
          Category: '$Category'
        },
        count: {
          $sum: 1
        }
      }
    }
  ];
  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'DBEnvyLoad_orders').id;
  dbk_agg.setAllSteps(myAgg, badSteps);
  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'Sakila_films').id;
  steps2 = [
    {
      $sample: {
        size: 100
      }
    },
    {
      $group: {
        _id: {
          Rating: '$Rating'
        },
        count: {
          $sum: 1
        },
        'Length-sum': {
          $sum: '$Length'
        }
      }
    }
  ];
  dbk_agg.setAllSteps(myAgg, steps2);
  print(myAgg);
  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'DBEnvyLoad_orders').id;
  dbk_agg.setAllSteps(myAgg, smallSteps);

  assert(
    dbk_agg.aggregates[myAgg].steps.length === smallSteps.length + 1,
    'steps should be equal to smallsteps'
  ); // eslint-disable-line
  dbk_agg.setAllSteps(myAgg, bigSteps);
  assert(
    dbk_agg.aggregates[myAgg].steps.length === bigSteps.length + 1,
    'steps should be equal to smallsteps'
  ); // eslint-disable-line
  dbk_agg.setAllSteps(myAgg, smallSteps);
  assert(
    dbk_agg.aggregates[myAgg].steps.length === smallSteps.length + 1,
    'steps should be equal to smallsteps'
  ); // eslint-disable-line
  dbk_agg.setAllSteps(myAgg, bigSteps);
  dbk_agg.setAllSteps(myAgg, smallSteps, true);
  assert(
    dbk_agg.aggregates[myAgg].steps.length === bigSteps.length + 1,
    'steps should be equal to bigsteps'
  ); // eslint-disable-line
};
