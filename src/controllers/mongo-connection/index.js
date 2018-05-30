/**
 * @Last modified by:   wahaj
 * @Last modified time: 2018-05-30T09:39:03+10:00
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

const hooks = require('feathers-hooks-common');
const mongodb = require('mongodb');
const errors = require('feathers-errors');
const _ = require('lodash');
const fs = require('fs');
const sshTunnel = require('open-ssh-tunnel');
const { MongoShell } = require('../mongo-shell');
const mongoUri = require('mongodb-uri');
const MongoConnection = require('./connection');
const Status = require('./status');
const ConnectionListener = require('./connection-listener');
const uuid = require('node-uuid');
const { Errors } = require('../../errors/Errors');

const { Mongos, ReplSet, Server } = mongodb;

/**
 * Mongo instance connection controller
 */
class MongoConnectionController {
  constructor(options) {
    this.options = options || {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      // retry to connect for 120 times
      reconnectTries: 120,
      // wait 1 second before retrying
      reconnectInterval: 1000
    };
    this.mongoClient = mongodb.MongoClient;
    this.connections = {};
    this.tunnels = {};
  }

  setup(app) {
    this.app = app;
    this.mongoShell = app.service('/mongo-shells');
    this.passwordService = app.service('/master-pass');
  }

  getMongoScriptsPath() {
    let mongoScriptsPath;
    if (global.IS_PROD) {
      mongoScriptsPath = process.env.MONGO_SCRIPTS_PATH;
    } else {
      mongoScriptsPath = this.app.get('mongoScripts');
    }
    return mongoScriptsPath;
  }

  async getTunnelParams(params) {
    const sshOpts = {
      // enabled tunnel
      host: params.sshHost, // ip address of the ssh server
      port: Number(params.sshPort), // port of the ssh server
      username: params.remoteUser,
      srcAddr: params.localHost,
      srcPort: Number(params.localPort),
      dstAddr: params.remoteHost, // ip address of mongo db server
      dstPort: Number(params.remotePort), // port of mongo db server
      localPort: Number(params.localPort),
      localAddr: params.localHost,
      readyTimeout: 5000,
      forwardTimeout: 5000,
      sshTunnel: params.sshTunnel
    };
    if (!sshOpts.port) {
      sshOpts.port = 22;
    }
    l.info(`Connect SSH Port: ${sshOpts.port}`);
    if (params.usePasswordStore) {
      // Do password store stuff
      if (params.sshKeyFile) {
        sshOpts.privateKey = fs.readFileSync(params.sshKeyFile);
        try {
          sshOpts.passPhrase = await this.getStorePassword(
            params.id,
            params.remoteUser,
            params.passPhrase,
            '-s'
          );
        } catch (err) {
          l.error(err);
        }
      } else {
        sshOpts.password = await this.getStorePassword(
          params.id,
          params.remoteUser,
          params.remotePass,
          '-s'
        );
      }
    } else if (params.sshKeyFile) {
      sshOpts.privateKey = fs.readFileSync(params.sshKeyFile);
      sshOpts.passphrase = params.passPhrase;
    } else {
      sshOpts.password = params.remotePass;
    }
    return sshOpts;
  }

  async getStorePassword(id, username, password, postfix = '') {
    if (!username) {
      return '';
    }
    if (username && !password) {
      // Password store in use, no password sent
      return this.passwordService.get(`${id}${postfix}`);
    }
    await this.passwordService.patch(`${id}${postfix}`, { password });
    return password;
  }

  createTunnel(sshOpts) {
    if (sshOpts.sshTunnel) {
      return sshTunnel(sshOpts);
    }
    return new Promise(resolve => {
      resolve(null);
    });
  }

