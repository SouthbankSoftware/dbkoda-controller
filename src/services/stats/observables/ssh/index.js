/**
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

const sshKnowledge = require('../../knowledgeBase');
const SshClient = require('ssh2').Client;
const _ = require('lodash');
const sshTunnel = require('open-ssh-tunnel');
const errors = require('feathers-errors');
const Rx = require('rxjs');
const os = require('os');

const {items} = sshKnowledge;
const Observable = require('../Observable');

const loadCommands = require('../../../../config').loadCommands;

class SSHCounter implements Observable {
  constructor() {
    this.osType = null;
    this.config = {interval: 2, cmd: 'vmstat'};
    this.rxObservable = new Rx.Subject();
    this.items = items;
  }

  init(profileId, options) {
    this.rxObservable = new Rx.Subject();
    this.profileId = profileId;
    this.mongoConnection = options ? options.mongoConnection : null;
    const configObj = loadCommands();
    if (configObj) {
      this.config.cmd = configObj.sshCounterCmd ? configObj.sshCounterCmd : 'vmstat';
      this.config.interval = configObj.sshCounterInterval ? configObj.sshCounterInterval : 2;
    }
    return this.create(profileId);
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

  create(id) {
    if (!this.mongoConnection) {
      throw new errors.BadRequest(`Connection not exist ${id}`);
    }
    return this.createConnection(this.mongoConnection);
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
          l.error(err);
        });
    });
  }

  createSshConnection(sshOpts, resolve, reject) {
    this.client = new SshClient();
    this.client
      .on('ready', () => {
        l.info('Client :: ready');
        this.createShell(resolve, reject);
      })
      .on('error', (err) => {
        reject(new errors.BadRequest('Client Error: ' + err.message));
      })
      .connect(_.omit(sshOpts, 'cwd'));
  }

  createShell(resolve, reject) {
    this.client.shell(
      false,
      {
        pty: true,
      },
      (err, stream) => {
        if (err) {
          l.error(err);
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
              this.execute();
            }
          } else if (this.osType && this.sendOsTypeCmd) {
            this.rxObservable.error(`Doesnt support the OS ${this.osType}`);
          }
        });
        stream.on('finish', () => {
          log.info('Stream :: finish');
        });
        stream.stderr.on('data', (err) => {
          log.error('Stream :: strerr :: Data :', err);
          this.rxObservable.error(err);
        });
        stream.on('close', (code, signal) => {
          log.info(
            'Stream :: close :: code: ' + code + ', signal: ' + signal
          );
        });
        this.sendOsTypeCmd = true;
        if (!this.osType) {
          stream.write('uname\n');
        }
        this.stream = stream;
        return resolve();
      }
    );
  }

  execute() {
    if (!this.stream) {
      throw new errors.BadRequest(`Connection not exist ${this.profileId}`);
    }
    this.stream.write(`${this.config.cmd} ${this.config.interval}\n`);
  }

  pause() {
    if (this.stream) {
      this.stream.close();
    }
  }

  resume() {
    if (this.stream) {
      return new Promise((resolve, reject) => {
        this.createShell(resolve, reject);
      }).then(() => {
        this.execute();
      });
    }
  }

  postProcess(data) {
    log.debug('post process ', data);
    // parse the vmstat command output
    const splited = data.split(os.platform() === 'win32' ? '\n\r' : '\n');
    const output = {timestamp: (new Date()).getTime(), profileId: this.profileId};
    splited.forEach((line) => {
      if (line.match(/procs/) && line.match(/memory/)) {
        // this is header
      } else if (line.match(/swpd/ && line.match(/buff/))) {
        // this is header
      } else {
        const items = _.without(line.split(' '), '');
        if (items.length >= 17) {
          const intItems = items.map(item => parseInt(item, 10));
          const data = {
            details: {
              procs: {
                r: intItems[0], // The number of processes waiting for run time
                b: intItems[1], // The number of processes in uninterruptible sleep,
              },
              memory: {
                swpd: intItems[2], // the amount of virtual memory used.
                free: intItems[3], // the amount of idle memory
                buff: intItems[4], // the amount of memory used as buffers
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
                in: intItems[10], // The number of interrupts per second, including the clock.
                cs: intItems[11], // The number of context switches per second
              },
              cpu: {
                us: intItems[12], //  Time spent running non-kernel code. (user time, including nice time)
                sy: intItems[13], //  Time spent running kernel code. (system time)
                id: intItems[14], //  Time spent idle. Prior to Linux 2.5.41, this includes IO-wait time
                wa: intItems[15], //  Time spent waiting for IO. Prior to Linux 2.5.41, included in idle.
                st: intItems[16], //  Time stolen from a virtual machine. Prior to Linux 2.6.11, unknown
              }
            }
          };
          data.cpu = {usage: data.details.cpu.us + data.details.cpu.sy + data.details.cpu.wa + data.details.cpu.st};
          const totalMemory = data.details.memory.swpd + data.details.memory.buff + data.details.memory.cache + data.details.memory.free;
          const usedMemory = data.details.memory.swpd + data.details.memory.buff;
          data.memory = {
            usage: parseInt((usedMemory / totalMemory) * 100, 10),
          };
          data.dist = data.details.io;
          output.value = data;
        }
      }
    });
    this.rxObservable.next(output);
  }

  /**
   * Destroy current observable. Any created resources should be recyled. `rxObservable` should be
   * set back to `null`
   */
  destroy() {
    if (this.client) {
      this.client.destroy();
      this.rxObservable.unsubscribe();
    } else {
      this.rxObservable.error('ssh connection doesnt exist');
    }
  }

  set samplingRate(rate) {
    if (this.stream) {
      this.stream.close();
      try {
        new Promise((resolve, reject) => {
          this.createShell(resolve, reject);
        }).then(() => {
          this.config.interval = rate;
          this.execute();
        });
      } catch (err) {
        l.error(err);
        this.rxObservable.error(err);
      }
    } else {
      this.rxObservable.error('ssh connection doesnt exist');
    }
  }
}

module.exports = SSHCounter;
