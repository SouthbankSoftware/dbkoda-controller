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
/**
 * Created by joey on 2/1/18.
 */


/* eslint-disable */

import {getKnowledgeBaseRules} from '../../knowledgeBase/driver';
import flat from 'flat';
import _ from 'lodash';

const MongoNativeDriver = require('./index');

global.log = {
  info: msg => console.log(msg),
  error: msg => console.error(msg),
  debug: msg => console.debug(msg),
};
global.l = global.log;



const MongoClient = require('mongodb').MongoClient;

let url = 'mongodb://10.0.0.24:27019,10.0.0.24:27020,10.0.0.24:27021/admin?replicaSet=replset';
url = 'mongodb://localhost:27016';
// url = 'mongodb://10.0.0.25:40011';  // 3.4
// url = 'mongodb://10.0.0.25:40012';  // 3.0
// url = 'mongodb://10.0.0.25:40013';  // 3.2
// url = 'mongodb://10.0.0.25:40014';  // 3.6

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  // db.admin().command({serverStatus: 1}, {}, (err, data) => {
  //   _.forOwn(flat(data), (v, k) => {
  //     console.log(k);
  //   });
  // });
  const monitor = new MongoNativeDriver();
  monitor.samplingRate = 5000;
  monitor.init({mongoConnection: {driver: db, dbVersion: '3.6'}});
  monitor.rxObservable.subscribe(
    x => console.log('get sub ', JSON.stringify(x)),
    (e) => console.log('error ',e)
  );
});
