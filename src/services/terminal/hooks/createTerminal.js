/**
 * @Author: guiguan
 * @Date:   2017-09-22T11:09:38+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2018-07-17T14:36:21+10:00
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

import processItems from '~/hooks/processItems';
import _ from 'lodash';
import requireOperator from '../requireOperator';

export default () =>
  processItems(async (context, item) => {
    const { _id, type, debug } = item;
    const { terminals } = context.service;

    // if the terminal with the given ID already exists, do nothing
    if (terminals.has(_id)) {
      l.debug(`SSH Terminal ${_id} already exists`);
      return { new: false };
    }

    const terminal = await requireOperator(type, 'init')(context, item);
    terminals.set(_id, _.assign(terminal, { _id, type, debug }));

    return { new: true };
  });
