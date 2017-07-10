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

/**
 * @Author: mike
 * @Date:   2017-04-05 12:06:54
 * @Last modified by:   guiguan
 * @Last modified time: 2017-06-08T18:00:34+10:00
 */

const hooks = require('./hooks');

class LintingService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      description: 'A service to lint editor code.',
      get: {
        description: 'Execute linting on some code.',
        parameters: [
          {
            in: 'query',
            required: true,
            name: 'code',
            type: 'string',
          },
          {
            in: 'query',
            required: false,
            name: 'options',
            type: 'string',
          },
        ],
      },
    };
  }

  setup(app) {
    this.controller = app.service('linter/controller');
  }

  /**
   * run command linting.
   */
  get(data, params) {
    l.info('run linting on code: ', data, ' + ', params);
    const lintedCode = this.controller.lint(params.query.code, params.query.options);
    return Promise.resolve(lintedCode);
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new LintingService();
  app.use('/linter', service);

  // Get our initialize service to that we can bind hooks
  const mongoService = app.service('/linter');

  // Set up our before hooks
  mongoService.before(hooks.before);

  // Set up our after hooks
  mongoService.after(hooks.after);
  return service;
};

module.exports.LintingService = LintingService;
