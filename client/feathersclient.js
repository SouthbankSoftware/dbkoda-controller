/**
 * @Author: joey
 * @Date:   2016-12-20T14:05:19+11:00
 * @Last modified by:   joey
 * @Last modified time: 2016-12-29T15:59:28+11:00
 */
const feathers = require('feathers-client');
const rest = require('feathers-rest/client');

// const socketio = require('feathers-socketio/client');
// const rest = require('feathers-rest/client');

// const hooks = require('feathers-hooks');
// const io = require('socket.io-client');
const Primus = require('../public/dist/primus.js');

const primus = new Primus('http://localhost:3030');
const app = feathers()
  .configure(feathers.hooks())
  .configure(feathers.primus(primus));

console.log('create mongo shell client');
const connect = app.service('/mongo-connection');
const shell = app.service('/mongo-shells');
const inspector = app.service('/mongo-inspector');
const syncShell = app.service('/mongo-sync-execution');
inspector.timeout = 3000;


connect.on('created', (msg) => {
  // console.log('get response from creating connection ', msg);
  //   setTimeout(() => {
  //     syncShell.update(msg.id, {'shellId': msg.shellId, 'commands': 'use m102;\nshow dbs\nshow collections;'})
  //       .then(v => console.log('get output ', v));
  //   }, 1000);
  // shell.create({id: msg.id})
  //   .then((value) => {
  //     console.log('create new shell ', value);
  //     shell.update(msg.id, {'shellId': value.shellId, 'commands': 'show dbs'})
  //       .then((vv) => {
  //         console.log('try to remove shell connection');
  //         shell.remove(msg.id, {query: {shellId: value.shellId}})
  //           .then(r => console.log('removed ', r));
  //       });
  //   });
  // inspector.get(msg.id)
  //   .then((value) => {
  //     console.log('get inspect result ', JSON.stringify(value));
  //   }).catch((err) => {
  //   console.error(err);
  // });
  // setTimeout(() => {
  //   shell.get(msg.id, {
  //     query: {
  //       shellId: msg.shellId,
  //       type: 'script',
  //       content: '/Users/joey/tmp/mongo.test'
  //     }
  //   });
  // }, 1000);
    // shell.update(msg.id, {'shellId': msg.shellId, 'commands': 'show dbs'});

  // setTimeout(() => {
  //   connect.remove(msg.id);
  // }, 2000);
});

connect.create({}, {
  query: {
    url: 'mongodb://localhost',
    ssl: false,
    test: false,
    authorization: true
  }
}).then((r) => {
    console.log('get response in then ', r);
    setTimeout(() => {
      shell.update(r.id, {'shellId': r.shellId, 'commands': getCommands()});
    }, 2000);
  })
  .catch((e) => {
    console.log('got error: ', e);
  });
shell.on('shell-output', (o) => {
  console.log(o);
});

