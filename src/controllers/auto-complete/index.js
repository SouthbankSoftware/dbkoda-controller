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

const MongoShell = require('../mongo-shell').MongoShell;
const hooks = require('feathers-hooks-common');

/**
 * this controller is used to handle auto complete for mongo shell
 */
class AutoCompleteController {

  setup(app) {
    this.app = app;
    this.mongoShell = app.service('/mongo-shells');
    this.mongoController = app.service('mongo/connection/controller');
  }

  /**
   * execute auto complete
   * @param id  connection id
   * @param shellId connection shell id
   * @param command the command need to auto complete
   */
  autoComplete(id, shellId, command) {
    const shell = this.mongoController.getMongoShell(id, shellId);
    shell.writeAutoComplete('shellAutocomplete(\'' + command + '\');__autocomplete__\n');

    return new Promise((resolve) => {
      const listener = (data) => {
        const output = data.replace('[', '').replace(']', '');
        let array = output.split(',');
        array = array.map(a => a.trim().replace(/"/g, ''));

        resolve(array);
        // let removeLength = length;
        // shell.removeListener(MongoShell.AUTO_COMPLETE_END, listener);
        // const output = [];
        // if (Array.isArray(data)) {
        //   data.map((line) => {
        //     const splits = line.split(' ');
        //     splits.map((l) => {
        //       if (l.length > removeLength) {
        //         removeLength = l.length;
        //       }
        //       // sometimes got a dot line
        //       if (l.trim().length > 0) {
        //         const newL = l.split('\r\n');
        //         if (newL.length > 1) {
        //           newL.map(ll => output.push(stripAnsi(ll)));
        //         } else {
        //           output.push(stripAnsi(l));
        //         }
        //       }
        //     });
        //   });
        // }
        // // remove left command on shell
        // _.times(removeLength, () => shell.writeToShell('\b'));
        // let outputArray = [];
        // output.map((o) => {
        //   if (o && o !== command && o.length > command.length) {
        //     outputArray.push(stripAnsi(o));
        //   }
        // });
        // outputArray.splice(0, 1);
        // // make sure give unique response
        // outputArray = _.union(outputArray);
        // resolve(outputArray);
      };
      shell.on(MongoShell.AUTO_COMPLETE_END, listener);
    });
  }

}

module.exports = function () {
  const app = this;
  // Initialize our service with any options it requires
  const service = new AutoCompleteController();
  app.use('mongo/auto-complete/controller', service);
  app.service('mongo/auto-complete/controller')
    .before({
      // Users can not be created by external access
      create: hooks.disallow('external'),
      remove: hooks.disallow('external'),
      update: hooks.disallow('external'),
      find: hooks.disallow('external'),
      get: hooks.disallow('external'),
    });
  return service;
};

module.exports.AutoCompleteController = AutoCompleteController;
