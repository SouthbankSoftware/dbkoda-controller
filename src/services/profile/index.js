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
    // data is the configuation for profile, it is {level: 1, slowms: 200, databaseName: 'test'}
    log.debug('patch profile ', id, data);
    const connectObj = this.connectCtr.connections[id];
    return this.controller.patch(connectObj.driver, data);
  }

  get(id) {
    l.debug('get ' + id);
    const connectObj = this.connectCtr.connections[id];
    return this.controller.get(connectObj.driver);
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
