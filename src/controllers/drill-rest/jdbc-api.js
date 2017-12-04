/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-23T16:15:12+11:00
 *
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

/* eslint-disable class-methods-use-this */
const _ = require('lodash');

class JdbcApi {
  setup(dbInst) {
    this.db = dbInst;
  }

  reserve() {
    // return promise which resolve to (connobj, conn)
    return new Promise((resolve, reject) => {
      this.db.reserve((err, connobj) => {
        if (err) {
          reject(err);
        } else {
          resolve(connobj);
        }
      });
    });
  }

  release(connobj) {
    return new Promise((resolve, reject) => {
      this.db.release(connobj, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
  toHexString(byteArray) {
    return Array.from(byteArray, (byte) => {
      return ('0' + (byte & 0xff).toString(16)).slice(-2); // eslint-disable-line
    }).join('');
  }

  executeQueryOnConn(sql, conn) {
    return new Promise((resolve, reject) => {
      conn.createStatement((err, statement) => {
        if (err) {
          reject(err);
        } else {
          statement.setFetchSize(100, (err) => {
            if (err) {
              reject(err);
            } else {
              statement.execute(sql, (err, resultset) => {
                if (err) {
                  reject(err);
                } else {
                  resultset.toObjArray((err, results) => {
                    results = results.map((row) => {
                      return _.mapValues(row, (cell) => {
                        // for specific condition on key we can use (cell, key)
                        if (
                          cell !== null &&
                          typeof cell === 'object' &&
                          cell instanceof Int8Array
                        ) {
                          return this.toHexString(cell);
                        }
                        return cell;
                      });
                    });
                    if (results.length > 0) {
                      const qResult = { query: sql, result: results };
                      resolve(qResult);
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  }

  query(sql) {
    return new Promise((resolve, reject) => {
      this.reserve().then((connobj) => {
        this.executeQueryOnConn(sql, connobj.conn)
          .then((result) => {
            this.release(connobj);
            resolve(result);
          })
          .catch((err) => {
            this.release(connobj);
            reject(err);
          });
      });
    });
  }
  executeMultiQueryOnConn(sqlArray, conn, resultArr) {
    return new Promise((resolve, reject) => {
      const sql = sqlArray.shift();
      this.executeQueryOnConn(sql, conn)
        .then((result) => {
          resultArr.push(result);
          if (sqlArray.length > 0) {
            this.executeMultiQueryOnConn(sqlArray, conn, resultArr)
              .then((result) => {
                resolve(result);
              })
              .catch((err) => {
                reject(err);
              });
          } else {
            resolve(resultArr);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  queryMultiple(sqlArray) {
    return new Promise((resolve, reject) => {
      this.reserve().then((connobj) => {
        const resultArr = [];
        this.executeMultiQueryOnConn(sqlArray, connobj.conn, resultArr)
          .then((result) => {
            this.release(connobj);
            resolve(result);
          })
          .catch((err) => {
            this.release(connobj);
            reject(err);
          });
      });
    });
  }
}

module.exports = JdbcApi;
