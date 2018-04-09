const {ProfilingController} = require('./profiling-controller');
const hooks = require('./hooks');

module.exports = function() {
  const app = this;
  // Initialize our service with any options it requires
  const service = new ProfilingController();
  app.use('mongo/profile/controller', service);
  app.service('mongo/profile/controller').before(hooks.before);
  return service;
};

module.exports.ProfilingController = ProfilingController;
