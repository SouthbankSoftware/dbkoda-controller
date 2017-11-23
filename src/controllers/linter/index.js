/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-23T16:18:03+11:00
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

const mongodb = require('mongodb');
const errors = require('feathers-errors');
const _ = require('lodash');
const hooks = require('feathers-hooks-common');
const { linter } = require('eslint');
const { SourceCode } = require('eslint');
const { CLIEngine } = require('eslint');

/**
 * this controller is used to handle auto complete for mongo shell
 */
class LintingController {

  setup(app) {
    this.app = app;
  }

  /**
   * execute auto complete.
   * @param {String} - code to be linted.
   * @param {Object} - params for linting.
   */
  lint(code, lintingOptions) {
    let cli = new CLIEngine({
      envs: ['es6', 'mocha', 'node']
    });
    const lintedCode = cli.executeOnText(code);

    // const lintedCode = linter.verify(code, this.getConfig());
    l.info('linting finished on: ', code);
    l.info('linting results: ', lintedCode);
    return lintedCode;
  }

  getConfig() {
    return {
      'extends': [
        'defaults/rules/eslint/best-practices/eslint',
        'defaults/rules/eslint/errors/eslint',
        'defaults/rules/eslint/es6/eslint',
        'defaults/rules/eslint/node/eslint',
        'defaults/rules/eslint/strict/eslint',
        'defaults/rules/eslint/style/eslint',
        'defaults/rules/eslint/variables/eslint'
      ],
      env: {
        es6: true,
        browser: true,
        node: true,
        mocha: true
      },
      rules: {
        semi: 1,
        quotes: [2, 'single']
      }
    };
  }

}

module.exports = function () {
  const app = this;
  // Initialize our service with any options it requires
  const service = new LintingController();
  app.use('linter/controller', service);
  app
    .service('linter/controller')
    .before({
      // Users can not be created by external access
      create: hooks.disallow('external'),
      remove: hooks.disallow('external'),
      update: hooks.disallow('external'),
      find: hooks.disallow('external'),
      get: hooks.disallow('external')
    });
  return service;
};

module.exports.LintingController = LintingController;