  /**
   * create connections for mongodb instance
   */
  async create(params) {
    let conn = Object.assign({}, params);
    conn = this.parseMongoConnectionURI(conn);
    let db;
    let dbVersion;
    let tunnel;
    let addNewPassword = false;

    if (conn.usePasswordStore && conn.username) {
      if (conn.password) {
        if (!conn.id) {
          addNewPassword = true;
        } else {
          await this.passwordService.patch(conn.id, {
            password: conn.password
          });
        }
      } else {
        conn.password = await this.passwordService.get(conn.id);
      }
    }
    const options = { ...this.options };
    const sshOpts = await this.getTunnelParams(params);
    return new Promise((resolve, reject) => {
      this.createTunnel(sshOpts)
        .then(resTunnel => {
          if (resTunnel) {
            l.info('Tunnel created successfully', resTunnel);
            tunnel = resTunnel;
          }
          conn.sshOpts = sshOpts;
          // l.debug('ssh opts ', conn);
          if (conn.username && conn.password) {
            options.auth = { user: conn.username, password: conn.password };
          }
          this.mongoClient.connect(conn.url, options, (err, db) => {
            if (err !== null) {
              l.error('failed to connect mongo instance ', err.message);
              const badRequest = new errors.BadRequest(err.message);
              return reject(badRequest);
            }
            if (!db || !db.topology) {
              l.error('failed to get database instance ');
              return reject(new errors.BadRequest('Failed to connect Mongo instance'));
            }
            l.info('Connected successfully to server');
            resolve(db);
          });
        })
        .catch(err => {
          l.error('failed to connect mongo instance ', err.message);
          const badRequest = new errors.BadRequest(err.message);
          return reject(badRequest);
        });
    })
      .then(v => {
        db = v;
        return db.db(conn.database).command({ buildinfo: 1 });
      })
      .then(v => {
        dbVersion = v.version;
        return db;
      })
      .then(() => {
        return this.checkAuthorization(db.db(conn.database))
          .then(v => {
            log.debug('check authorization success ', v);
            return db;
          })
          .catch(e => {
            log.error('cant list collections :', e);
            if (e.code !== undefined && e.code === 13435) {
              // slave is not ok
              // conn.requireSlaveOk = true;
              throw Errors.ConnectSlaveOk(e);
            } else {
              const error = new errors.NotAuthenticated('Authorization Failed: ' + e.message);
              error.responseCode = 'NOT_AUTHORIZATION_LIST_COLLECTION';
              throw error;
            }
          });
      })
      .then(() => {
        if (conn.test) {
          l.debug('this is test connection.');
          const shell = new MongoShell(conn, this.getMongoScriptsPath());
          if (!shell.shellVersion || shell.shellVersion === 'UNKNOWN') {
            throw new errors.GeneralError(
              'Creation of shell connection failed. Unable to detect  your mongo binary.<br/><br/>Please make sure the Mongo shell is in your path, or define path to mongo shell in the Preferences Panel.(Refer to <a style="color: blue" onclick="window.require(\'electron\').shell.openExternal(\'https://dbkoda.useresponse.com/knowledge-base/article/dealing-with-create-shell-connection-failed-errors\')">this doc</a> for details)'
            );
          }
          return { success: true };
        }
        const serverConfig = db.topology;
        if (serverConfig instanceof Mongos) {
          conn.mongoType = 'Mongos';
        } else if (serverConfig instanceof ReplSet) {
          conn.mongoType = 'ReplSet';
        } else if (serverConfig instanceof Server) {
          conn.mongoType = 'Single';
        } else {
          conn.mongoType = 'Unknown';
        }
        return this.createMongoShell(db, conn, dbVersion)
          .then(v => {
            if (v.id && addNewPassword) {
              // If we didn't have a connection id earlier, push to the store now instead
              this.passwordService.patch(v.id, { password: conn.password });
            }
            if (v.id && tunnel) {
              this.tunnels[v.id] = tunnel;
            }
            return { ...v, dbVersion };
          })
          .catch(err => {
            log.error('create mongo shell failed:', err);
            if (err.code === 'MONGO_BINARY_UNDETECTED') {
              throw new errors.GeneralError(
                'Creation of shell connection failed. Unable to detect  your mongo binary.<br/><br/>Please make sure the Mongo shell is in your path, or define path to mongo shell in the Preferences Panel.(Refer to <a style="color: blue" onclick="window.require(\'electron\').shell.openExternal(\'https://dbkoda.useresponse.com/knowledge-base/article/dealing-with-create-shell-connection-failed-errors\')">this doc</a> for details)'
              );
            } else if (err.responseCode === 'MONGO_BINARY_CORRUPTED') {
              log.error('Corrupted mongo binary');
              throw new errors.GeneralError(
                'Create shell connection failed. Mongo binary might be corrupted.<br/><br/>Please check your mongo binary path, or define your own mongoCmd in <b>~/.dbKoda/config.yml</b> (Refer to <a style="color: blue" onclick="window.require(\'electron\').shell.openExternal(\'https://dbkoda.useresponse.com/knowledge-base/article/dealing-with-create-shell-connection-failed-errors\')">this doc</a> for details)'
              );
            } else if (err.responseCode === 'FAILED_LAUNCH_MONGO_SHELL') {
              throw new errors.GeneralError(
                `Failed to launch mongo shell.<br/> ${err.responseMessage} <br/>`
              );
            } else {
              const errStr = err instanceof Error ? err.stack : String(err);
              log.error(errStr);
              throw new errors.GeneralError(errStr);
            }
          });
      })
      .catch(err => {
        l.error('got error ', err);
        throw err;
      });
  }

