/**
 * @flow
 *
 * Imagine a mongo shell process as a CPU core and manage its input and output data flow.
 * This work is based on Joey's original pty implementation
 *
 * @Author: Joey, Guan Gui <guiguan>
 * @Date:   2018-06-05T12:12:29+10:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-27T14:31:23+10:00
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

import _ from 'lodash';
// $FlowFixMe
import { spawn } from 'node-pty';
// $FlowFixMe
import { EventEmitter } from 'events';
import os from 'os';
import path from 'path';
import fs from 'fs';
import uuid from 'node-uuid';
// $FlowFixMe
import escapeRegExp from 'escape-string-regexp';
// import { MongoConfigError } from '~/errors';
import { UNKNOWN } from '~/services/config/getMongoShellVersion';
// import validateMongoCmd from '~/services/config/validateMongoCmd';
import Status from '../mongo-connection/status';
import Parser from './pty-parser';
import PtyOptions from './pty-options';
import { toStrict } from './mongodbExtendedJsonUtils';

export const mongoShellRequestResponseTypes = {
  JSON: 'JSON', // try to parse output into valid json
  RAW: 'RAW', // just return output as it is
  NULL: 'NULL' // return nothing
};

export const mongoShellRequestStates = {
  ENQUEUED: 'ENQUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED'
};

export type MongoShellRequestResponseType = $Keys<typeof mongoShellRequestResponseTypes>;

export type MongoShellRequestState = $Keys<typeof mongoShellRequestStates>;

export type MongoShellRequest = {
  id?: UUID, // request id
  code: string, // mongo shell code to be executed
  realtime?: boolean, // whether to wait for all output before flushing buffer
  state?: MongoShellRequestState, // current request state
  responseType?: MongoShellRequestResponseType, // response type when it is not realtime
  data?: any, // any custom data associated with current request
  error?: Error, // the error received when request has failed
  response?: string // the output received when request has succeeded
};

const BUFFER_TIME = 500;
const SET_TIMEOUT_FOR_INCOMPLETE_COMMAND_DEBOUNCE_TIME = 1000;
// remove `exit` and `quit()` cmd from input
const INPUT_FILTER_REGEX = /(^|[;\s]+)(?:exit[\s]*(?:;[;\s]*|$)|quit\s*\(\s*\)[;\s]*)/g;

export class MongoShell extends EventEmitter {
  static CUSTOM_EXEC_ENDING = '__DBKODA_EXEC_END__';
  static PROMPT = 'dbKoda Mongo Shell>';
  static THREE_DOTS = '...';
  static ENTER = '\r';
  static CHANGE_PROMPT_CMD = `var prompt="${MongoShell.PROMPT}";`;
  static PRINT_CUSTOM_EXEC_ENDING_CMD = `print("${MongoShell.CUSTOM_EXEC_ENDING}");`;
  static OUTPUT_FILTER_REGEX = new RegExp(`${escapeRegExp(MongoShell.PROMPT)}.*|[\r\n]`, 'g');

  // events
  static eventOutputAvailable = 'outputAvailable';
  static eventRequestResolved = 'requestResolved';
  static eventReady = 'ready';
  static eventExited = 'exited';

  id: UUID;
  requestQueue: MongoShellRequest[] = [];
  currentRequest: ?MongoShellRequest = null;
  commandQueue: string[] = [];
  outputBuffer: string[] = [];
  connection: * = null;
  initialized: boolean = false;
  status: * = Status.CREATED;
  mongoScriptPath: string;
  parser: Parser;
  version: string = UNKNOWN;

  _cleanup: ?() => void = null;

  constructor(connection: *, mongoScriptPath: string) {
    super();

    this.connection = connection;
    this.mongoScriptPath = mongoScriptPath;
    this.parser = new Parser(MongoShell);
  }

  get isBusy() {
    return this.currentRequest != null;
  }

  _createMongoShellParameters() {
    const mongo30 = this.version.startsWith('3.0');
    const { connection } = this;
    let params = [];
    if (mongo30) {
      params.push('--host');
      if (connection.options && connection.options.replicaSet) {
        params = params.concat([connection.options.replicaSet + '/' + connection.hosts]);
      } else {
        params = params.concat([connection.hosts]);
      }
      if (connection.ssl) {
        params = params.concat(['--ssl', '--sslAllowInvalidCertificates']);
      }
      params.push(connection.database);
    } else {
      const urlMatch = connection.url.match(/(.*?)(?:[?&]?ssl=(true|false).*)/);

      if (urlMatch) {
        params.push(urlMatch[1]);

        if (urlMatch[2] === 'true') {
          connection.ssl = true;
        }
      } else {
        params.push(connection.url);
      }

      if (connection.ssl) {
        params.push('--ssl');
        if (connection.sslAllowInvalidCertificates) {
          params.push('--sslAllowInvalidCertificates');
        }
      }
    }
    const { username, password } = connection;
    if (username) {
      params = params.concat(['--username', username]);
      if (password) {
        params = params.concat(['--password', password]);
      }
    }
    if (connection.authenticationDatabase) {
      params = params.concat(['--authenticationDatabase', connection.authenticationDatabase]);
    }
    return params;
  }

  _onShellExit = code => {
    if (!this.initialized) {
      l.error(`Mongo shell exited without fully initialized. Exit code: ${code}`);

      this.status = Status.CLOSED;

      this.emit(MongoShell.eventExited, code);
    } else {
      l.info(`Mongo shell exited. Exit code: ${code}`);

      this.emit(MongoShell.eventExited, code);

      this.status = Status.CLOSED;
    }

    this._cleanup && this._cleanup();
  };

  _onExecutionEnded = () => {
    l.debug(`Execution ended. Current request queue length: ${this.requestQueue.length}`);

    const request = this.currentRequest;

    if (!request) {
      l.error(new Error('MongoShell: executionEnded event received for no request'));
      return;
    }

    const { realtime } = request;

    if (realtime) {
      this._emitRealtimeOutput.flush();

      if (request.state === mongoShellRequestStates.RUNNING) {
        request.state = mongoShellRequestStates.SUCCEEDED;
      }
    } else if (request.state === mongoShellRequestStates.FAILED) {
      request.response = this.outputBuffer.join('');
    } else {
      const { responseType } = request;

      if (responseType === mongoShellRequestResponseTypes.JSON) {
        let response = this.outputBuffer.join('');
        const rawOutput = response;
        response = response.replace(MongoShell.OUTPUT_FILTER_REGEX, '');
        response = toStrict(response);

        try {
          JSON.parse(response);

          request.state = mongoShellRequestStates.SUCCEEDED;
        } catch (err) {
          let bugContext = '';

          if (err.message) {
            const match = err.message.match(/position (\d+)/);

            if (match) {
              const bugIdx = Number(match[1]);
              const width = 20;
              bugContext = JSON.stringify(response.substring(bugIdx - width, bugIdx + width));
            }
          }

          if (IS_PRODUCTION) {
            l.error('MongoShell: failed to parse json output', err, bugContext);
          } else {
            l.debug('Raw output:', JSON.stringify(rawOutput));
            l.debug('Filtered output:', JSON.stringify(response));
            l.error(
              `MongoShell: failed to parse json output for ${request.code}:`,
              err,
              bugContext
            );
          }

          request.state = mongoShellRequestStates.FAILED;
          request.error = err;
        } finally {
          request.response = response;
        }
      } else if (responseType === mongoShellRequestResponseTypes.NULL) {
        request.state = mongoShellRequestStates.SUCCEEDED;
      } else {
        request.response = this.outputBuffer.join('');
        request.state = mongoShellRequestStates.SUCCEEDED;
      }

      this.outputBuffer = [];
    }

    this._resolveRequest(request);
    this.currentRequest = null;
    _.defer(this._processRequest);
  };

  _onAvailableForMoreInput = (signal: string) => {
    l.debug(`Shell available for more input after: ${signal}`);

    if (signal === MongoShell.THREE_DOTS) {
      this._setTimeoutForIncompleteCommand();

      if (this.commandQueue.length <= 1) {
        // don't digest PRINT_CUSTOM_EXEC_ENDING_CMD for THREE_DOTS signal
        return;
      }
    }

    this._digestCommandQueue();
  };

  _setTimeoutForIncompleteCommand = _.debounce(() => {
    l.warn('Incomplete command timed out');

    const request = this.currentRequest;

    if (!request) return;

    request.state = mongoShellRequestStates.FAILED;
    request.error = new Error('MongoShell: incomplete command timed out');
    // $FlowFixMe
    request.error.responseCode = 'INCOMPLETE_COMMAND_TIMED_OUT';

    this._endCurrentRunningCommand();
  }, SET_TIMEOUT_FOR_INCOMPLETE_COMMAND_DEBOUNCE_TIME);

  _onParsedLine = parsedLine => {
    this._setTimeoutForIncompleteCommand.cancel();

    if (parsedLine.endsWith(MongoShell.PRINT_CUSTOM_EXEC_ENDING_CMD)) return;

    if (!this.currentRequest || this.currentRequest.realtime) {
      // received output from the default or a realtime request

      this.outputBuffer.push(parsedLine + MongoShell.ENTER);
      // emit realtime output in constant rate :P
      this._emitRealtimeOutput();

      return;
    }

    const { responseType } = this.currentRequest;

    if (responseType === mongoShellRequestResponseTypes.NULL) return;

    this.outputBuffer.push(parsedLine + MongoShell.ENTER);
  };

  _loadScriptsIntoShell(): Promise<MongoShellRequest> {
    const scriptPath = path.join(this.mongoScriptPath + '/all-in-one.js');
    let command = `load("${scriptPath}");`;
    if (os.platform() === 'win32') {
      command = command.replace(/\\/g, '\\\\');
    }
    log.info('load pre defined scripts ' + scriptPath);

    return this.syncExecuteCode(command);
  }

  _readScriptsFileIntoShell(): Promise<MongoShellRequest> {
    const fileBuffer = fs.readFileSync(path.join(this.mongoScriptPath + '/all-in-one.js'));
    const fileContent = fileBuffer.toString('utf8');

    return this.syncExecuteCode(fileContent);
  }

  _emitRealtimeOutput = _.throttle(
    () => {
      if (this.outputBuffer.length === 0) {
        return;
      }

      const requestId = _.get(this.currentRequest, 'id', null);
      const output = this.outputBuffer.join('');
      this.outputBuffer = [];

      l.debug(`Emitting realtime output for request ${requestId || 'default'}`);
      this.emit(MongoShell.eventOutputAvailable, requestId, output);
    },
    BUFFER_TIME,
    {
      leading: true
    }
  );

  _writeToShell(cmd: string) {
    if (!cmd) {
      return;
    }

    cmd = cmd.replace(/\t/g, '  ');

    l.debug('Writing to shell: ', JSON.stringify(cmd));
    this.shell.write(cmd);
  }

  _digestCommandQueue() {
    const cmd = this.commandQueue.shift();
    if (cmd) {
      this._writeToShell(cmd);
      return true;
    }
    return false;
  }

  _decomposeCodeAndEnqueueCommands(code: string) {
    const decomposed = code.split('\n');

    decomposed.forEach(cmd => {
      cmd = cmd.replace(INPUT_FILTER_REGEX, '$1');

      // always add \r to a cmd
      if (!cmd.endsWith(MongoShell.ENTER)) {
        cmd += MongoShell.ENTER;
      }

      // for every non-empty cmd
      if (cmd.length > 1) {
        this.commandQueue.push(cmd);
      }
    });

    // add our own end signal
    this.commandQueue.push(MongoShell.PRINT_CUSTOM_EXEC_ENDING_CMD + MongoShell.ENTER);
  }

  _processRequest = () => {
    if (this.isBusy || this.requestQueue.length === 0) return;

    this.commandQueue = [];
    this.currentRequest = this.requestQueue.shift();
    this.currentRequest.state = mongoShellRequestStates.RUNNING;
    this._decomposeCodeAndEnqueueCommands(this.currentRequest.code);
    this._digestCommandQueue();
  };

  _resolveRequest = (request: MongoShellRequest) => {
    this.emit(MongoShell.eventRequestResolved, request);
  };

  _endCurrentRunningCommand = () => {
    // deplete queueing commands
    this.commandQueue = [MongoShell.PRINT_CUSTOM_EXEC_ENDING_CMD + MongoShell.ENTER];

    // send ctrl-c
    this._writeToShell('\x03');
  };

  createShell() {
    const mongoConfig = global.config.mongo; // should be read-only

    // TODO:
    // - [ ] async validateMongoCmd and check shellVersion
    // - [ ] cleanup old errors
    // - [ ] emit shell output when shell fails to be ready
    if (!mongoConfig.cmd) {
      const err = new Error('Mongo binary undetected');
      // $FlowFixMe
      err.responseCode = 'MONGO_BINARY_UNDETECTED';
      throw err;
    }

    if (this.shellVersion === 'UNKNOWN') {
      const err = new Error('Mongo binary corrupted');
      // $FlowFixMe
      err.responseCode = 'MONGO_BINARY_CORRUPTED';
      throw err;
    }

    if (this.shellVersion.match(/^([012]).*/gim)) {
      log.error('Invalid Mongo binary version detected.');
      const err = new Error(
        'Mongo binary version (' +
          this.shellVersion +
          ') is not supported, please upgrade to a Mongo binary version of at least 3.0'
      );
      // $FlowFixMe
      err.responseCode = 'MONGO_BINARY_INVALID_VERSION';
      throw err;
    }

    const { dockerized, cmd: mongoCmd } = mongoConfig;

    let mongoCmdArray;

    if (dockerized) {
      mongoCmdArray = mongoCmd.split(' ');
    } else if (mongoCmd.indexOf('"') === 0) {
      mongoCmdArray = mongoCmd.match(/(?:[^\s"]+|"[^"]*")+/g);
      mongoCmdArray[0] = mongoCmdArray[0].replace(/^"(.+)"$/, '$1');
    } else {
      mongoCmdArray = [mongoCmd];
    }

    if (os.platform() !== 'win32') {
      _.assign(PtyOptions, {
        // $FlowFixMe
        uid: process.getuid(),
        // $FlowFixMe
        gid: process.getgid()
      });
    }

    const parameters = this._createMongoShellParameters();

    try {
      this.shell = spawn(mongoCmdArray[0], [...mongoCmdArray.slice(1), ...parameters], PtyOptions);
    } catch (error) {
      l.error(error);
      throw error;
    }

    global.addShutdownHander && global.addShutdownHander();
    this.status = Status.OPEN;
    const parserOnRead = this.parser.onRead.bind(this.parser);

    this.shell.on('exit', this._onShellExit);
    this.shell.on('data', parserOnRead);
    this.parser.on('parsedLine', this._onParsedLine);
    this.parser.on('executionEnded', this._onExecutionEnded);
    this.parser.on('availableForMoreInput', this._onAvailableForMoreInput);

    this._cleanup = () => {
      this.shell.removeListener('exit', this._onShellExit);
      this.shell.removeListener('data', parserOnRead);
      this.parser.removeListener('parsedLine', this._onParsedLine);
      this.parser.removeListener('executionEnded', this._onExecutionEnded);
      this.parser.removeListener('availableForMoreInput', this._onAvailableForMoreInput);
      this.removeAllListeners(MongoShell.eventOutputAvailable);
      this.removeAllListeners(MongoShell.eventRequestResolved);
      this.removeAllListeners(MongoShell.eventReady);
      this.removeAllListeners(MongoShell.eventExited);
    };

    // change prompt
    this.syncExecuteCode(MongoShell.CHANGE_PROMPT_CMD, mongoShellRequestResponseTypes.RAW).then(
      request => {
        if (request.response) {
          this.emit(MongoShell.eventOutputAvailable, null, request.response);
        }
      }
    );

    // allow read from slave
    if (this.connection.requireSlaveOk) {
      this.syncExecuteCode('rs.slaveOk()');
    }

    let p;

    // load mongo scripts
    if (dockerized) {
      p = this._readScriptsFileIntoShell();
    } else {
      p = this._loadScriptsIntoShell();
    }

    p.then(request => {
      if (request.state === mongoShellRequestStates.SUCCEEDED) {
        this.initialized = true;
        this.emit(MongoShell.eventReady);
      }
    });
  }

  enqueueRequest(request: MongoShellRequest): UUID {
    if (request.id == null) {
      request.id = uuid.v1();
    }

    if (request.realtime == null) {
      request.realtime = true;
    }

    _.assign(request, {
      error: null,
      response: null
    });

    if (!request.code) {
      request.state = mongoShellRequestStates.FAILED;
      request.error = new Error('MongoShell: empty request code');

      // make sure request id is received by caller first
      _.defer(() => this._resolveRequest(request));
      // $FlowIssue
      return request.id;
    }

    if (!request.realtime && request.responseType == null) {
      request.responseType = mongoShellRequestResponseTypes.RAW;
    }

    this.requestQueue.push(request);

    request.state = mongoShellRequestStates.ENQUEUED;

    l.debug(`Enqueued a new request. Current request queue length: ${this.requestQueue.length}`);

    // start process request, but make sure request id is received by caller first
    _.defer(this._processRequest);
    // $FlowIssue
    return request.id;
  }

  /**
   * Execute code asynchronously in shell, and output will come back chuck by chuck via
   * eventOutputAvailable
   */
  asyncExecuteCode = (code: string): UUID => {
    return this.enqueueRequest({
      code,
      realtime: true
    });
  };

  /**
   * Execute code synchronously in shell, and return a promise that will resolve to a request
   * containing final output from shell
   */
  syncExecuteCode = (
    code: string,
    responseType: MongoShellRequestResponseType = mongoShellRequestResponseTypes.NULL,
    data?: any
  ): Promise<MongoShellRequest> => {
    return new Promise(resolve => {
      const reqId = this.enqueueRequest({
        code,
        realtime: false,
        responseType,
        data
      });

      const onRequestResolved = (request: MongoShellRequest) => {
        if (request.id !== reqId) return;

        this.removeListener(MongoShell.eventRequestResolved, onRequestResolved);
        resolve(request);
      };

      this.on(MongoShell.eventRequestResolved, onRequestResolved);
    });
  };

  killProcess() {
    if (global.config.mongo.dockerized) {
      this._writeToShell('exit\n');
    } else {
      this.shell.destroy();
    }
  }

  terminateCurrentStatement() {
    const request = this.currentRequest;

    if (!request) return Promise.reject(new Error('MongoShell: no request is currently running'));

    request.state = mongoShellRequestStates.FAILED;
    request.error = new Error('MongoShell: request cancelled by user');
    // $FlowFixMe
    request.error.responseCode = 'REQUEST_CANCELLED_BY_USER';

    this._endCurrentRunningCommand();
    return Promise.resolve();
  }
}
