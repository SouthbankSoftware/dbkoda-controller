/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-11-16T11:37:14+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-16T14:19:26+11:00
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
import _ from 'lodash';

export default (processItem: (context: {}, item: {}) => Promise) => (context) => {
  let items = getItems(context);
  const isArray = Array.isArray(items);
  items = isArray ? items : [items];

  return Promise.all(
    items.map(item =>
      Promise.resolve()
        .then(() => processItem(context, item))
        .then(payload => ({ _id: item._id, payload }))
        .catch(error => ({
          _id: item._id,
          error: error instanceof errors.FeathersError ? error : error.message || String(error),
        })),
    ),
  ).then((results) => {
    if (isArray) {
      context.result = results;
    } else {
      context.result = results[0];

      let { error } = context.result;

      if (error) {
        const { _id } = context.result;
        const errorData = { _id };

        if (error instanceof errors.FeathersError) {
          error.data = _.assign(error.data, errorData);
        } else {
          error = new errors.Unprocessable(error, errorData);
        }

        throw error;
      }
    }
    return context;
  });
};
