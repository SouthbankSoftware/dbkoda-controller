/**
 * @flow
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

import {Observable, Observer} from 'rxjs';
// $FlowFixMe
import {Client} from 'ssh2';
import _ from 'lodash';
// $FlowFixMe
import sshTunnel from 'open-ssh-tunnel';
// $FlowFixMe
import errors from 'feathers-errors';
import type {ObservableWrapper, ObservaleValue} from '../ObservableWrapper';


const Rx = require('rxjs');
const os = require('os');

const loadCommands = require('../../../../config').loadCommands;

const sshKnowledge = require('../../knowledgeBase');

const {items} = sshKnowledge;


export default class SSHCounter implements ObservableWrapper {
  osType: string;
  config: Object;
  rxObservable: ?Observable<ObservaleValue> = null;
  items: Array<*>;
  profileId: string;
  mongoConnection: Object;
  client: Client;
  stream: Object;
  sendOsTypeCmd: boolean;
  observer: Observer<ObservaleValue>;
  displayName = 'SSH Stats';
  samplingRate: number;

  constructor() {
    this.config = {interval: 2, cmd: 'vmstat'};
    this.rxObservable = new Rx.Subject();
    this.items = items;
  }

  init(profileId: string, options: Object): Promise<*> {
    this.profileId = profileId;
    this.mongoConnection = options.mongoConnection;
    const configObj = loadCommands();
    if (configObj) {
      this.config.cmd = configObj.sshCounterCmd ? configObj.sshCounterCmd : 'vmstat';
      this.config.interval = configObj.sshCounterInterval ? configObj.sshCounterInterval : 2;
    }
    this.rxObservable = Observable.create((observer: Observer<ObservaleValue>) => {
      this.observer = observer;
      this.create(profileId);
      return () => {
        this.pause();
      };
    });
    return Promise.resolve();
  }

  createSshTunnel(params: Object): Promise<*> {
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

  create(id: string) {
    if (!this.mongoConnection) {
      throw new errors.BadRequest(`Connection not exist ${id}`);
    }
    return this.createConnection(this.mongoConnection);
  }

  createConnection(connObj: Object): Promise<*> {
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
          log.error(err);
        });
    });
  }

  createSshConnection(sshOpts: Object, resolve: Function, reject: Function) {
    this.client = new Client();
    this.client
      .on('ready', () => {
        log.info('Client :: ready');
        this.createShell(resolve, reject);
      })
      .on('error', (err) => {
        reject(new errors.BadRequest('Client Error: ' + err.message));
      })
      .connect(_.omit(sshOpts, 'cwd'));
  }

  createShell(resolve: Function, reject: Function) {
    this.client.shell(
      false,
      {
        pty: true,
      },
      (err, stream) => {
        if (err) {
          log.error(err);
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
            this.observer.error(`Doesnt support the OS ${this.osType}`);
          }
        });
        stream.on('finish', () => {
          log.info('Stream :: finish');
        });
        stream.stderr.on('data', (err) => {
          log.error('Stream :: strerr :: Data :', err);
          this.observer.error(err);
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

  resume(): Promise<*> {
    if (this.stream) {
      return new Promise((resolve, reject) => {
        this.createShell(resolve, reject);
      }).then(() => {
        this.execute();
      });
    }
    return Promise.reject();
  }

  postProcess(d: Object) {
    log.debug('post process ', d);
    // parse the vmstat command output
    const splited = d.split(os.platform() === 'win32' ? '\n\r' : '\n');
    const output: any = {timestamp: (new Date()).getTime(), profileId: this.profileId};
    splited.forEach((line) => {
      if (line.match(/procs/) && line.match(/memory/)) {
        // this is header
      } else if (line.match(/swpd/ && line.match(/buff/))) {
        // this is header
      } else {
        const items = _.without(line.split(' '), '');
        if (items.length >= 17) {
          const intItems = items.map(item => parseInt(item, 10));
          const data: any = {
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
          output.value = data;
        }
      }
    });
    if (output.value) {
      this.observer.next(output);
    }
  }

  /**
   * Destroy current observable. Any created resources should be recyled. `rxObservable` should be
   * set back to `null`
   */
  destroy(): Promise<*> {
    if (this.client) {
      this.client.destroy();
      this.rxObservable = null;
      return Promise.resolve();
    }
    this.observer.error('ssh connection doesnt exist');
    return Promise.reject();
  }

  setSamplingRate(rate: number): void {
    if (this.stream) {
      this.stream.close();
      this.samplingRate = rate;
      try {
        new Promise((resolve, reject) => {
          this.createShell(resolve, reject);
        }).then(() => {
          this.config.interval = rate;
          this.execute();
        });
      } catch (err) {
        log.error(err);
        this.observer.error(err);
      }
    } else {
      this.observer.error('ssh connection doesnt exist');
    }
  }
}

