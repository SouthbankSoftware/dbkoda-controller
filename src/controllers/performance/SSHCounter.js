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
const os = require('os');

class SSHCounter {
  constructor(connectCtr) {
    this.connectCtr = connectCtr;
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

  create(params) {
    const connObj = this.connectCtr.connections[params.id];
    if (!connObj) {
      throw new errors.BadRequest(`Connection not exist ${id}`);
    }
    return this.createConnection(connObj);
  }

  createConnection(connObj) {
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
              if (this.osType) {
                this.postProcess(data);
              } else if (!this.osType && this.sendOsTypeCmd) {
                if (data.match(/linux/i)) {
                  // this is linux os
                  this.osType = data;
                  this.execute(id);
                }
              } else if (this.osType && this.sendOsTypeCmd) {
                this.sshObservable.onError(`Doesnt support the OS ${this.osType}`);
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
            this.stream = stream;
            return resolve({status: 'SUCCESS', id});
          }
        );
      })
      .on('error', (err) => {
        reject(new errors.BadRequest('Client Error: ' + err.message));
      })
      .connect(_.omit(sshOpts, 'cwd'));
  }

  execute(id) {
    if (!this.stream) {
      throw new errors.BadRequest(`Connection not exist ${id}`);
    }
    if (this.paused) {
      return;
    }
    log.debug('write command ', `${this.config.cmd} ${this.config.interval}`);
    this.stream.write(`${this.config.cmd} ${this.config.interval}\n`);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  postProcess(data) {
    log.debug('post process ', data);
    // parse the vmstat command output
    const splited = data.split(os.platform() === 'win32' ? '\n\r' : '\n');
    let output = {};
    splited.forEach((line) => {
      if (line.match(/procs/) && line.match(/memory/)) {
        // this is header
      } else if (line.match(/swpd/ && line.match(/buff/))) {
        // this is header
      } else {
        const items = _.without(line.split(' '), '');
        console.log('items=', items);
        if (items.length >= 17) {
          const intItems = items.map(item => parseInt(item));
          const data = {
            details: {
              procs: {
                r: parseInt(intItems[0]), // The number of processes waiting for run time
                b: intItems[1], // The number of processes in uninterruptible sleep,
              },
              memory: {
                swpd: intItems[2], //the amount of virtual memory used.
                free: intItems[3], // the amount of idle memory
                buff: intItems[4], //the amount of memory used as buffers
                cache: intItems[5], // the amount of memory used as cache
              },
              swap: {
                si: intItems[6], // Amount of memory swapped in from disk
                so: intItems[7], // Amount of memory swapped to disk (/s).
              },
              io: {
                bi: intItems[8], // Blocks received from a block device (blocks/s).
                bo: intItems[9], // Blocks sent to a block device (blocks/s).
              },
              system: {
                in: intItems[10],  // The number of interrupts per second, including the clock.
                cs: intItems[11],  // The number of context switches per second
              },
              cpu: {
                us: intItems[12],  //  Time spent running non-kernel code. (user time, including nice time)
                sy: intItems[13],  //  Time spent running kernel code. (system time)
                id: intItems[14],  //  Time spent idle. Prior to Linux 2.5.41, this includes IO-wait time
                wa: intItems[15],  //  Time spent waiting for IO. Prior to Linux 2.5.41, included in idle.
                st: intItems[16],  //  Time stolen from a virtual machine. Prior to Linux 2.6.11, unknown
              }
            }
          };
          data.cpu = {used: data.details.cpu.us + data.details.cpu.sy + data.details.cpu.wa + data.details.cpu.st};
          data.memory = {
            total: data.details.memory.swpd + data.details.memory.buff + data.details.memory.cache + data.details.memory.free,
            used: data.details.memory.swpd + data.details.memory.buff + data.details.memory.cache
          };
          output = data;
        }
      }
    });
    this.sshObservable.onNext(output);

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
