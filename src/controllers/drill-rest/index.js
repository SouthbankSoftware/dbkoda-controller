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

import { loadCommands } from '../../config';

const exec = require('child_process').exec;
const errors = require('feathers-errors');
const hooks = require('feathers-hooks-common');
const request = require('request-promise');
const uuid = require('node-uuid');
const os = require('os');
const _ = require('lodash');
const drillJdbc = require('./jdbc-drill');
const JdbcApi = require('./jdbc-api');

const drillRestApi = {url: 'http://localhost:8047'};
const jdbcApiInst = new JdbcApi();
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
    this.profileHash = {};  // will store the profiles which have been added to Drill Instance
    this.connections = {};

    this.bDrillStarted = false;
    this.drillInstance;
    this.connectionAttempts = 0;

    this.checkDrillConnectionStatus = this.checkDrillConnectionStatus.bind(this);
  }

  setup(app) {
    this.app = app;
  }

  /**
     * create connections for mongodb instance
     */
  create(params) {
    const configObj = loadCommands();
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
      this.drillInstance = exec(drillCmdStr, drillOptions, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
      });
      this.bDrillStarted = true;
    }
    console.log('params:', params);
    const cParams = Object.assign({}, params);
    let badRequestError;
    return new Promise((resolve, reject) => {
      const resolveJdbcConnForProfile = (profile, profileDB) => {
        if (profile.DBHash[profileDB] == null) {
          this.createJdbcConnection(profile.alias).then((jdbcConn) => {
            console.log(jdbcConn);
            const jdbcConId = uuid.v1();
            profile.DBHash[profileDB] = jdbcConId;
            this.connections[jdbcConId] = {connection: jdbcConn, db: profileDB};
            jdbcApiInst.setup(jdbcConn);
            jdbcApiInst.query('use ' + profileDB).then((resultQuery) => {
              console.log('resultQuery:', resultQuery);
              resolve({id: jdbcConId, output: resultQuery});
            }).catch((err) => {
              badRequestError = new errors.BadRequest(err.message);
              console.log('execute query error:', err);
              reject(badRequestError);
            });
          }).catch((err) => {
            console.log('createJDBC Connection Error', err);
            badRequestError = new errors.BadRequest(err.message);
            reject(badRequestError);
          });
        } else {
          resolve({id: profile.DBHash[profileDB], output: profile.output});
        }
      };
      const cbConnectionResult = (result) => {
        if (result && result.status == 'Running!') {
          if (this.profileHash[cParams.alias] == null) {
            this.addProfile(cParams).then((resultProfile) => {
              console.log(resultProfile);
              const profile = {};
              profile.alias = cParams.alias;
              profile.output = JSON.stringify(resultProfile);
              profile.DBHash = {};
              this.profileHash[profile.alias] = profile;
              resolveJdbcConnForProfile(profile, cParams.db);
            })
            .catch((err) => {
              l.error('ProfileAddError: failed to add profile via Drill Rest API', err.message);
              badRequestError = new errors.BadRequest(err.message);
              reject(badRequestError);
            });
          } else {
            resolveJdbcConnForProfile(this.profileHash[cParams.alias], cParams.db);
          }
        } else {
          l.error('ConnectionFailed: unable to connect to drill interface');
          badRequestError = new errors.BadRequest('ConnectionFailed: unable to connect to drill interface');
          reject(badRequestError);
        }
      };
      this.checkDrillConnectionStatus(cbConnectionResult);
    });
  }

  // Function to ping the drill instance when it has started in the create function. Will try for 60 attempts.
  checkDrillConnectionStatus(cbFuncResult) {
    console.log('checkDrillConnectionStatus:', this.connectionAttempts);
    this.checkDrillConnection().then((result) => {
      cbFuncResult(result);
    }).catch((err) => {
      l.info('Ping drill instance till it comes online, Attempt: ' + this.connectionAttempts, err.message);
      if (this.connectionAttempts < 60) {
        this.connectionAttempts += 1;
        _.delay(this.checkDrillConnectionStatus, 1000, cbFuncResult);
      } else {
        cbFuncResult(null);
      }
    });
  }

  // Rest api call to check if the Drill Instance is running based on Request Promise
  checkDrillConnection() {
    const reqPromise = request.defaults({
      baseUrl: drillRestApi.url,
      json: true,
    });
    return reqPromise({
      uri: '/status.json',
      method: 'GET',
    });
  }

  // Rest api call to add a new profile to Embedded Drill Instance
  addProfile(profile) {
    console.log(profile);
    if (profile) {
      const reqPromise = request.defaults({
        baseUrl: drillRestApi.url,
        json: true,
      });
      return reqPromise({
        uri: '/storage/myplugin.json',
        method: 'POST',
        body: {
          name: profile.alias,
          config: {
            type: 'mongo',
            connection: profile.url,
            enabled: true
          }
        },
        json: true
      });
    }
    return null;
  }

  // Function to create a JDBC instance which will be used for query purpose
  createJdbcConnection(profileAlias) {
    return new Promise((resolve, reject) => {
      const conObj = {
        url: 'jdbc:drill:drillbit=localhost:31010;schema=' + profileAlias,
        minpoolsize: 5,
        maxpoolsize: 10,
      };
      drillJdbc.getJdbcInstance(conObj, (err, jdbcCon) => {
        if (err) {
          l.error(err);
          reject(err);
        } else {
          resolve(jdbcCon);
        }
      });
    });
  }

  remove(params) {
    try {
      if (!this.profileHash[params.alias] && !params.removeAll) {
        return Promise.reject('no profile found with the specified alias');
      } else if (params.removeAll) {
        this.quitDrillProcess();
        this.bDrillStarted = false;
        this.connectionAttempts = 0;  // resetting this for starting up drill next time.
        this.profileHash = {};
        this.profileDBHash = {};
        this.connections = {};
        return Promise.resolve(true);
      }
      delete this.profileHash[params.alias];
      return Promise.resolve(true);
    } catch (err) {
      l.error('get error', err);
      return Promise.reject('Failed to remove connection.');
    }
  }

  getData(id, params) {
    const jdbcCon = this.connections[id];
    if (jdbcCon) {
      jdbcApiInst.setup(jdbcCon.connection);
      const queryArray = params.queries; // ['use ' + jdbcCon.db].concat(params.queries);
      return new Promise((resolve, reject) => {
        jdbcApiInst.queryMultiple(queryArray).then((resultQueries) => {
          // const firstRes = resultQueries.shift();
          // console.log(JSON.stringify(firstRes));
          resolve(resultQueries);
        }).catch((err) => {
          reject(err);
        });
      });
    }
  }

  quitDrillProcess() {
    console.log('this.bDrillStarted:', this.bDrillStarted);
    if (this.drillInstance) {
      this.drillInstance.kill('SIGTERM');
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
    // remove: hooks.disallow('external'),
    // update: hooks.disallow('external'),
    // find: hooks.disallow('external'),
    get: hooks.disallow('external')
  });
  return service;
};

module.exports.DrillRestController = DrillRestController;