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
  }

  setup(app) {
    this.app = app;
  }

  connect(params) {
    return new Promise((resolve, reject) => {
      const client = new SshClient();
      client
        .on('ready', () => {
          const id = uuid.v1();
          this.connections[id] = client;
          resolve({ status: 'SUCCESS', id });
        })
        .on('error', (err) => {
          reject(new errors.BadRequest(err.message));
        })
        .connect(_.omit(params, 'cwd'));
    });
  }

  execute(id, params) {
    return new Promise((resolve, reject) => {
      if (this.connections[id]) {
        const client = this.connections[id];
        let cmd = '';
        client.shell({ rows: 100, cols: 100 }, (err, stream) => {
          if (err) {
            return reject(err);
          }
          stream.setEncoding('utf8');
          const headerDelimiter = '__START__';
          stream.on('data', (data) => {
              console.log(data);
          });
          stream.on('close', (code) => {
            if (code !== 0) {
              return reject(code);
            }
            resolve();
          });
        //   resolve(stream);
          if (params.cwd) {
            cmd = `cd ${this.options.cwd}; ${cmd}`;
          }
          cmd = `export LANG=en_AU.UTF-8; echo ${headerDelimiter}; bash -c 'set -e; ${params.cmd}'; exit $?`;
          stream.end(cmd + '\n');
        });
      } else {
        reject(new errors.BadRequest('Execute: Connection not found.'));
      }
    });
  }

  remove(id) {
    return new Promise((resolve, reject) => {
        if (this.connections[id]) {
            this.connections[id].end();
            delete this.connections[id];
            resolve({status: 'SUCCESS', id});
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
    get: hooks.disallow('external'),
  });

  // Set up our after hooks
  remoteExecController.after(hooks.after);
  return controller;
};

module.exports.RemoteExecController = RemoteExecController;
