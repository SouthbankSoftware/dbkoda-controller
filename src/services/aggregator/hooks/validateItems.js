/**
 * @Author: guiguan
 * @Date:   2017-09-22T09:43:34+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-10-02T16:34:36+11:00
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
import Ajv from 'ajv';
import { validateSchema } from 'feathers-hooks-common';

const defaultAjvOptions = {
  removeAdditional: 'all',
  useDefaults: true,
  allErrors: true,
  coerceTypes: true
};

const querySchema = {
  properties: {
    editorId: {
      type: 'string'
    },
    connectionId: {
      type: 'string'
    },
    database: {
      type: 'string'
    },
    collection: {
      type: 'string'
    },
    pipeline: {
      type: 'array',
      items: {
        type: 'object'
      }
    },
    options: {
      type: 'object',
      default: {}
    }
  },
  required: ['editorId', 'connectionId', 'database', 'collection', 'pipeline']
};

const schema = {
  find: {},
  get: {},
  create: querySchema,
  update: {},
  patch: {},
  remove: {}
};

const validators = _.reduce(
  schema,
  (acc, v, k) => {
    acc[k] = validateSchema(v, Ajv, defaultAjvOptions);
    return acc;
  },
  {}
);

export default _options => hook => validators[hook.method](hook);
