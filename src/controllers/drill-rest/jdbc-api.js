/* eslint-disable class-methods-use-this */

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
