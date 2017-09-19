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
 * @Date:   2017-03-31T09:40:35+11:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-09-19T17:16:37+10:00
 */

import { getItems } from 'feathers-hooks-common';
import errors from 'feathers-errors';
import fs from 'fs-extra';

const ENCODING = 'utf8';

export default _options => (hook) => {
  let items = getItems(hook);
  const isArray = Array.isArray(items);
  items = isArray ? items : [items];

  const processItem = (item) => {
    const path = item._id;

    return new Promise((resolve) => {
      if (item.copyTo) {
        const copyTo = item.copyTo;

        // copy the file instead of reading
        try {
          fs.copy(
            path,
            copyTo,
            {
              overwrite: true,
              dereference: false,
              preserveTimestamps: false,
            },
            (err) => {
              if (err) {
                if (err.code === 'ENOENT') {
                  return resolve(
                    new errors.NotFound(err.message, {
                      _id: path,
                      copyTo,
                    }),
                  );
                }
                return resolve(
                  new errors.Unprocessable(err.message, {
                    _id: path,
                    copyTo,
                  }),
                );
              }
              resolve({
                _id: path,
                copyTo,
              });
            },
          );
        } catch (err) {
          return resolve(
            new errors.Unprocessable(err.message, {
              _id: path,
              copyTo,
            }),
          );
        }

        return;
      }

      try {
        fs.readFile(path, ENCODING, (err, content) => {
          if (err) {
            if (err.code === 'ENOENT') {
              return resolve(
                new errors.NotFound(err.message, {
                  _id: path,
                }),
              );
            }
            return resolve(
              new errors.Unprocessable(err.message, {
                _id: path,
              }),
            );
          }
          resolve({
            _id: path,
            content,
            encoding: ENCODING,
          });
        });
      } catch (err) {
        return resolve(
          new errors.Unprocessable(err.message, {
            _id: path,
          }),
        );
      }
    });
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