  update(id, data) {
    const connection = this.connections[id];
    if (!connection) {
      l.error('cant find connection with the id ', id);
      throw new errors.BadRequest('cant find connection with the id ' + id);
    }
    const db = connection.driver;
    l.info('run command:', data.command);
    return new Promise(resolve => {
      db.command(JSON.parse(data.command)).then(v => resolve(v));
    });
  }

  /**
   * remove a connection by id
   */
  remove(id, _params) {
    try {
      if (!this.connections[id]) {
        return Promise.resolve({ id });
      }
      const { driver, shells } = this.connections[id];
      l.info('close connection ', id);
      const shellIds = [];
      _.forOwn(shells, (value, key) => {
        l.info('remove shell connection ', key);
        shellIds.push(key);
        value.status = Status.CLOSING;
        l.info(`shell ${key} is closed ${value.shell.status}`);
        value.killProcess();
      });
      driver.close();

      delete this.connections[id];

      if (this.tunnels[id]) {
        this.tunnels[id].close();
        l.info('tunnel closed successfully: ', this.tunnels[id]);
        delete this.tunnels[id];
      }
      return Promise.resolve({ id, shellIds });
    } catch (err) {
      l.error('get error', err);
      return Promise.reject('Failed to remove connection.');
    }
  }

  /**
   *  remove shell connection
   * @param id  the connection id
   * @param shellId the shell connection ID
   */
  removeShellConnection(id, shellId) {
    l.info('remove shell connection on ', id, shellId);
    if (id in this.connections) {
      const { shells } = this.connections[id];
      _.forOwn(shells, (value, key) => {
        if (shellId === key) {
          l.info('remove shell connection ', key);
          value.status = Status.CLOSING;
          value.shell && value.killProcess();
        }
      });
      delete shells[shellId];
      l.debug('return removed ', { shellId });
      return new Promise(resolve => resolve({ shellId }));
    }
  }

  /**
   * check authorization on the mongodb connection
   */
  checkAuthorization(db) {
    return db.command({ listCollections: 1 });
  }

  /**
   * create mongo shell connection based on an existed connection
   *
   * @param id  an existed connection id
   */
  createShellConnection(id, sid = undefined) {
    return new Promise((resolve, reject) => {
      const connection = this.connections[id];
      if (!connection) {
        reject('cant find connection id ' + id);
      }
      const shellId = sid || uuid.v1();
      this.createMongoShellProcess(id, shellId, connection)
        .then(value => {
          connection.shells[shellId] = value.shell;
          resolve({
            id,
            shellId,
            output: value.output,
            shellVersion: value.shell.shellVersion
          });
        })
        .catch(err => {
          reject(err.message);
        });
    });
  }

