/**
 * @Last modified by:   wahaj
 * @Last modified time: 2018-06-05T12:24:11+10:00
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

const { exec } = require('child_process');
const errors = require('feathers-errors');
const hooks = require('feathers-hooks-common');
const request = require('request-promise');
const psTree = require('ps-tree');
const os = require('os');
const _ = require('lodash');

const drillRestApi = {
  url: 'http://localhost:8047',
  controllerUrl: 'http://localhost:3031/api/v0/'
};

/**
 * Mongo instance connection controller
 */
class DrillRestController {
  constructor(options) {
    this.options = options || {};
    this.profileHash = {}; // will store the profiles which have been added to Drill Instance
    this.connections = {};

    this.bDrillStarted = false;
    this.bDrillControllerStarted = false;
    this.drillInstance;
    this.drillControllerInstance;
    this.connectionAttempts = 0;

    this.checkDrillConnectionStatus = this.checkDrillConnectionStatus.bind(this);
  }

  setup(app) {
    this.app = app;
  }

  async launchJavaControllProcess(drillPath, drillControllerPath) {
    const regExVer = /(\S+)(-)(\S+)/;
    const [, , , drillVersion] = regExVer.exec(drillPath);
    const cmd = `java -Dloader.path=${drillPath}/jars/jdbc-driver/drill-jdbc-all-${drillVersion}.jar -jar ${drillControllerPath}`;
    console.log('Drill Controller Command:', cmd);
    try {
      let success = false;
      const prom = new Promise(async (resolve, reject) => {
        this.drillControllerInstance = await exec(
          cmd,
          {
            encoding: 'utf8',
            timeout: 0,
            maxBuffer: 200 * 1024,
            killSignal: 'SIGTERM',
            cwd: drillPath,
            env: null
          },
          (stdout, stderr) => {
            console.log(`drill-controller:stdout: ${stdout}`);
            console.log(`drill-controller:stderr: ${stderr}`);
          }
        );
        this.drillControllerInstance.on('exit', code => {
          console.log('drill controller process exited with code ' + code);
        });
        this.checkDrillConnectionStatus(
          result => {
            log.info('check java controller status:', result);
            if (result && result.status === 'Running!') {
              success = true;
              resolve();
            } else {
              reject();
            }
          },
          true,
          `${drillRestApi.controllerUrl}/drill/status`
        );
      });
      await prom;
      return success;
    } catch (err) {
      log.error(err);
    }
  }

  /**
   * create connections for mongodb instance
   */
  create(params) {
    const configObj = global.config; // should be read-only
    log.info('Drill Cmd:', configObj.drillCmd);

    if (!configObj.drillCmd) {
      const err = new Error('Drill binary undetected');
      err.code = 'DRILL_BINARY_UNDETECTED';
      throw err;
    }
    // Check if Drill instance is not started and start the drill instance.
    if (!this.bDrillStarted) {
      let drillCmdStr = configObj.drillCmd + '/bin/sqlline';
      if (os.platform() === 'win32') {
        drillCmdStr += '.bat';
      }
      drillCmdStr += ' -u "jdbc:drill:zk=local"';
      console.log('drill cmd:', drillCmdStr);

      const drillOptions = {
        encoding: 'utf8',
        timeout: 0,
        maxBuffer: 200 * 1024,
        killSignal: 'SIGTERM',
        cwd: configObj.drillCmd + '/bin',
        env: null
      };
      this.drillInstance = exec(drillCmdStr, drillOptions, (stdout, stderr) => {
        console.log(`drill:stdout: ${stdout}`);
        console.log(`drill:stderr: ${stderr}`);
      });

      this.drillInstance.on('exit', code => {
        console.log('drill process exited with code ' + code);
      });
      this.bDrillStarted = true;
    }
    console.log('params:', params);
    const cParams = Object.assign({ database: params.db }, params);
    let badRequestError;
    return new Promise((resolve, reject) => {
      const cbConnectionResult = async result => {
        console.log(result);
        if (result && result.status == 'Running!') {
          if (!this.bDrillControllerStarted) {
            this.bDrillControllerStarted = await this.launchJavaControllProcess(
              configObj.drillCmd,
              configObj.drillControllerCmd
            );
          }
        }
        if (this.bDrillControllerStarted) {
          if (!this.profileHash[cParams.alias] || !this.profileHash[cParams.db]) {
            const reqPromise = request.defaults({
              baseUrl: drillRestApi.controllerUrl
            });
            try {
              reqPromise({
                uri: '/drill',
                method: 'POST',
                body: cParams,
                json: true
              })
                .then(resultProfile => {
                  log.info('result profile:', resultProfile);
                  const profile = {};
                  profile.alias = cParams.alias;
                  profile.id = cParams.id;
                  this.profileHash[profile.alias] = profile;
                  resolve({ id: cParams.id });
                })
                .catch(err => {
                  l.error('ProfileAddError: failed to add profile via Drill Rest API', err.message);
                  badRequestError = new errors.BadRequest(err.message);
                  reject(badRequestError);
                });
            } catch (err) {
              log.error(err);
            }
          } else {
            // resolveJdbcConnForProfile(this.profileHash[cParams.alias], cParams.db);
            resolve({ id: this.profileHash[cParams.alias].id });
          }
        } else {
          l.error('ConnectionFailed: unable to connect to drill interface');
          badRequestError = new errors.BadRequest(
            'ConnectionFailed: unable to connect to drill interface'
          );
          reject(badRequestError);
        }
      };
      this.checkDrillConnectionStatus(cbConnectionResult, true);
    });
  }

