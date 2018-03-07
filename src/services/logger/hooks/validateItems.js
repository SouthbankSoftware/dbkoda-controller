/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:17:37+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-07T03:02:35+11:00
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
import ajv from '~/helpers/ajv';
import { validateSchema } from 'feathers-hooks-common';

const findSchema = {
  properties: {},
  required: [],
  additionalProperties: false
};

const createSchema = {
  properties: {
    path: {
      type: 'string'
    },
    debug: {
      type: 'boolean',
      default: false
    }
  },
  required: ['path'],
  additionalProperties: false
};

const patchSchema = {
  properties: {
    path: {
      type: 'string'
    },
    content: {
      type: 'object',
      properties: {
        level: {
          tyep: 'string',
          default: 'info'
        },
        message: {},
        meta: {},
        timestamp: {
          tyep: 'number'
        }
      },
      required: ['level', 'message'],
      additionalProperties: false
    },
    debug: {
      type: 'boolean'
    }
  },
  required: ['path'],
  additionalProperties: false
};

const removeSchema = {
  properties: {
    path: {
      type: 'string'
    }
  },
  required: ['path'],
  additionalProperties: false
};

const schema = {
  find: findSchema,
  get: {},
  create: createSchema,
  update: {},
  patch: patchSchema,
  remove: removeSchema
};

const validators = _.reduce(
  schema,
  (acc, v, k) => {
    acc[k] = validateSchema(v, ajv);
    return acc;
  },
  {}
);

export default _options => hook => validators[hook.method](hook);
