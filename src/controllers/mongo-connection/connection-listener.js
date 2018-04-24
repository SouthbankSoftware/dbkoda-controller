/*
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

/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-06-08T17:56:53+10:00
 */

const Status = require('./status');
const EventEmitter = require('events').EventEmitter;

/**
 * listeners used to listen on mongodb instance status.
 * It will emit status event for the current connection
 */
class ConnectionListener extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
  }

  addListeners(db, options) {
    db.on('close', this.onClose.bind(this));
    db.on('error', this.onError.bind(this));
    db.on('timeout', this.onTimeout.bind(this));
    db.on('parseError', this.onParseError.bind(this));
    db.on('reconnect', this.onReconnect.bind(this));
    if (options) {
      this.timeoutTime = options.reconnectTries * options.reconnectInterval;
    }
  }

  removeListeners(db) {
    if (db) {
      db.removeListener('close', this.onClose);
      db.removeListener('error', this.onError);
      db.removeListener('timeout', this.onTimeout);
      db.removeListener('parseError', this.onParseError);
      db.removeListener('reconnect', this.onReconnect);
    }
    this.timeoutTime = -1;
    this.retryTimeout = null;
  }

  onClose(e) {
    l.info('database connection closed [' + this.id + ']');
    this.emit(ConnectionListener.EVENT_NAME, {
      id: this.id,
      status: Status.CLOSED,
      message: e && e.message
    });
    this.retryTimeout = setTimeout(() => {
      this.emit(ConnectionListener.EVENT_NAME, {
        id: this.id,
        status: Status.RETRY_FAILED,
        message: e && e.message
      });
    }, this.timeoutTime);
  }

  onError(e) {
    l.error('database got error [' + this.id + ']');
    this.emit(ConnectionListener.EVENT_NAME, {
      id: this.id,
      status: Status.ERROR,
      message: e && e.message
    });
  }

  onTimeout(_e) {
    l.error('database timeout [' + this.id + ']');
  }

  onParseError(_e) {
    l.error('parse error [' + this.id + ']');
  }

  onReconnect(e) {
    l.error('reconnect success [' + this.id + ']');
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.emit(ConnectionListener.EVENT_NAME, {
      id: this.id,
      status: Status.OPEN,
      message: e && e.message
    });
  }
}

ConnectionListener.EVENT_NAME = 'status-changed';

module.exports = ConnectionListener;
