/**
 * Created by joey on 21/7/17.
 * @Last modified by:   guiguan
 * @Last modified time: 2018-07-30T12:13:24+10:00
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

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { escapeDoubleQuotes } from './processDoubleQuotes';
import tokeniseCmdString from './tokeniseCmdString';

const ARG_REGEX = /([^\s"]+)|"([^"]*)"/g;
class OSCommandsController extends EventEmitter {
  constructor() {
    super();
    this.requestQueue = [];
    this.currentProcess = null;
  }

  runCommand(connect, commands, shellId) {
    const cmds = commands.split('\n');
    log.info('run os command ', cmds);
    if (cmds) {
      cmds.map(c => c && this.requestQueue.push({ connect, cmd: c, shellId }));
    }
    try {
      this.runCommandFromQueue();
    } catch (err) {
      log.error('get error on run os command ', err);
    }
    return Promise.resolve({});
  }

  runCommandFromQueue() {
    const mongoConfig = global.config.mongo; // should be read-only
    log.info('Mongo Cmd:', mongoConfig);
    if (this.requestQueue.length <= 0) {
      return;
    }
    const { connect, shellId } = this.requestQueue[0];
    let { cmd } = this.requestQueue[0];
    const { id } = connect;
    const { username, password } = connect;
    this.requestQueue.shift();
    if (username && password) {
      cmd = cmd.replace('-p ******', `-p "${escapeDoubleQuotes(password)}"`);
    }
    const params = tokeniseCmdString(cmd);
    let mongoCmd = mongoConfig[`${params[0].slice(5)}Cmd`] || params[0];
    params.splice(0, 1);

    if (mongoConfig.dockerized || mongoCmd.startsWith('"')) {
      const mongoCmdArray = [];
      let m;

      while ((m = ARG_REGEX.exec(mongoCmd))) {
        mongoCmdArray.push(m[1] || m[2]);
      }

      mongoCmd = mongoCmdArray[0];
      params.splice(0, 0, ...mongoCmdArray.slice(1));
    }

    try {
      l.info(mongoCmd, params);
      const p = spawn(mongoCmd, params);
      this.currentProcess = { process: p, cmd };
      p.stdout.on('data', data => {
        log.debug(`stdout: ${data}`);
        this.emit(OSCommandsController.COMMAND_OUTPUT_EVENT, {
          id,
          shellId,
          output: data.toString('utf8')
        });
      });

      p.stderr.on('data', data => {
        log.debug(`stderr: ${data}`);
        this.emit(OSCommandsController.COMMAND_OUTPUT_EVENT, {
          id,
          shellId,
          output: data.toString('utf8')
        });
      });

      p.on('error', d => {
        log.error('process exits', d);
      });

      p.on('close', code => {
        log.debug(`child process exited with code ${code}`);
        if (this.requestQueue.length <= 0) {
          this.emit(OSCommandsController.COMMAND_FINISH_EVENT, {
            id,
            shellId,
            output: `child process exited with code ${code}\n\r`,
            cmd,
            code
          });
        }
        this.runCommandFromQueue();
      });
    } catch (err) {
      log.error(err);
      this.emit(OSCommandsController.COMMAND_OUTPUT_EVENT, {
        id,
        shellId,
        output: err.message
      });
    }
  }

  killCurrentProcess() {
    this.requestQueue = [];
    if (this.currentProcess) {
      this.currentProcess.process.kill();
    }
    return Promise.resolve();
  }
}

module.exports.OSCommandsController = OSCommandsController;

OSCommandsController.COMMAND_OUTPUT_EVENT = 'os-command-output';
OSCommandsController.COMMAND_FINISH_EVENT = 'os-command-finish';
