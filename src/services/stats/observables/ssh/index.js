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

import Rx, {Observable, Observer} from 'rxjs';
// $FlowFixMe
import {Client} from 'ssh2';
import _ from 'lodash';
// $FlowFixMe
import sshTunnel from 'open-ssh-tunnel';
// $FlowFixMe
import errors from 'feathers-errors';
import os from 'os';

import type {ObservableWrapper, ObservaleValue} from '../ObservableWrapper';
import {getKnowledgeBaseRules, items} from '../../knowledgeBase/ssh';

const loadCommands = require('../../../../config').loadCommands;


export default class SSHCounter implements ObservableWrapper {
  osType: Object = {};
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
  knowledgeBase: Object;

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

  getValueFromPair(pair: string): string {
    const split = pair.split('=');
    if (split.length > 1) {
      return split[1].replace(/"/g, '').trim();
    }
    return split[0];
  }

  createSshConnection(sshOpts: Object, resolve: Function, reject: Function) {
    this.client = new Client();
    this.client
      .on('ready', () => {
        log.info('Client :: ready');
        this.exeCmd('uname -s')
          .then((osType) => {
            if (osType) {
              this.osType.osType = osType.trim();
            }
            return this.exeCmd('cat /etc/os-release');
          })
          .then((release) => {
            log.info(release);
            if (!release) {
              const splitted = release.split(os.platform() === 'win32' ? '\n\r' : '\n');
              splitted.forEach((str) => {
                if (str.toLowerCase().match(/name=/)) {
                  this.osType.release = this.getValueFromPair(str);
                }
                if (str.toLowerCase().match(/version_id=/)) {
                  this.osType.version = this.getValueFromPair(str);
                }
              });
            }
            log.info('get os type ', this.osType);
            this.knowledgeBase = getKnowledgeBaseRules(this.osType);
            if (!this.knowledgeBase) {
              return reject(`Unsupported Operation System ${this.osType.os}`);
            }
            this.createShell(resolve, reject);
          });
      })
      .on('error', (err) => {
        reject(new errors.BadRequest('Client Error: ' + err.message));
      })
      .connect(_.omit(sshOpts, 'cwd'));
  }

  exeCmd(cmd: string): Promise<*> {
    let output = '';
    return new Promise((resolve) => {
      this.client.exec(cmd, (err, stream) => {
        stream.on('close', () => {
          resolve(output);
        }).on('data', (data) => {
          output += data.toString('utf8');
        }).stderr.on('data', (data) => {
          log.error(data);
          resolve(null);
        });
      });
    });
  }

  createShell(resolve: Function, reject: Function) {
    this.client.shell(
      false,
      {
        pty: false,
      },
      (err, stream) => {
        if (err) {
          log.error(err);
          return reject(err);
        }
        stream.setEncoding('utf8');
        stream.on('data', (data) => {
          this.postProcess(data);
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
        this.stream = stream;
        this.execute();
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

  postProcess(output: Object) {
    const o = this.knowledgeBase.parse(output);
    o.profileId = this.profileId;
    if (o.value) {
      this.observer.next(o);
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

