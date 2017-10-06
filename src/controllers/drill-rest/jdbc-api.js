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
      return ('0' + (byte & 0xFF).toString(16)).slice(-2); // eslint-disable-line
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
                      return _.mapValues(row, (cell) => {     // for specific condition on key we can use (cell, key)
                        if (cell !== null && typeof cell === 'object' && cell instanceof Int8Array) {
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
