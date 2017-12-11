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
 * Created by joey on 8/12/17.
 */

/* eslint-disable */

const SshClient = require('ssh2').Client;
const uuid = require('node-uuid');
const _ = require('lodash');
const sshTunnel = require('open-ssh-tunnel');
const errors = require('feathers-errors');
const Rx = require('rx');

class SSHCounter {
  constructor(connectCtr) {
    this.connectCtr = connectCtr;
    this.connections = [];
    this.sshObservable = new Rx.Subject();
    this.paused = false;
    this.osType = null;
    this.config = {interval: 2, cmd: 'vmstat'};
  }

  createSshTunnel(params) {
    if (params.sshTunnel && !params.sshTunnel) { // disable ssh tunnel for now
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
        password: params.remotePass,
        forwardTimeout: 5000,
      };
      return sshTunnel(sshOpts);
    }
    return Promise.resolve();
  }

  getSshOpts(params) {
    return {
      host: params.localHost,
      port: params.localPort,
    };
  }

  create(params) {
    const connObj = this.connectCtr.connections[params.id];
    const sshOpts = {};
    return new Promise((resolve, reject) => {
      this
        .createSshTunnel(connObj)
        .then((res) => {
          if (res) {
            // ssh tunnel case
            sshOpts.host = connObj.localHost;
            sshOpts.port = connObj.localPort;
            sshOpts.username = connObj.sshUser;
            sshOpts.password = connObj.sshPassword;
          } else {
            // direct ssh connection
            sshOpts.host = connObj.sshOpts.host;
            sshOpts.username = connObj.sshOpts.username;
            sshOpts.password = connObj.sshOpts.password;
            sshOpts.port = connObj.sshOpts.port;
          }
          this.createSshConnection(sshOpts, resolve, reject);
        })
        .catch((err) => {
          console.error(err);
        });
    });
  }

  createSshConnection(sshOpts, resolve, reject) {
    const client = new SshClient();
    client
      .on('ready', () => {
        const id = sshOpts.id ? sshOpts.id : uuid.v1();
        this.connections[id] = {client};
        console.log('Client :: ready');
        client.shell(
          false,
          {
            pty: true,
          },
          (err, stream) => {
            if (err) {
              return reject(err);
            }
            stream.setEncoding('utf8');
            stream.on('data', (data) => {
              log.info('Stream :: data :', data);
              if (this.osType) {
                this.postProcess(data);
              }
              if (!this.osType && this.sendOsTypeCmd) {
                if (data.match(/linux/i)) {
                  // this is linux os
                  this.osType = data;
                  this.execute(id);
                }
              }
            });
            stream.on('finish', () => {
              log.info('Stream :: finish');
            });
            stream.stderr.on('data', (err) => {
              log.error('Stream :: strerr :: Data :', err);
              this.sshObservable.onError(err);
            });
            stream.on('close', (code, signal) => {
              log.info(
                'Stream :: close :: code: ' + code + ', signal: ' + signal
              );
              this.sshObservable.dispose();
              if (code !== 0) {
                return reject(code);
              }
            });
            this.sendOsTypeCmd = true;
            stream.write('uname\n');
            this.connections[id].stream = stream;
            resolve({status: 'SUCCESS', id});
          }
        );
      })
      .on('error', (err) => {
        reject(new errors.BadRequest('Client Error: ' + err.message));
      })
      .connect(_.omit(sshOpts, 'cwd'));
  }

  execute(id) {
    if (!this.connections[id]) {
      throw new errors.BadRequest(`Connection not exist ${id}`);
    }
    if (this.paused) {
      return;
    }
    const {stream} = this.connections[id];
    log.debug('write command ', `${this.config.cmd} ${this.config.interval}`);
    stream.write(`${this.config.cmd} ${this.config.interval}\n`);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  postProcess(data) {
    // parse the vmstat command output
    this.sshObservable.onNext(data);

  }

  /**
   * reconnect to new host
   *
   * @param params
   */
  reconnect(params) {
    log.info(`reconnect to host ${params} through ssh`);
  }
}

module.exports = SSHCounter;
