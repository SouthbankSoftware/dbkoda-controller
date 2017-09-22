/**
 * @Author: guiguan
 * @Date:   2017-09-22T11:09:38+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-09-22T13:10:25+10:00
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

import { getItems } from 'feathers-hooks-common';
import errors from 'feathers-errors';

export default _options => (hook) => {
  let items = getItems(hook);
  const isArray = Array.isArray(items);
  items = isArray ? items : [items];
  const { mongoConnection } = hook.service;

  // processItem should only return resolvable promise
  const processItem = async (item) => {
    try {
      const { connectionId, database, collection, pipeline, options } = item;
      const connection = mongoConnection.connections[connectionId];

      if (!connection) {
        return new errors.Unprocessable(`Cannot find connection with id ${connectionId}`);
      }

      const db = connection.driver.db(database);

      return db
        .collection(collection)
        .aggregate(pipeline, options)
        .toArray();
    } catch (err) {
      return err;
    }
  };

  return Promise.all(items.map(processItem)).then((results) => {
    if (isArray && results.length > 1) {
      hook.result = results;
    } else {
      hook.result = results[0];
      if (hook.result instanceof Error) {
        throw hook.result;
      }
    }
    return hook;
  });
};
