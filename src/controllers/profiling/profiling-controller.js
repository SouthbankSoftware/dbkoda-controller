const EventEmitter = require('events');
const {ErrorCodes} = require('../../errors/Errors');

class ProfilingController extends EventEmitter {
  constructor(db, options = {level: 1, slowms: 200}) {
    super();
    this.db = db;
    this.options = options;
  }

  profile(sampleRate) {
    return new Promise((resolve, reject) => {
      if (this.db) {
        if (this.options.level <= 0) {
          reject(new Error(ErrorCodes.PROFILING_DISABLED));
        } else {
          this.db
            .db(this.db.databaseName)
            .command({profile: -1})
            .then(d => {
              if (d.was <= 0) {
                reject(new Error(ErrorCodes.PROFILING_DISABLED));
              }
              const now = new Date();
              now.setMilliseconds(now.getMilliseconds() - sampleRate);
              return this.db
                .db(this.db.databaseName)
                .collection('system.profile')
                .find({ts: {$gte: now}})
                .sort({ts: -1})
                .limit(100)
                .toArray();
            })
            // .then(d => resolve({db_profile: this.aggregateResult(d)}))
            .catch(err => reject(err));
        }
      } else {
        reject(new Error(ErrorCodes.MONGO_CONNECTION_CLOSED));
      }
    });
  }

  // aggregateResult(results) {
  //   results.forEach(ret => {
  //     if (ret.op) {
  //       if (ret.op === 'command') {

  //       }
  //     }
  //   });
  // }

  getProfileLevel() {
    return new Promise((resolve, reject) => {
      this.db
        .admin()
        .listDatabases()
        .then(dbs => {
          const proms = dbs.databases.map(
            d =>
              new Promise((r, j) =>
                this.db
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

module.exports = ProfilingController;
