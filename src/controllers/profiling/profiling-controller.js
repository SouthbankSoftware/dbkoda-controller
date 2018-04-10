const EventEmitter = require('events');
const md5Hex = require('md5-hex');
const _ = require('lodash');

const {ErrorCodes} = require('../../errors/Errors');

/* eslint-disable class-methods-use-this */

const iterateProperty = (obj, parent, stacks = []) => {
  return _.keys(obj).reduce((accumulator, key) => {
    if (typeof obj[key] === 'object') {
      iterateProperty(obj[key], `${parent}.${key}`, accumulator);
    } else {
      accumulator.push(`${parent}.${key}`);
    }
    return accumulator;
  }, stacks);
};

const aggregateResult = results => {
  return results.reduce((accumulator, ret) => {
    let slack = {ns: ret.ns};
    let planQuery = '';
    let command = '';
    if (ret.query) {
      command = ret.query;
      planQuery = iterateProperty(ret.query, 'query', []);
    } else if (ret.command) {
      command = ret.command;
      planQuery = iterateProperty(ret.command, 'command', []);
    }
    slack = {...slack, ...planQuery};
    const hexResult = md5Hex(JSON.stringify(slack));
    if (accumulator[hexResult]) {
      accumulator[hexResult].count += 1;
      accumulator[hexResult].millis += ret.millis;
    } else {
      accumulator[hexResult] = {};
      accumulator[hexResult].op = ret.op;
      accumulator[hexResult].example = command;
      accumulator[hexResult].count = 1;
      accumulator[hexResult].millis = ret.millis;
      accumulator[hexResult].planQuery = planQuery;
      accumulator[hexResult].plansSummary = ret.planSummary;
      accumulator[hexResult].execStats = ret.execStats;
    }
    return accumulator;
  }, {});
};

class ProfilingController extends EventEmitter {
  setup(app) {
    this.app = app;
    this.dbNameSpace = {};
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
            .sort({millis: -1})
            .limit(20)
            .toArray();
        })
        .then(d => resolve(aggregateResult(d)))
        .catch(err => reject(err));
    });
  }

  startProfile(db, dbName, colName, sampleRate) {
    this.profile(db, dbName, colName);
    this.interval = setInterval(
      () => this.profile(db, dbName, colName),
      sampleRate
    );
  }

  stop() {
    clearInterval(this.interval);
  }

  patch(driver, data) {
    // data: {level: 1, slowms: 200, dbNames: [], profileSize: 1m}
    l.debug('update profile ', data);
    const promises = [];
    data.dbNames.forEach(dbName => {
      promises.push(
        driver.db(dbName).command({profile: data.level, slowms: data.slowms})
      );
    });
    return Promise.all(promises);
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
                this.getDatabaseProfileConfiguration(db, d.name).then(v =>
                  r({dbName: d, v}).catch(err => j(err))
                )
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

  getDatabaseProfileConfiguration(db, dbName) {
    return db.db(dbName).command({profile: -1});
  }
}

module.exports = {ProfilingController, aggregateResult, iterateProperty};
