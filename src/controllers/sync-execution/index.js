/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-26T16:23:34+10:00
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

import hooks from 'feathers-hooks-common';
import uuid from 'node-uuid';
import errors from 'feathers-errors';
import { mongoShellRequestResponseTypes } from '../mongo-shell';

export class SyncExecutionController {
  setup(app) {
    this.app = app;
    this.mongoController = app.service('mongo/connection/controller');
  }

  writeSyncCommand({ id, shellId, commands, responseType = mongoShellRequestResponseTypes.JSON }) {
    const shell = this.mongoController.getMongoShell(id, shellId);
    let code = commands.replace(/\r/g, '');
    code = this.formatCommand(code);

    return shell.syncExecuteCode(code, responseType).then(request => request.response);
  }

  // eslint-disable-next-line
  formatCommand(commands) {
    if (commands.indexOf('\n') >= 0) {
      const formatted = commands.split('\n').map(cmd => {
        return cmd.replace(/\/\/.*/, '');
      });
      return formatted.join(' ');
    }
    return commands;
  }

  /**
   * Execute the command to change the shellID to the new Profile connection.
   */
  swapProfile(id, shellId, newProfile) {
    const { url, password: pw, username } = this.mongoController.connections[newProfile];
    let commands = 'var db = ';
    // TODO
    if (
      this.mongoController.connections[newProfile].shellVersion.match(/^3.0.*/gi) ||
      this.mongoController.connections[newProfile].shellVersion.match(/^3.1.*/gi) ||
      this.mongoController.connections[newProfile].shellVersion.match(/^3.2.*/gi)
    ) {
      l.info(
        '!! WARNING: Running on outdated version of MongoShell, connection must be assigned to a variable. !!'
      );
    } else {
      l.info(
        'Old shell version not detected, version detected: ',
        this.mongoController.connections[newProfile].shellVersion
      );
    }
    if (username && pw) {
      commands += 'connect("' + url + '", "' + username + '", "' + pw + '")';
    } else if (username) {
      commands += 'connect("' + url + '", "' + username + '")';
    } else {
      commands += 'connect("' + url + '")';
    }

    if (!this.mongoController.existMongoShell(id, shellId)) {
      // connection doesn't exist, need to create a new shell for the new profile
      const connection = this.mongoController.connections[newProfile];
      if (connection) {
        const newShellId = uuid.v1();
        this.mongoController.createShellConnection(newProfile, newShellId);
        return Promise.resolve({ shellId: newShellId });
      }
      throw new errors.BadRequest('Connection does not exist');
    }

    return this.writeSyncCommand({
      id,
      shellId,
      commands,
      responseType: mongoShellRequestResponseTypes.RAW
    });
  }
}

export default function() {
  const app = this;
  // Initialize our service with any options it requires
  const service = new SyncExecutionController();
  app.use('mongo/sync-execution/controller', service);
  app.service('mongo/sync-execution/controller').before({
    // Users can not be created by external access
    create: hooks.disallow('external'),
    remove: hooks.disallow('external'),
    update: hooks.disallow('external'),
    find: hooks.disallow('external'),
    get: hooks.disallow('external')
  });
  return service;
}

SyncExecutionController.tempVariable = 'dbKoda_Temp_Variable';
