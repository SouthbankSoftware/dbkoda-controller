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

/* eslint-disable class-methods-use-this */

const hooks = require('feathers-hooks-common');
const fs = require('fs');
const sshTunnel = require('open-ssh-tunnel');
const request = require('request-promise');
const uuid = require('node-uuid');
/**
 * Mongo instance connection controller
 */
class DrillRestController {
  constructor(options) {
    this.options = options || {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      // retry to connect for 30 times
      reconnectTries: 30,
      // wait 1 second before retrying
      reconnectInterval: 1000,
    };
    this.connections = {};
    this.tunnels = {};
  }

  setup(app) {
    this.app = app;
  }

  /**
     * create connections for mongodb instance
     */
  create(params) {
    const conn = Object.assign({}, params);
    return this.createShellConnection(conn);
  }
  remove(id) {
    try {
        if (!this.connections[id]) {
          return Promise.resolve({id});
        }
        delete this.connections[id];
        return Promise.resolve({id});
    } catch (err) {
        l.error('get error', err);
        return Promise.reject('Failed to remove connection.');
      }
  }
  createShellConnection(params) {
    let connUrl = 'http://';
    if (params.ssl) {
      connUrl = 'https://';
    }
    connUrl += params.hostname;
    connUrl += ':';
    connUrl += params.port;

    const reqPromise = request.defaults({
      baseUrl: connUrl,
      json: true,
    });
    const connId = uuid.v1();

    this.connections[connId] = reqPromise;
    return connId;
  }
  createTunnel(params) {
    if (params.ssh) {
      const sshOpts = {
        host: params.sshHost, // ip address of the ssh server
        port: 22, // Number(params.sshPort), // port of the ssh server
        username: params.remoteUser,
        srcAddr: params.localHost,
        srcPort: Number(params.localPort),
        dstAddr: params.remoteHost, // ip address of mongo db server
        dstPort: Number(params.remotePort), // port of mongo db server
        localPort: Number(params.localPort),
        localAddr: params.localHost,
        readyTimeout: 5000,
        forwardTimeout: 5000,
      };
      if (params.sshKeyFile) {
        sshOpts.privateKey = fs.readFileSync(params.sshKeyFile);
        sshOpts.passphrase = params.passPhrase;
      } else {
        sshOpts.password = params.remotePass;
      }
      return sshTunnel(sshOpts);
    }
    return new Promise((resolve) => {
      resolve(null);
    });
  }
}

module.exports = function() {
  const app = this;
  // Initialize our service with any options it requires
  const service = new DrillRestController();
  app.use('drill/rest/controller', service);
  app.service('drill/rest/controller').before({
    // Users can not be created by external access
    create: hooks.disallow('external'),
    remove: hooks.disallow('external'),
    // update: hooks.disallow('external'),
    // find: hooks.disallow('external'),
    // get: hooks.disallow('external')
  });
  return service;
};

module.exports.DrillRestController = DrillRestController;