const getCommands = () => {
  return "/*\n" +
    " * dbKoda - a modern, open source code editor, for MongoDB.\n" +
    " * Copyright (C) 2017-2018 Southbank Software\n" +
    " *\n" +
    " * This file is part of dbKoda.\n" +
    " *\n" +
    " * dbKoda is free software: you can redistribute it and/or modify\n" +
    " * it under the terms of the GNU Affero General Public License as\n" +
    " * published by the Free Software Foundation, either version 3 of the\n" +
    " * License, or (at your option) any later version.\n" +
    " *\n" +
    " * dbKoda is distributed in the hope that it will be useful,\n" +
    " * but WITHOUT ANY WARRANTY; without even the implied warranty of\n" +
    " * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n" +
    " * GNU Affero General Public License for more details.\n" +
    " *\n" +
    " * You should have received a copy of the GNU Affero General Public License\n" +
    " * along with dbKoda.  If not, see <http://www.gnu.org/licenses/>.\n" +
    " */\n" +
    "\n" +
    "//\n" +
    "\n" +
    "//\n" +
    "/* eslint no-var: 0 */\n" +
    "/* eslint no-prototype-builtins: 0 */\n" +
    "/* eslint camelcase: 0 */\n" +
    "/* eslint prefer-arrow-callback: 0 */\n" +
    "/* eslint object-shorthand: 0 */\n" +
    "/* eslint vars-on-top: 0 */\n" +
    "\n" +
    "// Structure and function to store aggregate builder data in the shell\n" +
    "var dbk_agg = {};\n" +
    "dbk_agg.aggregates = {};\n" +
    "\n" +
    "dbk_agg.aggId = 0;\n" +
    "dbk_agg.sampleSize = 100; // No of rows we sample by default\n" +
    "dbk_agg.debug = false;\n" +
    "\n" +
    "// Returns a new identifier for the aggregate builder\n" +
    "dbk_agg.newAggBuilder = function (dbName, collectionName) {\n" +
    "  dbk_agg.aggId += 1;\n" +
    "  var newAgg = {};\n" +
    "  newAgg.dbName = dbName;\n" +
    "  newAgg.collectionName = collectionName;\n" +
    "  newAgg.steps = [];\n" +
    "  newAgg.steps[0] = {\n" +
    "    $sample: {\n" +
    "      size: dbk_agg.sampleSize\n" +
    "    }\n" +
    "  };\n" +
    "  newAgg.stepResults = [];\n" +
    "  newAgg.stepAttributes = [];\n" +
    "  newAgg.stepCodes = [0];\n" +
    "  dbk_agg.aggregates[dbk_agg.aggId] = newAgg;\n" +
    "  dbk_agg.getAttributes(dbk_agg.aggId, 0, true);\n" +
    "  if (dbk_agg.debug) print('nagb aggId=' + dbk_agg.aggId);\n" +
    "  return {\n" +
    "    id: dbk_agg.aggId\n" +
    "  };\n" +
    "};\n" +
    "\n" +
    "dbk_agg.getAggStatus = function (aggId) {\n" +
    "  var output = {};\n" +
    "  var agg = dbk_agg.aggregates[aggId];\n" +
    "  output.stepCodes = agg.stepCodes;\n" +
    "  output.steps = agg.steps;\n" +
    "  output.stepAttributes = agg.stepAttributes;\n" +
    "  return output;\n" +
    "};\n" +
    "// add a new step\n" +
    "dbk_agg.addStep = function (aggId, stepJson) {\n" +
    "  dbk_agg.aggregates[aggId].steps.push(stepJson);\n" +
    "  var stepId = dbk_agg.aggregates[aggId].steps.length;\n" +
    "  dbk_agg.getAttributes(aggId, stepId, true);\n" +
    "};\n" +
    "\n" +
    "// Delete a step and move all steps above down\n" +
    "dbk_agg.removeStep = function (aggId, stepId) {\n" +
    "  var agg = dbk_agg.aggregates[aggId];\n" +
    "  var steps = agg.steps;\n" +
    "  var nsteps = steps.length;\n" +
    "  for (var step = stepId; step <= steps.length; step += 1) {\n" +
    "    if (step < nsteps - 1) steps[step] = steps[step + 1];\n" +
    "  }\n" +
    "  steps = steps.slice(0, -1);\n" +
    "  agg.stepResults = agg.stepResults.slice(0, -1);\n" +
    "  agg.stepAttributes = agg.stepAttributes.slice(0, -1);\n" +
    "  agg.stepCodes = agg.stepCodes.slice(0, -1);\n" +
    "  dbk_agg.aggregates[aggId].steps = steps;\n" +
    "  return steps;\n" +
    "};\n" +
    "// return current status of all steps\n" +
    "dbk_agg.getStep = function (aggId, stepId) {\n" +
    "  return dbk_agg.aggregates[aggId].steps[stepId];\n" +
    "};\n" +
    "// Set/Replace all steps\n" +
    "// If preserve is set to true, then we don't delete any existing steps\n" +
    "dbk_agg.setAllSteps = function (aggId, stepArray, preserve) {\n" +
    "  if (preserve === 'undefined') {\n" +
    "    preserve = false;\n" +
    "  }\n" +
    "\n" +
    "  var oldLen = dbk_agg.aggregates[aggId].steps.length - 1;\n" +
    "  var newLen = stepArray.length;\n" +
    "  var ind;\n" +
    "  var oldStep;\n" +
    "  if (dbk_agg.debug) print('oldLen=' + oldLen + ' newLen=' + newLen);\n" +
    "  // Replace existing steps\n" +
    "  for (var stepId = 1; stepId <= newLen; stepId += 1) {\n" +
    "    if (dbk_agg.debug) print('step ' + stepId);\n" +
    "    ind = stepId - 1; // incomming array does not include first hidden step\n" +
    "    oldStep = dbk_agg.aggregates[aggId].steps[stepId];\n" +
    "    if (dbk_agg.debug) print('oldStep=' + oldStep);\n" +
    "    var newStep = stepArray[ind];\n" +
    "    if (oldStep !== newStep) {\n" +
    "      if (dbk_agg.debug) print('step has changed');\n" +
    "      dbk_agg.aggregates[aggId].steps[stepId] = newStep;\n" +
    "      dbk_agg.getAttributes(aggId, stepId, true);\n" +
    "    }\n" +
    "  }\n" +
    "  if (dbk_agg.debug) print('done');\n" +
    "  // Trim any other steps\n" +
    "  if (!preserve) {\n" +
    "    if (newLen < oldLen) {\n" +
    "      for (var indx = oldLen; indx > newLen; indx -= 1) {\n" +
    "        if (dbk_agg.debug) print('removing redunant step ' + indx);\n" +
    "        dbk_agg.removeStep(aggId, indx);\n" +
    "      }\n" +
    "    }\n" +
    "  }\n" +
    "};\n" +
    "\n" +
    "// Is the step a valid BSON object?\n" +
    "dbk_agg.validateStep = function (step) {\n" +
    "  var returnval={};\n" +
    "  returnval.type=typeof step;\n" +
    "  return (returnval);\n" +
    "};\n" +
    "\n" +
    "// get the results for all steps up to an including the\n" +
    "// current step.\n" +
    "// TODO: Caching\n" +
    "// (Do caching by remembering results and the pipeline that geneated them,\n" +
    "//   if pipeline changes, regenerate automatically )\n" +
    "//\n" +
    "\n" +
    "dbk_agg.getResults = function (aggId, stepId, reset) {\n" +
    "  var agg = dbk_agg.aggregates[aggId];\n" +
    "  var results = [];\n" +
    "  var error = 0;\n" +
    "  if (reset === true) {\n" +
    "    if (dbk_agg.debug) print('reseting results');\n" +
    "    var partialPipeline = agg.steps.slice(0, stepId + 1);\n" +
    "    if (dbk_agg.debug) printjson(partialPipeline); // eslint-disable-line\n" +
    "    mydb = db.getSiblingDB(agg.dbName); // eslint-disable-line\n" +
    "    try {\n" +
    "      results = mydb // eslint-disable-line\n" +
    "        .getCollection(agg.collectionName)\n" +
    "        .aggregate(partialPipeline)\n" +
    "        .toArray();\n" +
    "    } catch (err) {\n" +
    "      error = err.code;\n" +
    "    }\n" +
    "    // var subset = results.slice(0, 10);\n" +
    "\n" +
    "    dbk_agg.aggregates[aggId].stepResults[stepId] = results;\n" +
    "    if (dbk_agg.debug) print('result len', dbk_agg.aggregates[aggId].stepResults[stepId].length);\n" +
    "\n" +
    "    dbk_agg.aggregates[aggId].stepCodes[stepId] = error;\n" +
    "  } else {\n" +
    "    results = dbk_agg.aggregates[aggId].stepResults[stepId];\n" +
    "  }\n" +
    "\n" +
    "  return results;\n" +
    "};\n" +
    "\n" +
    "dbk_agg.attributesFromArray = function (data) {\n" +
    "  //\n" +
    "  // Quick sampling of a collection to return attribute names\n" +
    "  // TODO: Support deeper nesting\n" +
    "  //\n" +
    "  var attributes = {};\n" +
    "  var obj;\n" +
    "  var docarray;\n" +
    "  var results;\n" +
    "\n" +
    "  data.forEach(function (doc) {\n" +
    "    Object.keys(doc).forEach(function (key) {\n" +
    "      var keytype = typeof doc[key];\n" +
    "      // print(key);\n" +
    "      // print(keytype);\n" +
    "      // print(doc[key]);\n" +
    "      if (doc[key]) {\n" +
    "        if (doc[key].constructor === Array) {\n" +
    "          keytype = 'array';\n" +
    "        }\n" +
    "      }\n" +
    "      attributes[key] = keytype;\n" +
    "      if (keytype == 'object') {\n" +
    "        obj = doc[key];\n" +
    "        if (obj) {\n" +
    "          Object.keys(obj).forEach(function (nestedKey) {\n" +
    "            attributes[key + '.' + nestedKey] = typeof obj[nestedKey];\n" +
    "          });\n" +
    "        }\n" +
    "      } else if (keytype === 'array') {\n" +
    "        docarray = doc[key];\n" +
    "        docarray.forEach(function (nestedDoc) {\n" +
    "          var obj = nestedDoc;\n" +
    "          Object.keys(obj).forEach(function (nestedKey) {\n" +
    "            attributes[key + '.' + nestedKey] = typeof obj[nestedKey];\n" +
    "          });\n" +
    "        });\n" +
    "      }\n" +
    "    });\n" +
    "  });\n" +
    "  // printjson(attributes);\n" +
    "  results = Object.keys(attributes);\n" +
    "  // printjson(results);\n" +
    "  // console.log('listAttributes returning ' + results.length);\n" +
    "  return results.sort();\n" +
    "};\n" +
    "\n" +
    "// Get the attributes for a given step\n" +
    "// TODO: Caching\n" +
    "// TODO: During execution, save any errors into a sturcutre\n" +
    "//       that the front end can read\n" +
    "dbk_agg.getAttributes = function (aggId, stepId, reset) {\n" +
    "  var attributes;\n" +
    "  if (reset) {\n" +
    "    var inputData = dbk_agg.getResults(aggId, stepId, reset);\n" +
    "    dbk_agg.aggregates[aggId].stepResults[stepId] = inputData.slice(0, 20); // Limit max documents here\n" +
    "    if (dbk_agg.debug) printjson(inputData[0]); // eslint-disable-line\n" +
    "    attributes = dbk_agg.attributesFromArray(inputData);\n" +
    "    dbk_agg.aggregates[aggId].stepAttributes[stepId] = attributes;\n" +
    "  } else {\n" +
    "    attributes = dbk_agg.aggregates[aggId].stepAttributes[stepId];\n" +
    "  }\n" +
    "  return attributes;\n" +
    "};\n" +
    "\n" +
    "//\n" +
    "//  Create Some test data\n" +
    "//\n" +
    "dbk_agg.testData = function () {\n" +
    "  print('starting');\n" +
    "  var myAgg = dbk_agg.newAggBuilder('SampleCollections', 'Sakila_films').id;\n" +
    "  print('aggId=' + myAgg);\n" +
    "  var steps1 = [{\n" +
    "    $match: {\n" +
    "      Rating: 'R'\n" +
    "    }\n" +
    "  }, {\n" +
    "    $group: {\n" +
    "      _id: {\n" +
    "        Category: '$Category',\n" +
    "      },\n" +
    "      count: {\n" +
    "        $sum: 1\n" +
    "      },\n" +
    "      'Length-sum': {\n" +
    "        $sum: '$Length'\n" +
    "      },\n" +
    "    },\n" +
    "  }, {\n" +
    "    $sort: {\n" +
    "      'Length-sum': -1\n" +
    "    }\n" +
    "  }];\n" +
    "  dbk_agg.setAllSteps(myAgg, steps1);\n" +
    "  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'Sakila_films').id;\n" +
    "  var steps2 = [{\n" +
    "    $unwind: '$Actors'\n" +
    "  }];\n" +
    "  dbk_agg.setAllSteps(myAgg, steps2);\n" +
    "\n" +
    "  var bigSteps = [ // eslint-disable-line\n" +
    "    {\n" +
    "      $match: {\n" +
    "        orderStatus: 'C'\n" +
    "      }\n" +
    "    },\n" +
    "    {\n" +
    "      $project: {\n" +
    "        CustId: 1,\n" +
    "        lineItems: 1,\n" +
    "      },\n" +
    "    },\n" +
    "    {\n" +
    "      $unwind: '$lineItems'\n" +
    "    },\n" +
    "    {\n" +
    "      $group: {\n" +
    "        _id: {\n" +
    "          CustId: '$CustId',\n" +
    "          ProdId: '$lineItems.prodId',\n" +
    "        },\n" +
    "        prodCount: {\n" +
    "          $sum: '$lineItems.prodCount'\n" +
    "        },\n" +
    "        prodCost: {\n" +
    "          $sum: '$lineItems.Cost'\n" +
    "        },\n" +
    "      },\n" +
    "    },\n" +
    "    {\n" +
    "      $sort: {\n" +
    "        prodCost: -1\n" +
    "      }\n" +
    "    },\n" +
    "    {\n" +
    "      $limit: 10\n" +
    "    },\n" +
    "    {\n" +
    "      $lookup: {\n" +
    "        from: 'DBEnvyLoad_customers',\n" +
    "        as: 'c',\n" +
    "        localField: '_id.CustId',\n" +
    "        foreignField: '_id',\n" +
    "      },\n" +
    "    },\n" +
    "    {\n" +
    "      $lookup: {\n" +
    "        from: 'DBEnvyLoad_products',\n" +
    "        as: 'p',\n" +
    "        localField: '_id.ProdId',\n" +
    "        foreignField: '_id',\n" +
    "      },\n" +
    "    },\n" +
    "    {\n" +
    "      $unwind: '$p'\n" +
    "    },\n" +
    "    {\n" +
    "      $unwind: '$c'\n" +
    "    }, // Get rid of single element arrays\n" +
    "    {\n" +
    "      $project: {\n" +
    "        Customer: '$c.CustomerName',\n" +
    "        Product: '$p.ProductName',\n" +
    "        prodCount: 1,\n" +
    "        prodCost: 1,\n" +
    "        _id: 0,\n" +
    "      },\n" +
    "    },\n" +
    "  ];\n" +
    "  var smallSteps = [ // eslint-disable-line\n" +
    "    {\n" +
    "      $match: {\n" +
    "        Rating: 'R'\n" +
    "      }\n" +
    "    },\n" +
    "    {\n" +
    "      $group: {\n" +
    "        _id: {\n" +
    "          Category: '$Category',\n" +
    "        },\n" +
    "        count: {\n" +
    "          $sum: 1\n" +
    "        },\n" +
    "      },\n" +
    "    },\n" +
    "  ];\n" +
    "  print('setall 1');\n" +
    "  dbk_agg.setAllSteps(myAgg, bigSteps);\n" +
    "  print('setall 2');\n" +
    "  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'DBEnvyLoad_orders').id;\n" +
    "  dbk_agg.setAllSteps(myAgg, smallSteps);\n" +
    "  print('after smallSteps count=' + dbk_agg.aggregates[myAgg].steps.length);\n" +
    "  print('smallSteps=' + smallSteps.length);\n" +
    "  dbk_agg.setAllSteps(myAgg, bigSteps);\n" +
    "\n" +
    "  print('setall 3');\n" +
    "  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'DBEnvyLoad_orders').id;\n" +
    "  // dbk_agg.setAllSteps(myAgg, bigSteps);\n" +
    "  // dbk_agg.setAllSteps(myAgg, smallSteps);\n" +
    "  var badSteps = [{\n" +
    "      $batch: {\n" +
    "        Rating: 'R'\n" +
    "      }\n" +
    "    },\n" +
    "    {\n" +
    "      $group: {\n" +
    "        _id: {\n" +
    "          Category: '$Category',\n" +
    "        },\n" +
    "        count: {\n" +
    "          $sum: 1\n" +
    "        },\n" +
    "      },\n" +
    "    },\n" +
    "  ];\n" +
    "  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'DBEnvyLoad_orders').id;\n" +
    "  dbk_agg.setAllSteps(myAgg, badSteps);\n" +
    "  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'Sakila_films').id;\n" +
    "  steps2 = [{\n" +
    "      '$sample': {\n" +
    "        'size': 100\n" +
    "      }\n" +
    "    },\n" +
    "    {\n" +
    "      '$group': {\n" +
    "        '_id': {\n" +
    "          'Rating': '$Rating'\n" +
    "        },\n" +
    "        'count': {\n" +
    "          '$sum': 1\n" +
    "        },\n" +
    "        'Length-sum': {\n" +
    "          '$sum': '$Length'\n" +
    "        }\n" +
    "      }\n" +
    "    }\n" +
    "  ];\n" +
    "  dbk_agg.setAllSteps(myAgg, steps2);\n" +
    "  print(myAgg);\n" +
    "  myAgg = dbk_agg.newAggBuilder('SampleCollections', 'DBEnvyLoad_orders').id;\n" +
    "  dbk_agg.setAllSteps(myAgg, smallSteps);\n" +
    "\n" +
    "  assert(dbk_agg.aggregates[myAgg].steps.length === smallSteps.length + 1, 'steps should be equal to smallsteps'); // eslint-disable-line\n" +
    "  dbk_agg.setAllSteps(myAgg, bigSteps);\n" +
    "  assert(dbk_agg.aggregates[myAgg].steps.length === bigSteps.length + 1, 'steps should be equal to smallsteps'); // eslint-disable-line\n" +
    "  dbk_agg.setAllSteps(myAgg, smallSteps);\n" +
    "  assert(dbk_agg.aggregates[myAgg].steps.length === smallSteps.length + 1, 'steps should be equal to smallsteps'); // eslint-disable-line\n" +
    "  dbk_agg.setAllSteps(myAgg, bigSteps);\n" +
    "  dbk_agg.setAllSteps(myAgg, smallSteps, true);\n" +
    "  assert(dbk_agg.aggregates[myAgg].steps.length === bigSteps.length + 1, 'steps should be equal to bigsteps'); // eslint-disable-line\n" +
    "};\n";
}
