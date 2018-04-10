const EventEmitter = require('events');
const flatten = require('flat');
const md5Hex = require('md5-hex');
const _ = require('lodash');

const {ErrorCodes} = require('../../errors/Errors');

/* eslint-disable class-methods-use-this */

const aggregateResult = results => {
  return results.reduce((accumulator, ret) => {
    let slack = {ns: ret.ns};
    let planQuery = '';
    if (ret.query) {
      planQuery = ret.query;
    } else if (ret.command && ret.command.query) {
      planQuery = ret.command.query;
    }
    slack = _.merge(slack, flatten(planQuery));
    const hexResult = md5Hex(JSON.stringify(slack));
    if (accumulator[hexResult]) {
      accumulator[hexResult].count += 1;
      accumulator[hexResult].millis += ret.millis;
    } else {
      accumulator[hexResult] = {};
      accumulator[hexResult].example = ret.op;
      accumulator[hexResult].count = 1;
      accumulator[hexResult].millis = ret.millis;
      accumulator[hexResult].planQuery = planQuery;
      accumulator[hexResult].plansSummary = ret.planSummary;
    }
    return accumulator;
  }, {});
};

class ProfilingController extends EventEmitter {
  setup(app) {
    this.app = app;
  }

  profile(db, dbName, colName) {
    return new Promise((resolve, reject) => {
      db
        .db(dbName)
        .command({profile: -1})
        .then(d => {
          if (d.was <= 0) {
            reject(new Error(ErrorCodes.PROFILING_DISABLED));
          }
          return db
            .db(dbName)
            .collection('system.profile')
            .find({ns: `${dbName}.${colName}`})
            .sort({ts: -1})
            .limit(20)
            .toArray();
        })
        .then(d => resolve(aggregateResult(d)))
        .catch(err => reject(err));
    });
  }

  patch(driver, data) {
    // data: {level: 1, slowms: 200, databaseName}
    l.debug('update profile ', data);
    return driver
      .db(data.databaseName)
      .command({profile: data.level, slowms: data.slowms});
  }

  get(db) {
    return new Promise((resolve, reject) => {
      db
        .admin()
        .listDatabases()
        .then(dbs => {
          const proms = dbs.databases.map(
            d =>
              new Promise((r, j) =>
                db
                  .db(d.name)
                  .command({profile: -1})
                  .then(v => r({dbName: d, v}).catch(err => j(err)))
              )
          );
          return Promise.all(proms);
        })
        .then(v => {
          resolve(v);
        })
        .catch(err => reject(err));
    });
  }
}

module.exports = {ProfilingController, aggregateResult};
