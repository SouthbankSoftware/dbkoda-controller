import { clearTimeout } from 'timers';

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
const hooks = require('feathers-hooks-common');
const uuid = require('node-uuid');
const errors = require('feathers-errors');
const SshClient = require('ssh2').Client;
const _ = require('lodash');

class RemoteExecController {
  constructor(options) {
    this.options = options || {};
    this.connections = {};
    this.dataReceivedTimer = null;
  }

  setup(app) {
    this.app = app;
    this.remoteExecService = app.service('/ssh-remote-execution');
  }

  connect(params) {
    return new Promise((resolve, reject) => {
      const client = new SshClient();
      client
        .on('ready', () => {
          const id = (params.id) ? params.id : uuid.v1();
          this.connections[id] = {client};
          console.log('Client :: ready');

          client.shell(false, {
            pty: true
          }, (err, stream) => {
            if (err) {
              return reject(err);
            }
            stream.setEncoding('utf8');
            this.connections[id].stream = stream;
            resolve({ status: 'SUCCESS', id });
          });
        })
        .on('error', (err) => {
          reject(new errors.BadRequest('Client Error: ' + err.message));
        })
        .connect(_.omit(params, 'cwd'));
    });
  }
  processData(id, data, resolve) {
    if (this.connections[id].dataReceivedTimer) {
      clearTimeout(this.connections[id].dataReceivedTimer);
    }
    if (this.connections[id].dataBuffer) {
      this.connections[id].dataBuffer += data;
    } else {
      this.connections[id].dataBuffer = data;
    }
    this.connections[id].dataReceivedTimer = setTimeout(() => {
      this.remoteExecService.emit('ssh-shell-output', { id, data });
      console.log('DataBuffer: ', this.connections[id].dataBuffer);
      resolve({ status: 'SUCCESS', id});
    }, 1000);
    return this.connections[id].dataReceivedTimer;
  }
  execute(id, params) {
    const that = this;
    return new Promise((resolve, reject) => {
      if (this.connections[id] && this.connections[id].client) {
        const stream = this.connections[id].stream;
        let cmd = '';
        cmd = params.cmd;
        if (params.cwd) {
          cmd = `cd ${this.options.cwd}; ${cmd}`;
        }
        if (params.rows && params.cols) {
          stream.setWindow(params.rows, params.cols);
        }
        stream.on('data', (data) => {
          that.processData(id, data, resolve);
        });
        stream.on('finish', () => {
          console.log('Stream Finished');
        });
        stream.stderr.on('data', (data) => {
          console.log('STDERR: ' + data);
        });

        stream.on('close', (code, signal) => {
          console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
          if (code !== 0) {
            return reject(code);
          }
        });

        stream.write(cmd + '\n');
      } else {
        reject(new errors.BadRequest('Execute: Connection not found.'));
      }
    });
  }

  remove(id) {
    return new Promise((resolve, reject) => {
      if (this.connections[id]) {
        this.connections[id].client.end();     // client.end() function to terminate ssh shell
        delete this.connections[id];
        resolve({ status: 'SUCCESS', id });
      } else {
        reject(
          new errors.BadRequest('Delete Connection: Connection not found.'),
        );
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
    get: hooks.disallow('external'),
  });

  // Set up our after hooks
  remoteExecController.after(hooks.after);
  return controller;
};

module.exports.RemoteExecController = RemoteExecController;
