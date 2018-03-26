/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-15T15:47:44+11:00
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

/* eslint-disable class-methods-use-this */

import { Observable, Observer } from 'rxjs';
// $FlowFixMe
import { Client } from 'ssh2';
import _ from 'lodash';
// $FlowFixMe
import sshTunnel from 'open-ssh-tunnel';
// $FlowFixMe
import errors from 'feathers-errors';
import os from 'os';

import type { ObservableWrapper, ObservaleValue } from '../ObservableWrapper';
import { getKnowledgeBaseRules, items } from '../../knowledgeBase/ssh';
import { buildCommands } from '../../knowledgeBase/utils';
import {ErrorCodes} from '../../../../errors/Errors';

export default class SSHCounter implements ObservableWrapper {
  osType: Object = {};
  config: Object;
  rxObservable: ?Observable<ObservaleValue> = null;
  items: Array<*>;
  profileId: string;
  mongoConnection: Object;
  client: Client;
  observer: Observer<ObservaleValue>;
  displayName = 'SSH Stats';
  samplingRate: number;
  knowledgeBase: Object;
  statsCmds: Object;
  intervalId: number;
  historyData: Object = {};
  reconnectTimes: number = 0;
  sshConnectionRetryTimes = 24;
  reconnecting = false;

  constructor() {
    this.items = items;
    this.items.forEach(item => {
      this.historyData[item] = {};
    });
  }

  init(options: Object): Promise<*> {
    this.mongoConnection = options.mongoConnection;
    return this.create(this.profileId).then(() => {
      this.rxObservable = Observable.create(
        (observer: Observer<ObservaleValue>) => {
          this.knowledgeBase.samplingRate = this.samplingRate / 1000;
          this.statsCmds = buildCommands(this.knowledgeBase);
          if (!this.statsCmds || _.isEmpty(this.statsCmds)) {
            this.emitError(
              'Cant find command from knowledge base on ' + this.osType
            );
            l.error('Cant find command from knowledge base on ' + this.osType);
          }
          this.observer = observer;
          this.execute();
          return () => {
            this.pause();
          };
        }
      );
    });
  }

