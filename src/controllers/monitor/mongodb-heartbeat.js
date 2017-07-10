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
 * @Last modified time: 2017-06-08T17:58:56+10:00
 */

const EventEmitter = require('events').EventEmitter;

const DEFAULTS = {
  timeout: 3000,
  interval: 3000,
  tolerance: 3,
  command: 'ping',
};

/**
 * check mongodb instance connection
 */
class MongoDBHeartBeat extends EventEmitter {
  constructor(connection, options) {
    super();
    this.connection = connection;
    this.timer = null;
    this.currFailures = 0;
    this.options = options || DEFAULTS;
  }

  /**
   * start to check the connection every TIME_OUT time
   */
  start() {
    l.info('start mongodb monitor.', this.options);
    const that = this;
    this.timer = that.checkConnection();
  }

  /**
   * stop checking the connection
   */
  stop() {
    l.info('stop mongodb monitor.');
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  fail(err) {
    this.stop();
    this.emit('error', err);
  }

  /**
   * run ping command
   */
  checkConnection() {
    l.debug('run mongo command to check connection ');
    const that = this;

    return setTimeout(
      () => {
        const command = {};
        command[this.options.command] = 1;
        try {
          this.connection.command(
            command,
            {
              timeout: that.options.timeout,
              socketTimeoutMS: that.options.timeout,
            },
            (err, data) => {
              that.currFailures = err ? that.currFailures + 1 : 0;
              if (err) {
                if (that.currFailures >= that.options.tolerance) {
                  l.error('heartbeat failed after ' + that.currFailures + ' times tried.');
                  that.fail(err);
                  return;
                }
                l.error('heartbean failed on ' + that.currFailures + ' times.');
              } else {
                that.emit('heartbeat', data);
              }
              setTimeout(
                () => {
                  that.checkConnection();
                },
                that.options.interval,
              );
            },
          );
        } catch (err) {
          l.error('failed to run ping command ', err.message);
        }
      },
      this.options.timeout,
    );
  }
}

module.exports = MongoDBHeartBeat;
