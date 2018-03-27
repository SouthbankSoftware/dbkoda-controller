/**
 * @Author: guiguan
 * @Date:   2017-04-26T12:33:31+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-27T17:06:39+11:00
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

const watching = true;

const defaultAjvOptions = {
  removeAdditional: 'all',
  useDefaults: true,
  allErrors: true,
  coerceTypes: true
};

const schemaCreateUpdate = {
  properties: {
    _id: {
      type: 'string'
    },
    watching: {
      type: 'boolean',
      default: watching
    },
    content: {
      type: 'string'
    }
  },
  required: ['_id', 'content']
};

const schema = {
  find: {
    properties: {
      watchingList: {
        type: 'boolean'
      }
    },
    required: ['watchingList']
  },
  get: {
    properties: {
      _id: {
        type: 'string'
      },
      watching: {
        type: 'boolean',
        default: watching
      },
      copyTo: {
        type: 'string'
      }
    },
    required: ['_id']
  },
  create: schemaCreateUpdate,
  update: schemaCreateUpdate,
  patch: {
    properties: {
      _id: {
        type: 'string'
      },
      watching: {
        type: 'boolean'
      },
      content: {
        type: 'string'
      }
    },
    required: ['_id']
  },
  remove: {
    properties: {
      _id: {
        type: 'string'
      }
    },
    required: ['_id']
  }
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
