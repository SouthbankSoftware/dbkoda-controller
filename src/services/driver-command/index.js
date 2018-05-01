const hooks = require('./hooks');

class DriverCommandService {
  constructor() {
    this.docs = {};
  }

  setup(app) {
    this.app = app;
    this.controller = app.service('mongo/driver/commands');
    this.connectCtr = app.service('mongo/connection/controller');
  }

  patch(id, data) {
    // data is the commands run in driver, it is {database: 'test', command: {currentOp: 1}}
    log.debug('patch profile ', id, data);
    const connectObj = this.connectCtr.connections[id];
    return this.controller.patch(connectObj.driver, data);
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new DriverCommandService();
  app.use('/drivercommands', service);
  // Get our initialize service to that we can bind hooks
  const driverService = app.service('/drivercommands');

  // Set up our before hooks
  driverService.before(hooks.before);

  // Set up our after hooks
  driverService.after(hooks.after);
  return service;
};

module.exports.DriverCommandService = DriverCommandService;
