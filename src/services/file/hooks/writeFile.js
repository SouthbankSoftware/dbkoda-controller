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
 * @Author: guiguan
 * @Date:   2017-03-31T14:16:31+11:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-06-08T18:02:23+10:00
 */

import { getItems } from 'feathers-hooks-common';
import errors from 'feathers-errors';
import fs from 'fs';
import path from 'path';

const ENCODING = 'utf8';

export default _options => hook => {
  const {
    service: { watcher }
  } = hook;
  let items = getItems(hook);
  const isArray = Array.isArray(items);
  items = isArray ? items : [items];

  const processItem = item => {
    const { _id, content } = item;

    if (item.watching === undefined) {
      let watching = watcher.getWatched()[path.dirname(_id)] || false;
      watching = watching && watching.indexOf(path.basename(_id)) !== -1;
      item.watching = watching;
      l.info(watching);
    }

    if (content === undefined) {
      return Promise.resolve({ _id });
    }

    watcher.unwatch(_id);

    return new Promise(resolve => {
      try {
        fs.writeFile(
          _id,
          content,
          {
            encoding: ENCODING
          },
          err => {
            if (err) {
              return resolve(
                new errors.Unprocessable(err.message, {
                  _id
                })
              );
            }
            resolve({ _id });
          }
        );
      } catch (err) {
        return resolve(
          new errors.Unprocessable(err.message, {
            _id
          })
        );
      }
    });
  };

  return Promise.all(items.map(processItem)).then(results => {
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
