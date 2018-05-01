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

const MongoShell = require('../mongo-shell').MongoShell;
const EventEmitter = require('events');
const hooks = require('feathers-hooks-common');
const uuid = require('node-uuid');
const errors = require('feathers-errors');

/**
 * this controller is used to handle auto complete for mongo shell
 */
class SyncExecutionController {
  setup(app) {
    this.emitter = new EventEmitter();
    this.requestQueue = [];
    this.emitter.on('command::finished', this.commandFinished.bind(this));
    this.app = app;
    this.mongoController = app.service('mongo/connection/controller');
  }

  /**
   * write sync command execution on shell
   */
  writeSyncCommand(id, shellId, commands, responseType = 'json') {
    // this.output = '';
    const shell = this.mongoController.getMongoShell(id, shellId);
    const newCmd = commands.replace(/\r/g, '');
    // if (shell.isShellBusy()) {
    //   log.debug('shell is busy, put command in queue');
    //   return new Promise((resolve, reject) => {
    //     this
    //       .requestQueue
    //       .push({ shell, commands: newCmd, resolve, reject, responseType });
    //     log.debug('current queue commands ', this.requestQueue.length);
    //   });
    // }
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ shell, commands: newCmd, resolve, reject, responseType });
      this.runSyncCommandFromQueue();
    });
  }

  commandFinished(commands) {
    log.debug('commands finished ', commands, 'current queue size:', this.requestQueue.length);
    if (this.requestQueue.length > 0) {
      this.runSyncCommandFromQueue();
    }
  }

  /**
   * run the next request from the request queue.
   *
   */
  runSyncCommandFromQueue() {
    const newQueue = [];
    while (this.requestQueue.length > 0) {
      const req = this.requestQueue.shift();
      if (req && !req.shell.isShellBusy()) {
        this.runSyncCommandOnShell(req);
      } else if (req) {
        newQueue.push(req);
      }
    }
    this.requestQueue = newQueue;
  }

  // eslint-disable-next-line
  formatCommand(commands) {
    if (commands.indexOf('\n') >= 0) {
      const formatted = commands.split('\n').map(cmd => {
        return cmd.replace(/\/\/.*/, '');
      });
      return formatted.join(' ');
    }
    return commands;
  }

  runSyncCommandOnShell(req) {
    const { shell, commands, resolve, responseType } = req;
    const formatetedCmds = this.formatCommand(commands);
    const shellOutputs = [];
    shell.on(MongoShell.SYNC_OUTPUT_EVENT, this.outputListener.bind(this, shellOutputs));
    const syncExecutEnd = data => {
      log.debug('execution ended ', shellOutputs.join('\n'));
      shell.removeAllListeners(MongoShell.SYNC_OUTPUT_EVENT);
      shell.removeAllListeners(MongoShell.SYNC_EXECUTE_END);
      const filterThreeDot = shellOutputs.map(o => {
        return o.replace(/^[\s]*[\.]*/, ''); // eslint-disable-line
      });
      let output = filterThreeDot.join('\n') + data;
      log.debug('all sync output ', output);
      const commandStr = formatetedCmds.replace(/[\n|\r]+/g, '');
      log.debug('command:', commandStr);
      let filterOutput = output.replace(MongoShell.prompt, '').replace(/[\n|\r]+/g, '');
      log.debug('filtered output', filterOutput);
      while (filterOutput.indexOf(commandStr) >= 0) {
        filterOutput = filterOutput.replace(commandStr, '');
      }
      output = filterOutput;
      if (responseType === 'json' || responseType === 'explain') {
        output = output.replace(/\n/g, '').replace(/\r/g, '');
        output = output.replace(/ObjectId\("([a-zA-Z0-9]*)"\)/g, '"ObjectId(\'$1\')"');
        output = output.replace(/ISODate\("([a-zA-Z0-9-:.]*)"\)/g, '"ISODate(\'$1\')"');
        output = output.replace(/NumberLong\(([a-zA-Z0-9]*)\)/g, '"NumberLong(\'$1\')"');
        output = output.replace(/NumberLong\("([a-zA-Z0-9]*)"\)/g, '"NumberLong(\'$1\')"');
        output = output.replace(/Timestamp\(([a-zA-Z0-9.:-_, ]*)\)/g, '"ObjectId(\'$1\')"');
        output = output.replace(/(BinData\(\d*?\W)(\")(.*?)(\")(\))/g, '"$1\\$2$3\\$4$5"'); //eslint-disable-line
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
        resolve(shellOutputs.join('\n') + data);
      }
      this.emitter.emit('command::finished', formatetedCmds);
    };
    shell.on(MongoShell.SYNC_EXECUTE_END, syncExecutEnd.bind(this));
    this.currentCommand = { shell, formatetedCmds, resolve, responseType };
    shell.writeSyncCommand(formatetedCmds);
  }

  /**
   * Execute the command to change the shellID to the new Profile connection.
   */
  swapProfile(id, shellId, newProfile) {
    //eslint-disable-line
    const url = this.mongoController.connections[newProfile].url;
    const pw = this.mongoController.connections[newProfile].password;
    const username = this.mongoController.connections[newProfile].username;
    let commands = 'var db = ';
    if (
      this.mongoController.connections[newProfile].shellVersion.match(/^3.0.*/gi) ||
      this.mongoController.connections[newProfile].shellVersion.match(/^3.1.*/gi) ||
      this.mongoController.connections[newProfile].shellVersion.match(/^3.2.*/gi)
    ) {
      l.info(
        '!! WARNING: Running on outdated version of MongoShell, connection must be assigned to a variable. !!'
      );
    } else {
      l.info(
        'Old shell version not detected, version detected: ',
        this.mongoController.connections[newProfile].shellVersion
      );
    }
    if (username && pw) {
      commands += 'connect("' + url + '", "' + username + '", "' + pw + '")';
    } else if (username) {
      commands += 'connect("' + url + '", "' + username + '")';
    } else {
      commands += 'connect("' + url + '")';
    }
    // this.output = '';
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
      shell = this.mongoController.getMongoShell(id, shellId);
    }
    if (shell.isShellBusy()) {
      return new Promise(resolve => {
        this.requestQueue.push({ shell, commands, resolve });
      });
    }
    return new Promise(resolve => {
      this.requestQueue.push({ shell, commands, resolve });
      this.runSyncCommandFromQueue();
    });
  }

  // eslint-disable-next-line
  outputListener(shellOutputs, data) {
    shellOutputs.push(data);
  }
}

module.exports = function() {
  const app = this;
  // Initialize our service with any options it requires
  const service = new SyncExecutionController();
  app.use('mongo/sync-execution/controller', service);
  app.service('mongo/sync-execution/controller').before({
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
