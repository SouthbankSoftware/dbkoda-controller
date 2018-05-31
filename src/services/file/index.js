/**
 * @Author: guiguan
 * @Date:   2017-03-30T10:20:31+11:00
 * @Last modified by:   guiguan
 * @Last modified time: 2018-05-31T18:43:58+10:00
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
import chokidar from 'chokidar';
import hooks from './hooks';

export class File {
  constructor(_options) {
    this.events = ['changed'];
  }

  _initFileWatcher() {
    this.watcher = chokidar.watch(null, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: false
    });
    this.watcher.on('change', path => {
      this.emit('changed', {
        _id: path
      });
    });
  }

  setup(_app, _path) {
    this._initFileWatcher();
  }

  find(_params) {
    return Promise.resolve(this.watcher.getWatched());
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
  app.use('/files', new File());

  // Get our initialize service to that we can bind hooks
  const fileService = app.service('/files');

  // Set up our before hooks
  fileService.before(hooks.before);

  // Set up our after hooks
  fileService.after(hooks.after);
}