  createSshTunnel(params: Object): Promise<*> {
    if (params.sshTunnel && !params.sshTunnel) {
      // disable ssh tunnel for now
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
        forwardTimeout: 5000
      };
      return sshTunnel(sshOpts);
    }
    return Promise.resolve();
  }

  create(id: string) {
    if (!this.mongoConnection) {
      return Promise.reject(new Error(`Connection not exist ${id}`));
    }
    if (this.mongoConnection.sshOpts && !this.mongoConnection.sshOpts.host) {
      return Promise.reject({code: ErrorCodes.SSH_NOT_ENABLED});
    }
    return this.createConnection(this.mongoConnection);
  }

  createConnection(connObj: Object): Promise<*> {
    let sshOpts = {};
    return new Promise((resolve, reject) => {
      this.createSshTunnel(connObj)
        .then(res => {
          if (res) {
            // ssh tunnel case
            sshOpts.host = connObj.localHost;
            sshOpts.port = connObj.localPort;
            sshOpts.username = connObj.sshUser;
            sshOpts.password = connObj.sshPassword;
          } else {
            // direct ssh connection
            sshOpts = connObj.sshOpts;
          }
          this.createSshConnection(sshOpts, resolve, reject);
        })
        .catch(err => {
          log.error(err);
          this.emitError('Stats connection failed.');
          reject(err);
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
        // log.info('SSH Client :: ready');
        this.exeCmd('uname -s')
          .then(osType => {
            if (osType) {
              this.osType.osType = osType.toLowerCase().trim();
              if (this.osType.osType === 'linux') {
                return this.exeCmd('cat /etc/os-release', true);
              }
            }
          })
          .then(release => {
            if (release) {
              const splitted = release.split(
                os.platform() === 'win32' ? '\n\r' : '\n'
              );
              splitted.forEach(str => {
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
              this.emitError('Unsupported Operation System', 'error');
              return reject(
                new Error(`Unsupported Operation System ${this.osType.os}`)
              );
            }
            resolve();
          })
          .catch(err => {
            reject(err);
          });
      })
      .on('error', err => {
        this.emitError({code: ErrorCodes.SSH_CONNECTION_CLOSED});
        reject(new errors.BadRequest('Client Error: ' + err.message));
      })
      .connect(_.omit({ ...sshOpts, readyTimeout: 30000 }, 'cwd'));
  }

  exeCmd(cmd: string, ignoreError: boolean = false): Promise<*> {
    let output = '';
    return new Promise((resolve, reject) => {
      try {
        if (!this.client) {
          this.emitError('Connection is not open');
          return reject(new Error('Connection is not open.'));
        }
        this.client.exec(cmd, (err, stream) => {
          if (err || !stream) {
            if (!ignoreError) {
              log.error(err);
              return reject(new Error('Failed to run command through SSH.'));
            }
            return resolve(null);
          }
          stream
            .on('close', () => {
              resolve(output);
            })
            .on('data', data => {
              output += data.toString('utf8');
            })
            .stderr.on('data', data => {
              // error
              !ignoreError && log.error(data.toString('utf8'));
              resolve(null);
            });
        });
      } catch (err) {
        // if connection is disconnected
        if (!this.reconnecting) {
          this.reconnecting = true;
          this.reconnectTimeout = setInterval(() => this.reconnectSSH(), 5000);
        }
        reject(err);
      }
    });
  }

  reconnectSSH() {
    const p = new Promise((resolve, reject) => {
      this.createSshConnection(this.mongoConnection.sshOpts, resolve, reject);
    });
    p.then(() => {
      // reconnect success
      l.info('ssh reconnect successfully');
      this.reconnectTimes = 0;
      this.statsCmds = buildCommands(this.knowledgeBase);
      clearInterval(this.reconnectTimeout);
      this.reconnecting = false;
    }).catch(() => {
      l.error(`reconnect ssh ${this.reconnectTimes + 1} times failed.`);
      if (this.reconnectTimes < this.sshConnectionRetryTimes && this.reconnecting && this.rxObservable) {
        this.reconnectTimes += 1;
      } else {
        l.error('ssh reconnect failed');
        this.reconnecting = false;
        this.reconnectTimes = 0;
        clearInterval(this.reconnectTimeout);
        this.emitError({code: ErrorCodes.SSH_CONNECTION_CLOSED}, 'warn');
      }
    });
  }

  execute() {
    const runCommand = () => {
      _.forOwn(this.statsCmds, (v, k) => {
        this.exeCmd(v)
          .then(output => {
            try {
              this.postProcess(output, k);
            } catch (err) {
              l.error(err);
              delete this.statsCmds[k];
              // this.emitError(
              //   `parse command ${this.statsCmds[k].split(' ')[0]} failed.`
              // );
              delete this.statsCmds[k];
              // if (_.isEmpty(this.statsCmds)) {
              //   this.observer.complete();
              // }
            }
          })
          .catch(err => {
            l.error(err);
            l.error(`run command ${this.statsCmds[k].split(' ')[0]} failed.`);
            // this.emitError(
            //   `run command ${this.statsCmds[k].split(' ')[0]} failed.`
            // );
            delete this.statsCmds[k];
            // if (_.isEmpty(this.statsCmds)) {
            //   this.observer.complete();
            // }
          });
      });
    };
    runCommand();
    this.intervalId = setInterval(() => {
      runCommand();
    }, this.samplingRate);
  }

  pause() {
    clearInterval(this.intervalId);
  }

  postProcess(output: Object, k: string) {
    const params = { output, previous: {} };
    if (this.historyData[k] && this.historyData[k].previous !== undefined) {
      params.previous = this.historyData[k].previous;
    }
    const o = this.knowledgeBase.parse(k, params, this.samplingRate);
    if (o && o.value) {
      const nextObj = _.pick(o, ['value', 'timestamp']);
      nextObj.profileId = this.profileId;
      nextObj.value = _.pick(o.value, this.items);
      l.debug('get ssh stats', nextObj);
      _.keys(nextObj.value).forEach(key => {
        if (
          typeof nextObj.value[key] === 'number' &&
          (!this.historyData[key].maximum ||
            nextObj.value[key] > this.historyData[key].maximum)
        ) {
          this.historyData[key].maximum = nextObj.value[key];
        }
        if (this.historyData[key].previous) {
          _.forOwn(nextObj.value[key], (v, subKey) => {
            if (
              this.historyData[key].previous[subKey] !== undefined &&
              typeof v === 'number' &&
              typeof this.historyData[key].previous[subKey] === 'number'
            ) {
              nextObj.value[key][`${subKey}Delta`] = Math.abs(
                v - this.historyData[key].previous[subKey]
              );
              if (
                nextObj.timestamp &&
                this.historyData[key].previousTimestamp
              ) {
                const sr =
                  nextObj.timestamp - this.historyData[key].previousTimestamp;
                if (sr > 0) {
                  nextObj.value[key][`${subKey}PerSec`] =
                    nextObj.value[key][`${subKey}Delta`] / (sr / 1000);
                }
              }
            }
          });
        }
        this.historyData[key].previous = nextObj.value[key];
        this.historyData[key].previousTimestamp = nextObj.timestamp;
      });
      this.observer.next(nextObj);
    }
  }

  /**
   * Destroy current observable. Any created resources should be recyled. `rxObservable` should be
   * set back to `null`
   */
  destroy(): Promise<*> {
    clearInterval(this.intervalId);
    clearInterval(this.reconnectTimeout);
    if (this.client) {
      this.client.end();
      this.client = null;
      this.rxObservable = null;
      return Promise.resolve();
    }
    return Promise.reject(new Error('ssh connection doesnt exist', 'error'));
  }
}
