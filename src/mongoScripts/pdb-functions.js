//
//  *
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

// Helper functions for provendb

/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0  */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */
/* eslint vars-on-top: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint no-loop-func: 0 */
/* eslint no-undef: 0 */
/* eslint no-plusplus: 0 */

const provendb = {};

provendb.version = () => {
  return db.runCommand({ getVersion: 1 }).versionId;
};

provendb.setVersion = version => {
  return db.runCommand({ setVersion: version }).versionId;
};

provendb.setCurrent = () => {
  return db.runCommand({ setVersion: 'current' }).versionId;
};

provendb.prove = version => {
  return db.runCommand({
    submitProof: version,
    proofType: 'full'
  });
};

provendb.proveCurrent = () => {
  return db.runCommand({
    submitProof: provendb.version(),
    proofType: 'full'
  });
};

provendb.collectionVersion = (collection, version) => {
  return db.getCollection(collection).find({
    $and: [
      { '_provendb_metadata.minVersion': { $lte: version } },
      { '_provendb_metadata.maxVersion': { $gte: version } }
    ]
  });
};

provendb.versionContents = version => {
  db.getCollectionNames().forEach(col => {
    if (!col.match(/^_provendb/)) {
      let count = 0;
      db
        .getCollection(col)
        .find({
          $and: [
            { '_provendb_metadata.minVersion': { $lte: version } },
            { '_provendb_metadata.maxVersion': { $gte: version } }
          ]
        })
        .forEach(() => {
          count += 1;
        });
      print(col + ' Document count=' + count);
    }
  });
};

provendb.validate = version => {
  return db.runCommand({ validateProof: version });
};

provendb.versionHistogram = collection => {
  const histogram = {};
  db
    .getCollection(collection)
    .find({}, { '_provendb_metadata.minVersion': 1 })
    .forEach(d => {
      const minVersion = d._provendb_metadata.minVersion;
      if (minVersion in histogram) {
        histogram[minVersion]++;
      } else {
        histogram[minVersion] = 1;
      }
    });
  return histogram;
};
