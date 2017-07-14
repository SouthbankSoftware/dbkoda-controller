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
/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */
/* eslint vars-on-top: 0 */

var dbeOps = {};

dbeOps.printCurrentOps = function (printZeroSecs, printInternalProcess) {
  // console.log(COps);
  var mydb = db.getSiblingDB('admin'); // eslint-disable-line
  var output = [];
  var result = {};
  var currentOps = mydb.currentOp();
  if (currentOps.hasOwnProperty('errmsg')) {
    output.push({'error':currentOps.errmsg});
  } else {
    var opArray = [];
    // print(clusterOps); print("+++++++++++++++"); print(JSON.stringify(currentOps));
    var inprog = currentOps.inprog;
    var server = currentOps.server;
    inprog.forEach(function(currentOp) {
      // printjson(currentOp);
      var secs = 0;

      if (currentOp.hasOwnProperty('secs_running')) {
        secs = currentOp.secs_running;
      }
      var myop = currentOp.op;
      const query = JSON.stringify(currentOp.query);
      if (query.length > 2) {
        myop = query;
      }
      opArray.push({server:server, desc: currentOp.desc, secs:secs, ns: currentOp.ns, op: myop, opid:currentOp.opid});
      //
    });

    opArray.sort(function(a, b) {
      // Sort in desc order of seconds active
      return b.secs - a.secs;
    });
    // printjson(opArray); // eslint-disable-line
    opArray.forEach(function(op) {
      if ((printZeroSecs === true || op.secs > 0) && (printInternalProcess === true || (op.desc !== 'rsBackgroundSync' && op.desc !== 'ReplBatcher' && op.desc !== 'rsSync' && op.desc !== 'WT RecordStoreThread: local.oplog.rs' && op.desc !== 'SyncSourceFeedback' && op.desc !== 'NoopWriter' && op.ns != 'local.oplog.rs'))) {
        output.push({
           'desc':op.desc, 'secs':op.secs, 'ns':op.ns, 'op':op.op, 'opid':op.opid});
      }
    });
  }
  result.ops = output;
  return result;
};

dbeOps.opForKillList = function () {
  var output = [];
  dbeOps.printCurrentOps(true, false).ops.forEach(function(op) {
    var outStr = op.opid + ' ' + op.secs + ' seconds running. ' + op.desc + ' ' + op.ns;
    output.push(outStr);
  });
  return (output);
};

dbeOps.killOp = function (opIdString) {
    var opid = opIdString.split(' ')[0];
    if (opid.indexOf(':') == -1) {
      opid = parseInt(opid); // eslint-disable-line
    }
    print('Issuing kill on ' + opid);
    var ret = db.killOp(opid); //eslint-disable-line
    printjson(ret); // eslint-disable-line 
};
