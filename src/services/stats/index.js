/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:17:22+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-18T09:30:22+11:00
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

// $FlowFixMe
import errors from 'feathers-errors';
import _ from 'lodash';
import { ObservableWrapper } from './observables/ObservableWrapper';
import hooks from './hooks';

export class Stats {
  // key: profileId
  observables: Map<
    UUID,
    {
      wrappers: ObservableWrapper[],
      // key: item
      index: Map<string, ObservableWrapper>,
    },
  >;
  events: string[];

  constructor(_options: *) {
    this.events = ['data', 'error', 'warn'];
  }

  setup(_app: *, _path: *) {
    this.observables = new Map();
  }

  emitError(id: string, error: string, level: 'warn' | 'error' = 'error') {
    // $FlowFixMe
    this.emit('error', { profileId: id, payload: { error, level } });
  }

  find(_params) {
    const filter = ['_id', 'type', 'debug'];

    return Promise.resolve([...this.observables.values()].map(v => _.pick(v, filter)));
  }

  get(id, _params) {
    const filter = ['_id', 'type', 'debug'];
    const terminal = this.observables.get(id);

    if (!terminal) {
      throw new errors.NotFound(`Terminal ${id} doesn't exist`);
    }

    return Promise.resolve(_.pick(terminal, filter));
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
  app.use('/stats', new Stats());

  // Get our initialize service to that we can bind hooks
  const service = app.service('/stats');

  // Set up our before hooks
  service.before(hooks.before);

  // Set up our after hooks
  service.after(hooks.after);
}