  // Function to ping the drill instance when it has started in the create function. Will try for 60 attempts.
  checkDrillConnectionStatus(
    cbFuncResult,
    bResetCount = false,
    url = `${drillRestApi.url}/status.json`
  ) {
    if (bResetCount) {
      this.connectionAttempts = 0;
    }
    log.info('checkDrillConnectionStatus:', this.connectionAttempts, ' ', url);
    this.checkDrillConnection(url)
      .then(result => {
        log.info('checkDrillConnectionStatus, result:', result);
        cbFuncResult(result);
      })
      .catch(err => {
        log.info(
          'Ping drill instance till it comes online, Attempt: ' + this.connectionAttempts,
          err.message
        );
        if (this.connectionAttempts < 60) {
          this.connectionAttempts += 1;
          _.delay(this.checkDrillConnectionStatus, 1000, cbFuncResult, false, url);
        } else {
          cbFuncResult(null);
        }
      });
  }

  // Rest api call to check if the Drill Instance is running based on Request Promise
  checkDrillConnection(url) {
    const reqPromise = request.defaults({
      baseUrl: url,
      json: true
    });
    return reqPromise({
      uri: '',
      method: 'GET'
    });
  }

  // Rest api call to add a new profile to Embedded Drill Instance
  addProfile(profile) {
    console.log(profile);
    if (profile) {
      const reqPromise = request.defaults({
        baseUrl: drillRestApi.controllerUrl
      });
      return reqPromise({
        uri: '/drill',
        method: 'POST',
        body: profile,
        json: true
      });
    }
    return null;
  }

  removeProfile(profile) {
    console.log(profile);
    if (profile) {
      const reqPromise = request.defaults({
        baseUrl: drillRestApi.controllerUrl,
        json: true
      });
      return reqPromise({
        uri: '/drill/profile/' + profile.id,
        method: 'DELETE',
        json: true
      });
    }
    return null;
  }

  remove(params) {
    try {
      if (!this.profileHash[params.alias] && !params.removeAll) {
        return Promise.reject(new errors.BadRequest('no profile found with the specified alias'));
      } else if (params.removeAll) {
        this.connectionAttempts = 0; // resetting this for starting up drill next time.
        const removeProfilePromises = [];
        for (const alias in this.profileHash) {
          if ({}.hasOwnProperty.call(this.profileHash, alias)) {
            const pRemove = this.removeProfile({ alias }).then(result => {
              console.log('removing profile: ', result);
            });
            removeProfilePromises.push(pRemove);
          }
        }
        this.profileHash = {};
        this.connections = {};

        Promise.all(removeProfilePromises).then(values => {
          console.log(values);
          this.quitDrillProcess();
          return Promise.resolve(true);
        });
      }

      return new Promise((resolve, reject) => {
        this.removeProfile(params)
          .then(result => {
            console.log(result);
            delete this.profileHash[params.alias];
            if (Object.keys(this.profileHash).length === 0) {
              this.quitDrillProcess();
            }
            resolve(true);
          })
          .catch(err => {
            reject(err.message);
          });
      });
    } catch (err) {
      l.error('get error', err);
      return Promise.reject(new errors.BadRequest('Failed to remove connection.'));
    }
  }

  getData(id, params) {
    const reqPromise = request.defaults({
      baseUrl: drillRestApi.controllerUrl,
      json: true
    });
    return new Promise((resolve, reject) => {
      try {
        reqPromise({
          uri: `/drill/executing/${id}/${params.schema}`,
          method: 'POST',
          form: { sql: params.queries.join('\n') },
          json: true
        })
          .then(res => {
            log.info('execute sql return');
            resolve(res);
          })
          .catch(err => {
            log.error('executing sql failed', err);
            reject(err);
          });
      } catch (err) {
        log.error('request failed ', err);
        reject(err);
      }
    });
  }

  quitDrillProcess() {
    console.log('this.bDrillStarted:', this.bDrillStarted);
    this.bDrillStarted = false;
    this.bDrillControllerStarted = false;
    if (this.drillInstance) {
      this.drillInstance.stdin.end();
      this.kill(this.drillInstance.pid, 'SIGTERM', () => {
        console.log('Drill got killed successfully!!');
      });
    }
    if (this.drillControllerInstance) {
      this.drillControllerInstance.stdin.end();
      this.kill(this.drillControllerInstance.pid, 'SIGTERM', () => {
        console.log('Drill controller got killed successfully!!');
      });
    }
  }
  kill(pid, signal, callback) {
    signal = signal || 'SIGKILL';
    callback = callback || function() {};
    const isWin = /^win/.test(process.platform);
    if (!isWin) {
      const killTree = true;
      if (killTree) {
        psTree(pid, (err, children) => {
          [pid]
            .concat(
              children.map(p => {
                return p.PID;
              })
            )
            .forEach(tpid => {
              try {
                process.kill(tpid, signal);
              } catch (ex) {
                log.error(ex);
              }
            });
          callback();
        });
      } else {
        try {
          process.kill(pid, signal);
        } catch (ex) {
          log.error(ex);
        }
        callback();
      }
    } else {
      const cp = require('child_process');
      cp.exec('taskkill /PID ' + pid + ' /T /F', { timeout: 5000 }, (error, stdout) => {
        if (stdout.indexOf('SUCCESS') >= 0) {
          callback();
        }
      });
    }
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
    get: hooks.disallow('external')
  });
  return service;
};

module.exports.DrillRestController = DrillRestController;
