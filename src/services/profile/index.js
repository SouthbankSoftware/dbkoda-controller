const hooks = require('./hooks');

class Profile {
  constructor() {
    this.docs = {};
  }

  setup(app) {
    this.app = app;
    this.controller = app.service('mongo/profile/controller');
    this.connectCtr = app.service('mongo/connection/controller');
  }

  patch(id, data) {
    // data is the configuation for profile, it is [{level: 1, slowms: 200, dbName: 'test'}]
    log.debug('patch profile ', id, data);
    const connectObj = this.connectCtr.connections[id];
    return this.controller.patch(connectObj.driver, data);
  }

  get(id, params) {
    l.debug('get ' + id, params);
    const connectObj = this.connectCtr.connections[id];
    const {op} = params.query;
    const {driver, db} = connectObj;
    if (op === 'profile') {
      const {dbName, colName} = params.query;
      return this.controller.profile(driver, dbName, colName);
    } else if (op === 'configuration') {
      return this.controller.get(driver, db);
    }
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new Profile();
  app.use('/profile', service);
  // Get our initialize service to that we can bind hooks
  const profileService = app.service('/profile');

  // Set up our before hooks
  profileService.before(hooks.before);

  // Set up our after hooks
  profileService.after(hooks.after);
  return service;
};

module.exports.Profile = Profile;
