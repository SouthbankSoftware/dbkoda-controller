/**
 * dbKoda - a modern, open source code editor, for MongoDB.
 * Copyright (C) 2017-2018 Southbank Software
 *
 * This file is part of dbKoda.
 *
 * dbKoda is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * dbKoda is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with dbKoda.  If not, see <http://www.gnu.org/licenses/>.
 */
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
