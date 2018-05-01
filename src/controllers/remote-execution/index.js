/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-23T16:57:13+11:00
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

import { clearTimeout } from 'timers';

const hooks = require('feathers-hooks-common');
const uuid = require('node-uuid');
const errors = require('feathers-errors');
const SshClient = require('ssh2').Client;
const _ = require('lodash');

class RemoteExecController {
  constructor(options) {
    this.options = options || {};
    this.connections = {};
    this.executeResolve = null;
    this.lastCmd = null;
  }

  setup(app) {
    this.app = app;
    this.remoteExecService = app.service('/ssh-remote-execution');
  }

  connect(params) {
    const that = this;
    return new Promise((resolve, reject) => {
      const client = new SshClient();
      client
        .on('ready', () => {
          const id = params.id ? params.id : uuid.v1();
          this.connections[id] = { client };
          console.log('Client :: ready');

          client.shell(
            false,
            {
              pty: true
            },
            (err, stream) => {
              if (err) {
                return reject(err);
              }
              stream.setEncoding('utf8');
              stream.on('data', data => {
                console.log('Stream :: data :', data);
                that.processData(id, data);
              });
              stream.on('finish', () => {
                console.log('Stream :: finish');
              });
              stream.stderr.on('data', data => {
                console.log('Stream :: strerr :: Data :', data);
                that.processData(id, data);
              });
              stream.on('close', (code, signal) => {
                console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                if (code !== 0) {
                  return reject(code);
                }
              });
              this.connections[id].stream = stream;
              resolve({ status: 'SUCCESS', id });
            }
          );
        })
        .on('error', err => {
          reject(new errors.BadRequest('Client Error: ' + err.message));
        })
        .connect(_.omit(params, 'cwd'));
    });
  }
  processData(id, data) {
    if (this.lastCmd === null) {
      this.remoteExecService.emit('ssh-shell-output', { id, data });
    } else {
      if (this.connections[id].dataReceivedTimer) {
        clearTimeout(this.connections[id].dataReceivedTimer);
      }
      if (this.connections[id].dataBuffer) {
        this.connections[id].dataBuffer += data.toString();
      } else {
        this.connections[id].dataBuffer = data.toString();
      }
      this.connections[id].dataReceivedTimer = setTimeout(() => {
        const result = this.connections[id].dataBuffer
          .replace(this.lastCmd, '')
          .replace(this.lastCmd, '');
        // this.remoteExecService.emit('ssh-shell-output', { id, data: result }); // No need to emit data to this service in case of sync execution.
        console.log('DataBuffer: ', result);
        if (this.executeResolve) {
          this.executeResolve({ status: 'SUCCESS', id, data: result });
        }
      }, 1000);
    }
  }
  execute(id, params) {
    const that = this;
    this.executeResolve = null;
    return new Promise((resolve, reject) => {
      if (this.connections[id] && this.connections[id].stream) {
        that.connections[id].dataBuffer = null;
        const { stream } = this.connections[id];
        let { cmd } = params;
        if (params.cwd) {
          cmd = `cd ${this.options.cwd}; ${cmd}`;
        }
        if (params.syncExecute) {
          this.lastCmd = cmd + '\n';
          this.executeResolve = resolve;
          stream.write(this.lastCmd);
        } else {
          this.lastCmd = null;
          stream.write(`${cmd}\n`);
          resolve({ status: 'SUCCESS', id, data: cmd });
        }
      } else {
        reject(new errors.BadRequest('Execute: Connection not found.'));
      }
    });
  }
  updateWindow(id, params) {
    return new Promise((resolve, reject) => {
      if (this.connections[id] && this.connections[id].stream) {
        if (params.rows && params.cols) {
          this.connections[id].stream.setWindow(params.rows, params.cols);
        }
      } else {
        reject(new errors.BadRequest('Delete Connection: Connection not found.'));
      }
    });
  }
  remove(id) {
    return new Promise((resolve, reject) => {
      if (this.connections[id]) {
        this.connections[id].client.end(); // client.end() function to terminate ssh shell
        delete this.connections[id];
        resolve({ status: 'SUCCESS', id });
      } else {
        reject(new errors.BadRequest('Delete Connection: Connection not found.'));
      }
    });
  }
}
module.exports = function() {
  const app = this;

  // Initialize our controller with any options it requires
  const controller = new RemoteExecController();
  app.use('ssh/remote-execution/controller', controller);

  // Get our initialize controller to that we can bind hooks
  const remoteExecController = app.service('ssh/remote-execution/controller');

  // Set up our before hooks
  remoteExecController.before({
    // Users can not be created by external access
    create: hooks.disallow('external'),
    remove: hooks.disallow('external'),
    update: hooks.disallow('external'),
    find: hooks.disallow('external'),
    get: hooks.disallow('external')
  });

  // Set up our after hooks
  remoteExecController.after(hooks.after);
  return controller;
};

module.exports.RemoteExecController = RemoteExecController;
