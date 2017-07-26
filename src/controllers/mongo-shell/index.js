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

/**
 * this class is used to create a wrapper on top of mongo shell and listen on its pty channels.
 */

// import fs from 'fs';
import configObj from '~/config';
import _ from 'lodash';

const spawn = require('node-pty').spawn;
const execSync = require('child_process').execSync;
const EventEmitter = require('events').EventEmitter;
const stripAnsi = require('strip-ansi');
const os = require('os');
const path = require('path');
const Status = require('../mongo-connection/status');

const LineStream = require('./../../../libs/byline').LineStream;

class MongoShell extends EventEmitter {
  constructor(connection, mongoScriptPath) {
    super();
    this.changePromptCmd = 'var prompt="' + MongoShell.prompt + '";\n';
    this.emitter = new EventEmitter();
    this.connection = connection;
    this.initialized = false;
    this.currentCommand = '';
    this.cmdQueue = [];
    this.outputQueue = [];
    this.prevExecutionTime = 0;
    this.executing = false;
    this.status = Status.CREATED;
    this.mongoScriptPath = mongoScriptPath;
    this.shellVersion = this.getShellVersion();
    l.debug(`Shell version: ${this.shellVersion}`);
  }

  getShellVersion() {
    try {
      l.debug(`Mongo Version Cmd: ${configObj.mongoVersionCmd}`);

      if (!configObj.mongoVersionCmd) {
        return 'UNKNOWN';
      }

      const output = execSync(configObj.mongoVersionCmd, {encoding: 'utf8'});
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

  createMongoShellParameters() {
    const ver = this.shellVersion.trim().substring(0, 6).trim();
    const mongo30 = ver.indexOf('3.0') >= 0;
    const connection = this.connection;
    let params = [];
    if (mongo30) {
      params.push('--host');
      if (connection.options && connection.options.replicaSet) {
        params = params.concat([connection.options.replicaSet + '/' + connection.hosts]);
      } else {
        params = params.concat([connection.hosts]);
      }
      if (connection.options && connection.options.ssl) {
        params = params.concat(['--ssl', '--sslAllowInvalidCertificates']);
      }
      params.push(connection.database);
    } else {
      if (connection.url && connection.url.indexOf('ssl=') > 0) {
        const url = connection.url.replace(/.ssl=true/, '').replace(/.ssl=false/, '');
        params.push(url);
      } else {
        params.push(connection.url);
      }
      if (connection.options && connection.options.ssl) {
        params.push('--ssl');
      }
    }
    const { username, password } = connection;
    if (username) {
      params = params.concat(['--username', username]);
      if (password) {
        params = params.concat(['--password', password]);
      }
    }
    return params;
  }

  /**
   * create a shell with pty
   */
  createShell() {
    l.debug(`Mongo Cmd: ${configObj.mongoCmd}`);

    if (!configObj.mongoCmd) {
      throw new Error('Mongo binary undetected');
    }

    const parameters = this.createMongoShellParameters();
    const mongoCmdArray = configObj.mongoCmd.match(/(?:[^\s"]+|"[^"]*")+/g);
    mongoCmdArray[0] = mongoCmdArray[0].replace(/^"(.+)"$/, '$1');

    const spawnOptions = {
      name: 'xterm-color',
      cols: 10000,
      rows: 10000,
      cwd: '.',
      env: process.env
    };

    if (os.platform() !== 'win32') {
      _.assign(spawnOptions, {
        uid: process.getuid(),
        gid: process.getgid()
      });
    }

    try {
      this.shell = spawn(mongoCmdArray[0], [...mongoCmdArray.slice(1), ...parameters], spawnOptions);
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
    this.lineStream = new LineStream(null, MongoShell.prompt, MongoShell.EXECUTE_END);
    this.shell.pipe(this.lineStream);
    const that = this;
    // handle shell output
    this.lineStream.on('readable', () => {
      let line;
      const lineStream = that.lineStream;
      while ((line = lineStream.read()) !== null) {
        if (!this.executing && this.initialized && !this.autoComplete) {
          continue;
        }
        let output = '';
        try {
          output = stripAnsi(line);
        } catch (err) {
          continue;
        }

        if (output.search(MongoShell.SUPPRESSED_REGEX) !== -1) {
          if (output === MongoShell.SUPPRESSED) {
            this.suppressOutput = true;
          }
          continue;
        }

        if (output === MongoShell.UNSUPPRESSED) {
          this.suppressOutput = false;
          continue;
        }

        if (!this.initialized && (output.indexOf('load(') >= 0 || output === 'true')) {
          // handle loading script on connection
          continue;
        }

        if (this.autoComplete) {
          // handle auto complete case
          if (output.indexOf(MongoShell.prompt) < 0 && output.indexOf('Autocom') < 0) {
            this.autoCompleteOutput += output.trim();
          }
          if (output === MongoShell.prompt) {
            // command is about finish
            // if there is no output, let the final timeout emit the event
            this.autoComplete = false;
            this.emit(MongoShell.AUTO_COMPLETE_END, this.autoCompleteOutput.slice(0));
          }
        } else if (this.currentCommand) {
          if (os.platform() === 'win32') {
            // pty generate incomplete command on windows
            let currentCommandWithPrompt = this.currentCommand.replace(/\r/, '');
            if (currentCommandWithPrompt.indexOf(output) > 0 && currentCommandWithPrompt.length > output.length * 2
              && output.indexOf('{') && output.indexOf('}') < 0) {
              continue;
            }
            if (output.indexOf(MongoShell.prompt) === 0) {
              currentCommandWithPrompt = MongoShell.prompt + this.currentCommand.replace(/\r/, '');
            }
            if (currentCommandWithPrompt.indexOf(output) === 0 && currentCommandWithPrompt.length > output.length
              && output !== MongoShell.prompt && output.indexOf('}') < 0 && output.indexOf('{') < 0) {
              continue;
            }
          }
          if (output.indexOf(this.currentCommand.replace(/\r*$/, '') + this.currentCommand.replace(/\r*$/, '')) >= 0 && !this.syncExecution) {
            if (output.indexOf(MongoShell.prompt) >= 0) {
              // check whether it is the initial prompt
              if (output.indexOf(`var prompt="${MongoShell.prompt}";`) < 0) {
                // show command with prompt
                this.emitOutput(MongoShell.prompt + this.currentCommand);
              }
            } else {
              // for ... output
              this.emitOutput(this.currentCommand);
            }
          } else if (output.indexOf(`var prompt="${MongoShell.prompt}";`) >= 0) {
            // this is initial change prompt command, ignore it
          } else if (output === '... ' || output === '...') {
            // found in complete command
            if (!this.syncExecution) {
              this.emitOutput(output);
            }
            this.currentCommand = this.runNextCommand();
            if (!this.currentCommand) {
              // the command is not complete, clear the incomplete context
              this.shell.write('\r\r');
            }
          } else if (this.syncExecution && output.indexOf(MongoShell.prompt) < 0
            && output.indexOf(this.currentCommand.trim()) < 0) {
            // emit sync execution command output
            this.emit(MongoShell.SYNC_OUTPUT_EVENT, output + MongoShell.enter);
          } else if (!this.syncExecution) {
            // emit general command output
            if (os.platform() === 'win32') {
              // sometimes windows doesnt show prompt
              if (this.currentCommand.replace(/\r/, '') === output) {
                this.emitOutput(MongoShell.prompt + output + MongoShell.enter);
                continue;
              }
              // for in complete output
              if (output.indexOf('... ') == 0) {
                if (output.replace('... ', '') !== this.currentCommand.replace(/\r/, '')) {
                  continue;
                }
                this.emitOutput(output.replace('... ', '') + MongoShell.enter);
                continue;
              }
            }
            this.emitOutput(output + MongoShell.enter);
          }
        } else if (output.indexOf(`var prompt="${MongoShell.prompt}"`) < 0) {
          // initializing connection messages
          this.emitOutput(output + MongoShell.enter);
        }
      }
      lineStream._flush(() => { });
    });
    this.lineStream.on(MongoShell.EXECUTE_END, (data) => {
      // one command finish execution
      log.debug('execution end ', data);
      let output = stripAnsi(data);
      that.currentCommand = that.runNextCommand();
      if (!that.currentCommand) {
        this.executing = false;
        if (!this.syncExecution) {
          that.emit(MongoShell.EXECUTE_END, MongoShell.prompt + that.currentCommand);
          this.emitOutput(output + MongoShell.enter);
          this.prevExecutionTime = 0;
          if (!this.initialized) {
            this.initialized = true;
            // if the shell is not initialized, emit an event for completing connection
            this.emit(MongoShell.INITIALIZED);
          }
        } else {
          this.syncExecution = false;
          // remove the end of prompt for json output
          if (output && output.match(/dbKoda>$/)) {
            output = output.substring(0, output.length - MongoShell.prompt.length);
          }
          this.emit(MongoShell.SYNC_EXECUTE_END, output + MongoShell.enter);
        }
      }
    });
    if (this.connection.requireSlaveOk) {
      this.writeToShell('rs.slaveOk()' + MongoShell.enter);
    }
    this.writeToShell(`${this.changePromptCmd}${MongoShell.enter}`);
    this.loadScriptsIntoShell();
    this.on(MongoShell.AUTO_COMPLETE_END, () => {
      this.finishAutoComplete();
    });
  }

  loadScriptsIntoShell() {
    // TODO re-enable load mongo script via pty
    // const scriptPath = path.join(this.mongoScriptPath + '/all-in-one.js');
    // log.info('load pre defined scripts ' + scriptPath);
    // const mongoScript = fs.readFileSync(scriptPath, 'utf8');
    // this.write(`'${MongoShell.SUPPRESSED}'\n${mongoScript}\n'${MongoShell.UNSUPPRESSED}'`);

    const scriptPath = path.join(this.mongoScriptPath + '/all-in-one.js');
    let command = `load("${scriptPath}");`;
    if (os.platform() === 'win32') {
      command = command.replace(/\\/g, '\\\\');
    }
    log.info('load pre defined scripts ' + scriptPath);
    this.write(command);
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
    if (this.suppressOutput) {
      // suppress output
      return;
    }

    if (!this.executing || !this.initialized) {
      this.outputQueue.push(output);
      this.emitBufferedOutput();
      return;
    }
    // this.emit(MongoShell.OUTPUT_EVENT, output);
    this.outputQueue.push(output);

    const milliseconds = (new Date()).getTime();

    if (milliseconds - this.prevExecutionTime > 200) {
      this.emitBufferedOutput();
    }
  }

  emitBufferedOutput() {
    this.prevExecutionTime = (new Date()).getTime();
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
   * run next command from the commands queue
   *
   * @returns {*}
   */
  runNextCommand() {
    const cmd = this.cmdQueue.shift();
    if (cmd) {
      this.writeToShell(cmd);
      return cmd;
    }
    return '';
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
    this.lineStream.autoComplete = true;
    this.autoComplete = true;
    this.autoCompleteOutput = '';
    this.writeToShell(command);
  }

  /**
   * called when auto complete execution is finished.
   */
  finishAutoComplete() {
    this.autoComplete = false;
    this.lineStream.autoComplete = false;
    this.autoCompleteOutput = '';
  }

  /**
   * send command to shell and gether the output message
   */
  writeSyncCommand(data) {
    l.info('write sync command ', data);
    this.syncExecution = true;
    this.prevExecutionTime = (new Date()).getTime();
    this.write(data);
  }

  write(data) {
    const split = data.split('\n');
    this.executing = true;
    this.outputQueue = [];
    this.prevExecutionTime = (new Date()).getTime();
    split.forEach((cmd) => {
      if (cmd && cmd.trim() !== 'exit' && cmd.trim() !== 'exit;' && cmd.trim().indexOf('quit()') < 0) {
        this.cmdQueue.push(cmd + MongoShell.enter);
      }
    });
    this.currentCommand = this.runNextCommand();
    if (!this.currentCommand) {
      // got an empty command request
      this.emit(MongoShell.EXECUTE_END, MongoShell.prompt + MongoShell.enter);
      this.emit(MongoShell.OUTPUT_EVENT, MongoShell.prompt + MongoShell.enter);
    }
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
MongoShell.SUPPRESSED = '__SUPPRESSED__';
MongoShell.SUPPRESSED_REGEX = new RegExp(MongoShell.SUPPRESSED + '\'?$');
MongoShell.UNSUPPRESSED = '__UNSUPPRESSED__';

module.exports.MongoShell = MongoShell;
