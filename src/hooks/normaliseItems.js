/**
 * @Author: guiguan
 * @Date:   2017-09-22T09:43:34+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-09-22T10:53:02+10:00
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

import _ from 'lodash';
import errors from 'feathers-errors';
import { getItems } from 'feathers-hooks-common';

const consolidateQueryParams = (hook) => {
  hook.data = _.assign(hook.data, hook.params.query);
};

const consoldateId = (hook) => {
  if (hook.id) {
    hook.data._id = hook.id;
  }
};

const checkIdAndItems = (hook) => {
  const items = getItems(hook);
  if (hook.id && _.isArray(items)) {
    throw new errors.BadRequest('Data must be an object if an id is specified');
  }
};

export default _options => (hook) => {
  consolidateQueryParams(hook);
  switch (hook.method) {
    case 'get': {
      consoldateId(hook);
      break;
    }
    case 'update':
    case 'patch': {
      checkIdAndItems(hook);
      consoldateId(hook);
      break;
    }
    case 'remove': {
      consoldateId(hook);
      break;
    }
    default: {
      break;
    }
  }
};
