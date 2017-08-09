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
// Drilldown into a collection to get sizings 
//
/* eslint no-var: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */
/* eslint vars-on-top: 0 */

dbk_Cs = {};

dbk_Cs.incSize = function(index, size) {

  if (typeof dbk_Cs.sizes[index] === "undefined") {
    dbk_Cs.sizes[index] = size;
  } else {
    dbk_Cs.sizes[index] += size;
  }
};

dbk_Cs.sizeSample = function(sample, parentId) {
  //print("parentId=" + parentId+ " "+typeof parentId);
  //print (sample);
  if (typeof sample === "object" && sample != null) {
    if (sample.constructor === Array) {
      sample.forEach(function(d) {
        dbk_Cs.sizeElem(d, parentId);
      });
    } else dbk_Cs.sizeElem(sample, parentId);
  }
};

dbk_Cs.sizeElem = function(doc, parentId) {
  if (typeof doc === "object" && doc !== null) {
    dbk_Cs.incSize(parentId, Object.bsonsize(doc));
    Object.keys(doc).forEach(function(k) {
      //print("key=" + k);
      if (typeof doc[k] === "object") {
        //print("parentId (elem)="+parentId+" "+parentId.constructor);
        dbk_Cs.sizeSample(doc[k], parentId.concat([k]));
      }
    });
  }
};

dbk_Cs.collectionSize = function(dbName,collectionName,sampleSize) {
  dbk_Cs.sizes={};
  var collection=db.getSiblingDB(dbName).getCollection(collectionName); // eslint-disable-line
  var totalSize=collection.stats().storageSize;
  var sampleClause = {$sample: { size: sampleSize } };
  if (dbe.majorVersion() < 3.2) {
    sampleClause = {$limit:sampleSize};
  }
  var sample=collection.aggregate([sampleClause]); 
  dbk_Cs.sizeSample(sample.toArray(),[collectionName]); 
  output=dbk_Cs.sizes;
  var sampleTotal=output[collectionName]; 
  var multiplier=totalSize/sampleTotal;
  Object.keys(output).forEach(function(key) {
    output[key]*=multiplier;
  });
  return(output); 
}
