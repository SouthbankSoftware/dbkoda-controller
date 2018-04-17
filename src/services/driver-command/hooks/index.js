const errors = require('feathers-errors');

const getConnection = context => {
  const {service} = context;
  const {connections} = service.connectCtr;
  return connections[context.id];
};

exports.before = {
  all: [],
  find: [],
  get: [
    context => {
      const connection = getConnection(context);
      if (!connection) {
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
  patch: [
    context => {
      const connection = getConnection(context);
      if (!connection) {
        throw new errors.BadRequest('connection doesnt exist');
      }
    }
  ],
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
