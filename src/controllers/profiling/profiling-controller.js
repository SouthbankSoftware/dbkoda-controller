const EventEmitter = require('events');
const md5Hex = require('md5-hex');
const _ = require('lodash');

const {ErrorCodes} = require('../../errors/Errors');

/* eslint-disable class-methods-use-this */

const systemProfileCollectionName = 'system.profile';

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
      accumulator[hexResult].ns = ret.ns;
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
    const nsFilter = colName ? `${dbName}.${colName}` : {$regex: `${dbName}.*`};
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
            .find({ns: nsFilter})
            .sort({millis: -1})
            .limit(20)
            .toArray();
        })
        .then(d => resolve(aggregateResult(d)))
        .catch(err => reject(err));
    });
  }

  patch(driver, data) {
    // data: [{level: 1, slowms: 200, dbName, profileSize: 1m}]
    l.debug('update profile ', data);
    const sizeChangeDb = _.filter(data, d => d.profileSize !== undefined);

    if (sizeChangeDb.length > 0) {
      const sizeChangeDbNames = sizeChangeDb.map(d => d.dbName);
      return this.getSystemProfileStats(driver, sizeChangeDbNames)
        .then(dbStats => {
          const disablePromise = data
            .map(d => {
              if (d.profileSize !== undefined) {
                const stats = _.find(dbStats, {dbName: d.dbName});
                if (
                  stats &&
                  d.profileSize * 1024 / 1000 !== stats.stats.maxSize
                ) {
                  return driver
                    .db(d.dbName)
                    .command({profile: 0})
                    .then(_ => ({
                      dbName: d.dbName,
                      profileSize: d.profileSize,
                    }));
                }
              }
              return null;
            })
            .filter(x => x != null);
          return Promise.all(disablePromise);
        })
        .then(dbs => {
          const dropPromises = dbs.map(dbData =>
            driver
              .db(dbData.dbName)
              .collection(systemProfileCollectionName)
              .drop()
              .then(_ => dbData)
          );
          return Promise.all(dropPromises);
        })
        .then(dbs => {
          return Promise.all(
            dbs.map(dbData => {
              return driver
                .db(dbData.dbName)
                .createCollection(systemProfileCollectionName, {
                  capped: true,
                  size: dbData.profileSize,
                });
            })
          );
        })
        .then(ret => {
          l.debug(ret);
          return this.setProfileConfiguration(driver, data);
        });
    }
    return this.setProfileConfiguration(driver, data);
  }

  setProfileConfiguration(driver, data) {
    return Promise.all(
      data.map(d =>
        driver.db(d.dbName).command({profile: d.level, slowms: d.slowms})
      )
    );
  }

  get(driver, db) {
    return new Promise((resolve, reject) => {
      db
        .admin()
        .listDatabases()
        .then(dbs => {
          const proms = dbs.databases.map(
            d =>
              new Promise((r, j) =>
                this.getDatabaseProfileConfiguration(driver, d.name)
                  .then(v => r({[d.name]: v}))
                  .catch(err => j(err))
              )
          );
          return Promise.all(proms);
        })
        .then(v => {
          const proms = v.map(value => {
            console.log(value);
            const [dbName] = _.keys(value);
            const dbValue = value[dbName];
            return this.getSingleSystemProfileStats(driver, dbName).then(stats => {
              dbValue.size = stats.stats.maxSize * 1000 / 1024;
              return {[dbName]: dbValue};
            }).catch(() => null);
          });
          return Promise.all(proms);
        })
        .then(v => {
          resolve(v.filter(x => x));
        })
        .catch(err => reject(err));
    });
  }

  getDatabaseProfileConfiguration(db, dbName) {
    return db.db(dbName).command({profile: -1});
  }

  getSystemProfileStats(driver, dbNames) {
    const promises = dbNames.map(name => {
      // return driver
      //   .db(name)
      //   .collection(systemProfileCollectionName)
      //   .stats()
      //   .then(stats => {
      //     return {dbName: name, stats};
      //   });
      return this.getSingleSystemProfileStats(driver, name);
    });
    return Promise.all(promises);
  }

  getSingleSystemProfileStats(driver, dbName) {
    return driver
      .db(dbName)
      .collection(systemProfileCollectionName)
      .stats()
      .then(stats => {
        return {dbName, stats};
      })
      .catch(err => {
        l.error(err);
        return null;
      });
  }
}

module.exports = {ProfilingController, aggregateResult, iterateProperty};
