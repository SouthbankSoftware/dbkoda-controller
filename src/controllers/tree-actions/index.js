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
 * Created by joey on 7/7/17.
 */

const _ = require('lodash');


const findAttributes = (db, params) => {
  log.debug('try to find attribute on ', params);
  const collection = params.collection;
  return new Promise((resolve, reject) => {
    db.db(params.db).collection(collection, (err, col) => {
      if (err) {
        reject('Cant find the collection', collection);
      }
      col.find().limit(20).toArray((err, docs) => {
        log.debug('find document ', docs.length);
        let merged = {};
        docs.map((doc) => {
          log.debug('doc: ', doc);
          merged = _.merge(merged, doc);
        });
        resolve(merged);
      });
    });
  });
};

const executeTreeActions = (db, params) => {
  switch (params.type) {
    case 'attributes':
      return findAttributes(db, params);
    default:
      return Promise.resolve();
  }
};

exports.executeTreeActions = executeTreeActions;
