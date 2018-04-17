const {DriverController} = require('./driver-controller');
const hooks = require('./hooks');

module.exports = function() {
  const app = this;
  // Initialize our service with any options it requires
  const service = new DriverController();
  app.use('mongo/driver/commands', service);
  app.service('mongo/driver/commands').before(hooks.before);
  return service;
};

module.exports.DriverController = DriverController;
