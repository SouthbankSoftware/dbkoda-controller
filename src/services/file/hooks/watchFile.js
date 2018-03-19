/**
 * @Author: guiguan
 * @Date:   2017-04-26T17:28:39+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-14T00:10:50+11:00
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

export default _options => hook => {
  let items = getItems(hook);
  const isArray = Array.isArray(items);
  items = isArray ? items : [items];
  const { watcher } = hook.service;

  const processItem = item => {
    const { _id: path, watching } = item;

    if (watching) {
      // need to wait for some time here, otherwise writing will trigger a unwanted file change event
      setTimeout(() => {
        watcher.add(path);
      }, 2000);
    } else {
      watcher.unwatch(path);
    }

    return Promise.resolve();
  };

  return Promise.all(items.map(processItem)).then(() => hook);
};
