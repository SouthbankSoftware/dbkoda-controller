/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-11-16T04:18:44+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-16T17:45:59+11:00
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
import errors from 'feathers-errors';
import requireOperator from '../requireOperator';

export default () =>
  processItems((context, item) => {
    const { _id } = item;
    const { terminals } = context.service;
    const terminal = terminals.get(_id);

    if (!terminal) {
      throw new errors.NotFound(`SSH Terminal ${_id} doesn't exist`);
    }

    const { type } = terminal;

    requireOperator(type, 'destroy')(context, item);

    terminals.delete(_id);
  });
