/**
 * @Author: guiguan
 * @Date:   2017-09-22T09:43:34+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-12T21:20:49+11:00
 *
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

/* eslint-disable class-methods-use-this */

import errors from 'feathers-errors';
import hooks from './hooks';

export class MongoCmdValidator {
  find(_params) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  get(_id, _params) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  create(_data, _params) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  update(_id, _data, _params) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  patch(_id, _data, _params) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  remove(_id, _params) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }
}

/** @ignore */
export default function() {
  const app = this;

  // Initialize our service with any options it requires
  app.use('/mongo-cmd-validator', new MongoCmdValidator());

  // Get our initialize service to that we can bind hooks
  const service = app.service('/mongo-cmd-validator');

  // Set up our before hooks
  service.before(hooks.before);

  // Set up our after hooks
  service.after(hooks.after);
}
