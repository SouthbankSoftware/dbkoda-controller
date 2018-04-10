const errors = require('feathers-errors');

exports.before = {
  all: [],
  find: [],
  get: [
    context => {
      const {service} = context;
      const {connections} = service.connectCtr;
      if (!connections[context.id]) {
        throw new errors.BadRequest('connection doesnt exist');
      }
      const {op} = context.params.query;
      if (!op || ['profile', 'configuration'].indexOf(op) < 0) {
        throw new errors.BadRequest('query parameter is not valid');
      }
    },
  ],
  create: [],
  update: [],
  patch: [],
  remove: [],
};

exports.after = {
  all: [],
  find: [],
  get: [],
  create: [],
  update: [],
  patch: [],
  remove: [],
};
