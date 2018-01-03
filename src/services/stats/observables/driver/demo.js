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

const MongoNativeDriver = require('./index');

global.log = {
  info: msg => console.log(msg),
  error: msg => console.error(msg),
  debug: msg => console.debug(msg),
};
global.l = global.log;



const MongoClient = require('mongodb').MongoClient;

let url = 'mongodb://10.0.0.24:27019,10.0.0.24:27020,10.0.0.24:27021/admin?replicaSet=replset';
// url = 'mongodb://localhost'

MongoClient.connect(url, function(err, db) {
  if (err) throw err;

  const monitor = new MongoNativeDriver();
  monitor.samplingRate = 1000;
  monitor.init({mongoConnection: {driver: db, dbVersion: '3.6'}});
  monitor.rxObservable.subscribe(
    x => console.log('get sub ', JSON.stringify(x)),
    (e) => console.log('error ',e)
  );
});
