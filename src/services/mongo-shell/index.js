/**
 * @Author: joey
 * @Date:   2016-12-23T13:05:45+11:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-23T16:58:38+11:00
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

const _ = require('lodash');
const hooks = require('./hooks');

class ShellService {
  constructor(options) {
    this.options = options || {};
    this.events = [
      'shell-output',
      'mongo-execution-end',
      'mongo-shell-reconnected',
      'mongo-shell-process-exited'
    ];
    this.docs = {
      description: 'A service to create mongo shell and execute command',
      find: {
        description: 'Get all opening shells'
      },
      get: {
        description: 'Execute cmd in a shell',
        parameters: [
          {
            in: 'path',
            required: true,
            name: 'id',
            type: 'string'
          },
          {
            in: 'query',
            required: true,
            name: 'type',
            type: 'string',
            description:
              'this paramter can either be script|cmd, if script specified,  ' +
              'service will run the script in mongo shell; othewise this service will run the command.'
          },
          {
            in: 'query',
            required: true,
            name: 'content',
            type: 'string'
          }
        ]
      },
      create: {
        description: 'Create a new shell',
        parameters: [
          {
            in: 'query',
            required: true,
            name: 'hostname',
            type: 'string'
          },
          {
            in: 'query',
            required: true,
            name: 'port',
            type: 'string'
          }
        ]
      },
      remove: {
        description: 'Remove a shell',
        parameters: [
          {
            in: 'path',
            required: true,
            name: 'id',
            type: 'string'
          }
        ]
      },
      put: {
        description: 'run mongo commands through shell',
        parameters: [
          {
            in: 'query',
            required: true,
            name: 'id',
            type: 'string'
          }
        ]
      }
    };
  }

  setup(app) {
    this.controller = app.service('mongo/connection/controller');
  }

  /**
   * return all open shells
   */
  find(_params) {
    return Promise.resolve(_.keys(this.controller.shells));
  }

  /**
   * run command through a shell.
   * @params params the format of this parameter is {type: script|cmd, content: ''}
   */
  get(id, params) {
    l.info('execution mongo command ', id, params);
    const { type, content, shellId } = params.query;

    if (type === 'script') {
      return this.controller.executeScript(id, shellId, content);
    } else if (type === 'cmd') {
      return this.controller.executeCmd(id, shellId, content);
    }
  }

  /**
   * run script commands on mongo shell
   * @param id  the id of the connection
   * @param data  {shellId, commands} shellId is the shell id to execute the commands
   */
  update(id, data) {
    l.info('run script commands ', data);
    return this.controller.executeCmd(id, data.shellId, data.commands);
  }

  /**
   * create a new shell connection for a mongo instance
   */
  create(connection, data) {
    l.info('create shell for connection ', connection, data);
    let shellId;
    if (data && data.query) {
      shellId = data.query.shellId;
    }
    return this.controller.createShellConnection(connection.id, shellId);
  }

  /**
   * close a shell by its ID
   */
  remove(id, data) {
    log.info('remove shell connection ', id, data.query);
    return this.controller.removeShellConnection(id, data.query.shellId);
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new ShellService();
  app.use('/mongo-shells', service);

  // Get our initialize service to that we can bind hooks
  const mongoShellService = app.service('/mongo-shells');

  // Set up our before hooks
  mongoShellService.before(hooks.before);

  // Set up our after hooks
  mongoShellService.after(hooks.after);
  return service;
};

module.exports.ShellService = ShellService;
