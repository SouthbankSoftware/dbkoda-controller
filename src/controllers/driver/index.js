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
 * Created by joey on 26/9/17.
 */

const errors = require('feathers-errors');
const EventEmitter = require('events').EventEmitter;

export default class Driver extends EventEmitter {
  constructor(connect) {
    super();
    this.connect = connect;
  }

  runCommands(commands) {
    let driverCmds = commands;
    const db = this.connect.driver;
    if (!db) {
      return Promise.reject('cant find mongo driver');
    }
    driverCmds = commands.replace(/console\./g, 'dbkodaConsole.');
    // console.oldlog = console.log;
    log.debug(`run ${driverCmds} on driver`);
    // console.olderror = console.error;
    const evalLog = (value) => {
      log.debug('emit output', value);
      this.emit(Driver.OUTPUT, value);
    };
    const dbkodaConsole = {log: evalLog, error: evalLog};  // eslint-disable-line
    // console.log = evalLog;
    // console.error = evalLog;
    try {
      eval(driverCmds); // eslint-disable-line
    } catch (err) {
      log.error('failed to run commands ', err);
      throw new errors.BadRequest(err.message);
    }
    return Promise.resolve();
  }
}

Driver.OUTPUT = 'output-event';
