import errors from 'feathers-errors';

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
