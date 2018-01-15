/**
 * This class is used to create a wrapper on top of mongo shell and listen on its pty channels.
 *
 * @Last modified by:   guiguan
 * @Last modified time: 2018-01-15T14:25:18+11:00
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

// import fs from 'fs';
import _ from 'lodash';
import { loadCommands } from '../../config';

const spawn = require('node-pty').spawn;
const execSync = require('child_process').execSync;
const EventEmitter = require('events').EventEmitter;
const os = require('os');
const path = require('path');
const Status = require('../mongo-connection/status');
const Parser = require('./pty-parser');
const PtyOptions = require('./pty-options');

class MongoShell extends EventEmitter {
  constructor(connection, mongoScriptPath) {
    super();
    this.changePromptCmd = 'var prompt="' + MongoShell.prompt + '";\n';
    this.emitter = new EventEmitter();
    this.connection = connection;
    this.initialized = false;
    this.currentCommand = '';
    this.outputQueue = [];
    this.prevExecutionTime = 0;
    this.executing = false;
    this.status = Status.CREATED;
    this.mongoScriptPath = mongoScriptPath;
    this.parser = new Parser();
    this.autoComplete = false;
    this.shellVersion = this.getShellVersion();
    this.commandQueue = [];
    this.shellSize = { cols: PtyOptions.cols, rows: PtyOptions.rows };
    l.debug(`Shell version: ${this.shellVersion}`);
  }

  getShellVersion() {
    try {
      const configObj = loadCommands();
      log.info('Mongo Version Cmd:', configObj);

      if (!configObj.mongoVersionCmd) {
        log.error('unkonwn version');
        return 'UNKNOWN';
      }

      const output = execSync(configObj.mongoVersionCmd, { encoding: 'utf8' });
      const mongoVStr = output.split('\n');
      if (mongoVStr && mongoVStr.length > 0) {
        if (mongoVStr[0].indexOf('MongoDB shell version v') >= 0) {
          return mongoVStr[0].replace('MongoDB shell version v', '').trim();
        }
        if (mongoVStr[0].indexOf('MongoDB shell version:') >= 0) {
          return mongoVStr[0].replace('MongoDB shell version:', '').trim();
        }
        return mongoVStr[0];
      }
      return output;
    } catch (_) {
      return 'UNKNOWN';
    }
  }

  _escapeSpecialCharacters(text: string) {
    // only windows needs this escaping and node-pty escaped for us on other platforms
    if (os.platform === 'win32') {
      const result = text.replace('"', '""');
      return `"${result}"`;
    }

    return text;
  }

  createMongoShellParameters() {
    const ver = this.shellVersion
      .trim()
      .substring(0, 6)
      .trim();
    const mongo30 = ver.indexOf('3.0') >= 0;
    const connection = this.connection;
    let params = [];
    if (mongo30) {
      params.push('--host');
      if (connection.options && connection.options.replicaSet) {
        params = params.concat([
          connection.options.replicaSet + '/' + connection.hosts
        ]);
      } else {
        params = params.concat([connection.hosts]);
      }
      if (connection.options && connection.options.ssl) {
        params = params.concat(['--ssl', '--sslAllowInvalidCertificates']);
      }
      params.push(connection.database);
    } else {
      if (connection.url && connection.url.indexOf('ssl=') > 0) {
        const url = connection.url
          .replace(/.ssl=true/, '')
          .replace(/.ssl=false/, '');
        params.push(url);
      } else {
        params.push(connection.url);
      }
      if (connection.options && connection.options.ssl) {
        params.push('--ssl');
        if (connection.sslAllowInvalidCertificates) {
          params.push('--sslAllowInvalidCertificates');
        }
      }
    }
    const { username, password } = connection;
    if (username) {
      params = params.concat(['--username', this._escapeSpecialCharacters(username)]);
      if (password) {
        params = params.concat(['--password', this._escapeSpecialCharacters(password)]);
      }
    }
    if (connection.authenticationDatabase) {
      params = params.concat([
        '--authenticationDatabase',
        connection.authenticationDatabase
      ]);
    }
    return params;
  }

  /**
   * create a shell with pty
   */
  createShell() {
    const configObj = loadCommands();
    log.info('Mongo Cmd:', configObj);

    if (!configObj.mongoCmd) {
      const err = new Error('Mongo binary undetected');
      err.code = 'MONGO_BINARY_UNDETECTED';
      throw err;
    }

    if (this.shellVersion === 'UNKNOWN') {
      const err = new Error('Mongo binary corrupted');
      err.responseCode = 'MONGO_BINARY_CORRUPTED';
      throw err;
    }

    if (this.shellVersion.match(/^([012]).*/gim)) {
      log.error('Invalid Mongo binary Version Detected.');
      const err = new Error(
        'Mongo Binary Version (' +
          this.shellVersion +
          ') is not supported, please upgrade to a Mongo Binary version of at least 3.0'
      );
      err.responseCode = 'MONGO_BINARY_INVALID_VERSION';
      throw err;
    }

    const mongoCmd = configObj.mongoCmd;

    const parameters = this.createMongoShellParameters();
    let mongoCmdArray;
    if (mongoCmd.indexOf('"') === 0) {
      mongoCmdArray = configObj.mongoCmd.match(/(?:[^\s"]+|"[^"]*")+/g);
      mongoCmdArray[0] = mongoCmdArray[0].replace(/^"(.+)"$/, '$1');
    } else {
      mongoCmdArray = [mongoCmd];
    }

    if (os.platform() !== 'win32') {
      _.assign(PtyOptions, {
        uid: process.getuid(),
        gid: process.getgid()
      });
    }

    if (os.platform() === 'win32') {
      mongoCmdArray = ['cmd.exe', '/c'].concat(mongoCmdArray);
    }

    try {
      this.shell = spawn(
        mongoCmdArray[0],
        [...mongoCmdArray.slice(1), ...parameters],
        PtyOptions
      );
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.status = Status.OPEN;
    this.shell.on('exit', (exit) => {
      l.info('mongo shell exit ', exit, this.initialized);
      if (!this.initialized) {
        this.emit(MongoShell.INITIALIZED, exit);
      } else {
        // set the initialized status in order to make the reconnect works as initialize process
        this.initialized = false;
        this.emit(MongoShell.SHELL_EXIT, exit);
        this.status = Status.CLOSED;
      }
    });
    this.shell.on('data', this.parser.onRead.bind(this.parser));
    this.parser.on('data', this.readParserOutput.bind(this));
    this.parser.on('command-ended', this.commandEnded.bind(this));
    this.parser.on(
      'incomplete-command-ended',
      this.incompleteCommandEnded.bind(this)
    );

    // handle shell output
    if (this.connection.requireSlaveOk) {
      this.writeToShell('rs.slaveOk()' + MongoShell.enter);
    }
    this.loadScriptsIntoShell();
    this.on(MongoShell.AUTO_COMPLETE_END, () => {
      this.finishAutoComplete();
    });
  }

  commandEnded() {
    if (!this.initialized) {
      this.emit(MongoShell.OUTPUT_EVENT, MongoShell.prompt + MongoShell.enter);
      this.emit(MongoShell.INITIALIZED);
      this.initialized = true;
    } else if (this.autoComplete) {
      this.autoComplete = false;
      const output = this.autoCompleteOutput
        .replace(/shellAutocomplete.*__autocomplete__/, '')
        .replace(MongoShell.prompt, '');
      this.emit(MongoShell.AUTO_COMPLETE_END, output);
    } else if (this.syncExecution) {
      this.syncExecution = false;
      this.executing = false;
      this.emit(MongoShell.SYNC_EXECUTE_END, '');
    } else if (this.executing) {
      const cmd = this.runCommandFromQueue();
      if (!cmd) {
        this.prevExecutionTime = 0;
        this.executing = false;
        this.emitOutput(MongoShell.prompt + MongoShell.enter);
        this.emit(MongoShell.EXECUTE_END);
        this.emitBufferedOutput();
      }
    }
  }

  incompleteCommandEnded(data) {
    if (!this.executing) {
      this.previousOutput = data;
      this.emitOutput(data + MongoShell.enter);
      this.parser.clearBuffer();
      return;
    }
    const cmd = this.runCommandFromQueue();
    if (!cmd) {
      this.parser.clearBuffer();
      this.prevExecutionTime = 0;
      this.executing = false;
      this.emit(MongoShell.EXECUTE_END);
      this.writeToShell(MongoShell.enter + MongoShell.enter);
    }
  }

  readParserOutput(data) {
    if (!this.initialized && data.indexOf('shell') >= 0) {
      this.writeToShell(`${this.changePromptCmd}`);
    }
    if (!this.initialized) {
      this.emit(MongoShell.OUTPUT_EVENT, data + MongoShell.enter);
      return;
    }
    if (this.autoComplete) {
      this.autoCompleteOutput += data.trim();
    } else if (this.syncExecution && data !== MongoShell.prompt) {
      this.emit(MongoShell.SYNC_OUTPUT_EVENT, data);
    } else if (
      !(
        data === this.previousOutput &&
        this.previousOutput === MongoShell.prompt
      )
    ) {
      this.emitOutput(data + MongoShell.enter);
    }
    this.previousOutput = data;
  }

  loadScriptsIntoShell() {
    const scriptPath = path.join(this.mongoScriptPath + '/all-in-one.js');
    let command = `load("${scriptPath}");`;
    if (os.platform() === 'win32') {
      command = command.replace(/\\/g, '\\\\');
    }
    log.info('load pre defined scripts ' + scriptPath);
    this.writeToShell(command + MongoShell.enter);
  }

  /**
   * whether the shell is executing any commands
   * @returns {boolean}
   */
  isShellBusy() {
    return this.executing || this.syncExecution;
  }

  /**
   * emit output event
   *
   * @param output
   */
  emitOutput(output) {
    if (!this.executing || !this.initialized) {
      this.outputQueue.push(output);
      this.emitBufferedOutput();
      return;
    }
    // this.emit(MongoShell.OUTPUT_EVENT, output);
    this.outputQueue.push(output);

    const milliseconds = new Date().getTime();

    if (milliseconds - this.prevExecutionTime > 200) {
      this.emitBufferedOutput();
    }
  }

  emitBufferedOutput() {
    this.prevExecutionTime = new Date().getTime();
    let allData = '';
    this.outputQueue.map((o) => {
      // this.emit(MongoShell.OUTPUT_EVENT, o);
      allData += o;
    });
    this.outputQueue.splice(0, this.outputQueue.length);
    l.debug('emit output ', allData);
    this.emit(MongoShell.OUTPUT_EVENT, allData);
  }

  /**
   * write the command to shell
   * @param data
   */
  writeToShell(data) {
    if (!data) {
      return;
    }
    data = data.replace(/\t/g, '  ');
    l.debug('write to shell ', data);
    this.currentCommand = data;
    if (data.length > this.shellSize.cols) {
      l.debug('resize pty window cols to ', data.length);
      this.shellSize.cols = data.length * 2;
      this.shell.resize(data.length * 2, PtyOptions.rows);
      this.shell.write(' \n');
    }
    this.shell.write(data);
  }

  /**
   * handle auto complete command
   *
   * @param command
   */
  writeAutoComplete(command) {
    if (this.autoComplete) {
      // ignore if there is already a auto complete in execution
      return;
    }
    this.autoComplete = true;
    this.autoCompleteOutput = '';
    this.writeToShell(command);
  }

  /**
   * called when auto complete execution is finished.
   */
  finishAutoComplete() {
    this.autoComplete = false;
    this.autoCompleteOutput = '';
  }

  /**
   * send command to shell and gether the output message
   */
  writeSyncCommand(data) {
    l.info('write sync command ', data);
    this.syncExecution = true;
    this.prevExecutionTime = new Date().getTime();
    this.write(data + MongoShell.enter);
  }

  write(data) {
    this.commandQueue = [];
    if (!data) {
      // got an empty command request
      this.emit(MongoShell.EXECUTE_END, MongoShell.prompt + MongoShell.enter);
      this.emit(MongoShell.OUTPUT_EVENT, MongoShell.prompt + MongoShell.enter);
      return;
    }
    const split = data.split('\n');
    this.executing = true;
    this.outputQueue = [];
    this.prevExecutionTime = new Date().getTime();
    const cmdQueue = [];
    split.forEach((cmd) => {
      if (
        cmd &&
        cmd.trim() &&
        cmd.trim() !== 'exit' &&
        cmd.trim() !== 'exit;' &&
        cmd.trim().indexOf('quit()') < 0
      ) {
        if (cmd.match(/\r$/)) {
          cmdQueue.push(cmd);
        } else {
          cmdQueue.push(cmd + MongoShell.enter);
        }
      }
    });
    const sep = '';
    const combinedCmd = cmdQueue.join(sep);
    if (os.platform() !== 'win32') {
      if (combinedCmd.length > 500) {
        let temparray;
        const chunk = 1;
        while (cmdQueue.length > 0) {
          temparray = cmdQueue.splice(0, chunk);
          const joinCmd = temparray.join(sep);
          this.commandQueue.push(joinCmd);
        }
        this.runCommandFromQueue();
      } else {
        this.writeToShell(combinedCmd);
      }
    } else {
      this.writeToShell(combinedCmd);
    }
  }

  runCommandFromQueue() {
    const cmd = this.commandQueue.shift();
    if (cmd) {
      this.writeToShell(cmd);
      return true;
    }
    return false;
  }

  /**
   * filter out unnecessary message
   *
   * @param data
   */
  filterOutput(data) {
    let output = data.toString();
    if (output.indexOf('var prompt=') >= 0) {
      return;
    }
    if (output.indexOf(MongoShell.comment) >= 0) {
      return;
    }
    if (output.trim().length === 0) {
      return;
    }
    if (output && output.match('^connecting to: ')) {
      const url = output.split('connecting to: ')[1];
      const pattern = /(\S+):(\S+)@(\S+)?/;
      const matches = url.match(pattern);
      if (matches && matches.length > 3) {
        const rest = output.split(matches[0])[1];
        output = matches[1] + ':****************@' + matches[3] + rest;
      }
    }
    return output;
  }
}

MongoShell.prompt = 'dbKoda>';
MongoShell.enter = '\r';
MongoShell.comment = '  // dbKoda-mongodb-shell-comment.';
MongoShell.executing = ' // dbKoda-mongodb-shell-executing';
MongoShell.executed = ' // dbKoda-mongodb-shell-executed';
MongoShell.OUTPUT_EVENT = 'mongo-output-data';
MongoShell.SYNC_OUTPUT_EVENT = 'mongo-output-data-sync';
MongoShell.EXECUTE_END = 'mongo-execution-end';
MongoShell.SYNC_EXECUTE_END = 'mongo-sync-execution-end';
MongoShell.AUTO_COMPLETE_END = 'mongo-auto-complete-end';
MongoShell.INITIALIZED = 'mongo-shell-initialized';
MongoShell.SHELL_EXIT = 'mongo-shell-process-exited';
MongoShell.RECONNECTED = 'mongo-shell-reconnected';

module.exports.MongoShell = MongoShell;
