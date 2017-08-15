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
 * @Last modified time: 2017-06-08T17:59:18+10:00
 */

const os = require('os');
const MongoShell = require('../mongo-shell').MongoShell;
const EventEmitter = require('events');
const hooks = require('feathers-hooks-common');
const uuid = require('node-uuid');
const errors = require('feathers-errors');

/**
 * this controller is used to handle auto complete for mongo shell
 */
class SyncExecutionController {

  constructor() {
    this.emitter = new EventEmitter();
    this.requestQueue = [];
    this
      .emitter
      .on('command::finished', this.commandFinished.bind(this));
  }

  setup(app) {
    this.app = app;
    this.mongoController = app.service('mongo/connection/controller');
  }

  /**
   * write sync command execution on shell
   */
  writeSyncCommand(id, shellId, commands, responseType = 'json') {
    this.output = '';
    const shell = this
      .mongoController
      .getMongoShell(id, shellId);
    if (shell.isShellBusy()) {
      log.debug('shell is busy, put command in queue');
      return new Promise((resolve, reject) => {
        this
          .requestQueue
          .push({ shell, commands, resolve, reject, responseType });
      });
    }
    return new Promise((resolve, reject) => {
      this
        .requestQueue
        .push({ shell, commands, resolve, reject, responseType });
      this.runSyncCommandFromQueue(this);
    });
  }

  commandFinished() {
    if (this.requestQueue.length > 0) {
      this.runSyncCommandFromQueue(this);
    }
  }

  /**
   * run the next request from the request queue.
   *
   */
  runSyncCommandFromQueue(ctr) {
    const { shell, commands, resolve, responseType } = ctr.requestQueue[0];
    ctr.output = '';
    ctr
      .requestQueue
      .shift();
    shell.on(MongoShell.SYNC_OUTPUT_EVENT, this.outputListener.bind(this));
    const syncExecutEnd = (data) => {
      log.info('execution ended ', ctr.output);
      shell.removeAllListeners(MongoShell.SYNC_OUTPUT_EVENT);
      shell.removeAllListeners(MongoShell.SYNC_EXECUTE_END);
      let output = ctr.output + data;
      output = output.replace(commands, '');
      if (responseType === 'json' || responseType === 'explain') {
        output = output.replace(/\n/g, '').replace(/\r/g, '');
        if (os.platform() === 'win32') {
          const brackIdx = output.indexOf('{');
          const bracketIdx = output.indexOf('[');
          const idx = Math.min(bracketIdx, brackIdx);
          if (idx > 0) {
            output = output.substring(idx);
          }

          output = output.replace(/\\:/g, '\\\\');
          if (responseType === 'explain') {
            output = output.replace(/\s/g, '');
            const braceIdx = output.indexOf('"queryPlanner":');
            if (braceIdx >= 0) {
              output = '{' + output.substring(braceIdx);
            }
          }
        }
        output = output.replace(/ObjectId\("([a-zA-Z0-9]*)"\)/g, '"ObjectId(\'$1\')"');
        output = output.replace(/ISODate\("([a-zA-Z0-9-:.]*)"\)/g, '"ISODate(\'$1\')"');
        output = output.replace(/NumberLong\(([a-zA-Z0-9]*)\)/g, '"NumberLong(\'$1\')"');
        output = output.replace(/NumberLong\("([a-zA-Z0-9]*)"\)/g, '"NumberLong(\'$1\')"');
        output = output.replace(/Timestamp\(([a-zA-Z0-9.:-_, ]*)\)/g, '"ObjectId(\'$1\')"');
        // output = output.replace(/:(\/[^\/]*\/)/g, ':"$1"'); // eslint-disable-line
        try {
          JSON.parse(output);
          log.debug('response output ', output);
          resolve(output);
        } catch (err) {
          log.error('failed to parse json ', output);
          log.error('current command ', this.currentCommand.commands);
          // reject(new errors.BadRequest(output));
          resolve(output);
        }
      } else {
        resolve(ctr.output + data);
      }
      this
        .emitter
        .emit('command::finished');
    };
    shell.on(MongoShell.SYNC_EXECUTE_END, syncExecutEnd.bind(this));
    // let newCmd = commands;
    // let tempVar = null;
    // if (responseType === 'json' || responseType === 'explain') {
    //   tempVar = SyncExecutionController.tempVariable;
    //   newCmd = `var ${tempVar}=${newCmd}${MongoShell.enter}${tempVar}${MongoShell.enter}`;
    // }
    this.currentCommand = { shell, commands, resolve, responseType };
    shell.writeSyncCommand(commands);
  }

  /**
   * Execute the command to change the shellID to the new Profile connection.
   */
  swapProfile(id, shellId, newProfile) { //eslint-disable-line
    const url = this.mongoController.connections[newProfile].url;
    const pw = this.mongoController.connections[newProfile].password;
    const username = this.mongoController.connections[newProfile].username;
    let commands = 'var db = ';
    if (this.mongoController.connections[newProfile].shellVersion.match(/^3.0.*/gi) ||
      this.mongoController.connections[newProfile].shellVersion.match(/^3.1.*/gi) ||
      this.mongoController.connections[newProfile].shellVersion.match(/^3.2.*/gi)) {
      l.info('!! WARNING: Running on outdated version of MongoShell, connection must be assigned to a variable. !!');
    } else {
      l.info('Old shell version not detected, version detected: ', this.mongoController.connections[newProfile].shellVersion);
    }
    if (username && pw) {
      commands += 'connect("' + url + '", "' + username + '", "' + pw + '")';
    } else if (username) {
      commands += 'connect("' + url + '", "' + username + '")';
    } else {
      commands += 'connect("' + url + '")';
    }
    this.output = '';
    let shell = null;
    if (!this.mongoController.existMongoShell(id, shellId)) {
      // connection doesn't exist, need to create a new shell for the new profile
      const connection = this.mongoController.connections[newProfile];
      if (connection) {
        const newShellId = uuid.v1();
        this.mongoController.createShellConnection(newProfile, newShellId);
        return Promise.resolve({ shellId: newShellId });
      }
      throw new errors.BadRequest('Connection does not exist');
    } else {
      shell = this
        .mongoController
        .getMongoShell(id, shellId);
    }
    if (shell.isShellBusy()) {
      return new Promise((resolve) => {
        this
          .requestQueue
          .push({ shell, commands, resolve });
      });
    }
    return new Promise((resolve) => {
      this
        .requestQueue
        .push({ shell, commands, resolve });
      this.runSyncCommandFromQueue(this);
    });
  }

  outputListener(data) {
    this.output += data + '\n';
  }
}

module.exports = function () {
  const app = this;
  // Initialize our service with any options it requires
  const service = new SyncExecutionController();
  app.use('mongo/sync-execution/controller', service);
  app
    .service('mongo/sync-execution/controller')
    .before({
      // Users can not be created by external access
      create: hooks.disallow('external'),
      remove: hooks.disallow('external'),
      update: hooks.disallow('external'),
      find: hooks.disallow('external'),
      get: hooks.disallow('external')
    });
  return service;
};

module.exports.SyncExecutionController = SyncExecutionController;
SyncExecutionController.tempVariable = 'dbKoda_Temp_Variable';