  /**
   * create mongo shell connection
   */
  createMongoShell(db, conn, dbVersion) {
    const id = conn.id ? conn.id : uuid.v1();
    const shellId = conn.shellId ? conn.shellId : uuid.v1();
    const that = this;
    return new Promise((resolve, reject) => {
      this.createMongoShellProcess(id, shellId, conn)
        .then(v => {
          that.connections[id] = new MongoConnection(
            id,
            db,
            Status.OPEN,
            conn,
            dbVersion,
            v.shell.shellVersion,
            that.options
          );
          that.connections[id].addShell(shellId, v.shell);
          that.registerMongoStatusListener(id, db);
          resolve({
            id,
            shellId,
            output: v.output,
            shellVersion: v.shell.shellVersion,
            mongoType: conn.mongoType
          });
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  /**
   * create mongo shell process
   */
  createMongoShellProcess(id, shellId, connection) {
    const that = this;
    return new Promise((resolve, reject) => {
      let mongoScriptsPath;
      if (global.IS_PRODUCTION) {
        mongoScriptsPath = process.env.MONGO_SCRIPTS_PATH;
      } else {
        mongoScriptsPath = this.app.get('mongoScripts');
      }
      log.debug(mongoScriptsPath);
      const shell = new MongoShell(connection, mongoScriptsPath);
      shell.createShell();
      const connectionMessage = [];
      shell.on(MongoShell.SHELL_EXIT, exit => {
        log.warn(`mongo shell(${id}-${shellId} exit ${exit} ${shell.id} ${shell.status}`);
        // status is closing means it is closed by users
        if (shell.status !== Status.CLOSING && shell.status !== Status.CLOSED) {
          // the shell is killed by some reasons, need to reconnect
          log.warn(`mongo shell ${id} ${shellId} was killed for some reasons, try to reconnect`);
          this.createMongoShellProcess(id, shellId, connection)
            .then(v => {
              const output = v.output;
              output.unshift(' ******* Shell Connection Restarted. ******** \n');

              log.warn('reconnect output message ', output, output.length);
              that.connections[id].shells[shellId] = v.shell;
              that.mongoShell.emit(MongoShell.RECONNECTED, {
                id,
                shellId,
                output
              });
            })
            .catch(() => {
              that.mongoShell.emit(MongoShell.SHELL_EXIT, { id, shellId });
            });
        }
      });
      shell.on(MongoShell.OUTPUT_EVENT, data => {
        if (!data) {
          return;
        }
        const emitData = {
          id,
          shellId,
          output: data
        };
        if (!shell.initialized) {
          l.debug('initialized message', data);
          if (data.indexOf('prompt=') < 0 && data.indexOf('load') < 0 && data.indexOf('true') < 0) {
            connectionMessage.push(emitData);
          }
          return;
        }
        l.debug('send data to client ', data);
        that.mongoShell.emit('shell-output', emitData);
      });
      shell.on(MongoShell.EXECUTE_END, () => {
        l.debug('mongodb execution command finished.');
        that.mongoShell.emit('mongo-execution-end', { id, shellId });
      });
      shell.on(MongoShell.INITIALIZED, err => {
        if (!err) {
          l.info('mongo shell initialized');
          const outputMsg = [];
          connectionMessage.map(msg => outputMsg.push(msg.output));
          resolve({ shell, output: outputMsg });
        } else {
          // failed to initialized
          log.error('failed to initialize ', err, connectionMessage);
          let outputMsg = '';
          connectionMessage.map(msg => {
            outputMsg += msg.output + '.';
          });
          reject({
            code: err,
            responseMessage: outputMsg,
            responseCode: 'FAILED_LAUNCH_MONGO_SHELL'
          });
        }
      });

      setTimeout(() => {
        if (!shell.initialized) {
          shell.initialized = true;
          resolve({ shell, output: [] });
        }
      }, 20000);
    });
  }

  /**
   * parse the password from the uri and return an object include username and password
   */
  parseMongoConnectionURI(connection) {
    const { url } = connection;
    const pattern = /mongodb:\/\/(\S+):(\S+)@(\S+)/;
    let parser;
    try {
      parser = mongoUri.parse(url);
    } catch (err) {
      l.error('failed to parse uri ', url);
    }
    const matches = url.match(pattern);
    let connectObject = Object.assign(connection);
    if (matches && matches.length > 2) {
      // the connection uri includes username and password the username and password
      // in connection object have higher priority than these defined in url
      parser = mongoUri.parse('mongodb://' + matches[3]);
      connectObject = {
        id: connection.id,
        url: 'mongodb://' + matches[3],
        username: connection.username || matches[1],
        password: connection.password || matches[2],
        database: parser.database,
        hosts: parser.hosts,
        options: parser.options
      };
    }
    const temp = {};
    temp.database = connection.database || parser.database || 'test';
    temp.hosts = parser.hosts;
    temp.options = parser.options;
    connectObject.url = mongoUri.format(temp);
    connectObject.username = connection.username || connectObject.username || parser.username;
    connectObject.password = connection.password || connectObject.password || parser.password;
    connectObject.database = temp.database;
    connectObject.hosts = temp.hosts
      .map(host => {
        const port = !host.port ? '27017' : host.port;
        return `${host.host}:${port}`;
      })
      .join(',');
    connectObject.options = parser.options;
    return connectObject;
  }

  /**
   * register mongo db status listener
   */
  registerMongoStatusListener(id, db) {
    const listener = new ConnectionListener(id);
    listener.addListeners(db, this.options);
    listener.on(ConnectionListener.EVENT_NAME, e => {
      l.debug('get status change from listeners ', e);
      if (this.connections[id]) {
        this.connections[id].status = e.status;
      }
      if (Status.CLOSED === e.status) {
        l.debug('send closed event to client ', e.message);
        // notify front end when the mongo instance got closed
        this.mongoShell.emit('shell-output', {
          id: e.id,
          output: e.message
        });
      } else if (Status.OPEN === e.status) {
        l.debug('mongodb status was changed to OPEN');
        this.mongoShell.get(id, {
          query: {
            type: 'cmd',
            content: 'db.runCommand({ping:1})'
          }
        });
      }
    });
  }

  /*
   * Execute javascript file specified by the script parameter.
   * The output will be sent through websocket channel
   */
  executeScript(id, shellId, script) {
    l.debug('start reading script ', script);
    const shell = this.connections[id].getShell(shellId);
    fs.readFile(script, 'utf8', (err, data) => {
      if (err) {
        return l.error(err);
      }
      l.debug('write data on shell ' + data + '\n');
      shell.write(`${data}`);
    });
  }

  /**
   * execute specified command
   */
  executeCmd(id, shellId, commands) {
    l.info('execute command ', id, shellId, commands);
    const shell = this.getMongoShell(id, shellId);
    shell.write(`${commands}`);
    return new Promise(resolve => {
      resolve({ id, shellId });
    });
  }

  /**
   * execute sync command
   */
  writeSyncCommand(id, shellId, commands) {
    l.info('execute command ', id, shellId, commands);
    const shell = this.getMongoShell(id, shellId);
    shell.writeSyncCommand(`${commands}`);
    return shell;
  }

  /**
   * get mongo shell instance based on id
   * @param id  connection id
   * @param shellId shell id
   */
  getMongoShell(id, shellId) {
    const connect = this.connections[id];
    if (!connect) {
      l.error('connection ' + id + ' doesnt exist.');
      throw new errors.BadRequest('Connection does not exist');
    }
    const shell = connect.getShell(shellId);
    if (!shell) {
      l.error('shell connection ' + shellId + ' doesnt exist.');
      throw new errors.BadRequest('Connection does not exist');
    }
    return shell;
  }

  /**
   * whether shell exists.
   *
   * @param id  connection id
   * @param shellId shell id
   */
  existMongoShell(id, shellId) {
    const connect = this.connections[id];
    if (!connect) {
      return false;
    }
    const shell = connect.getShell(shellId);
    if (!shell) {
      return false;
    }
    return true;
  }
}

module.exports = function() {
  const app = this;
  // Initialize our service with any options it requires
  const service = new MongoConnectionController();
  app.use('mongo/connection/controller', service);
  app.service('mongo/connection/controller').before({
    // Users can not be created by external access
    create: hooks.disallow('external'),
    remove: hooks.disallow('external'),
    update: hooks.disallow('external'),
    find: hooks.disallow('external'),
    get: hooks.disallow('external')
  });
  return service;
};

module.exports.MongoConnectionController = MongoConnectionController;
