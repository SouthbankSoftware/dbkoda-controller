/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:17:37+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-18T09:27:30+11:00
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

const itemsSchema = {
  type: 'array',
  item: {
    type: 'string',
  },
};

const findSchema = {
  properties: {
    items: itemsSchema,
  },
  required: [],
  additionalProperties: false,
};

const getSchema = {
  properties: {
    profileId: {
      type: 'string',
    },
    items: itemsSchema,
  },
  required: ['profileId'],
  additionalProperties: false,
};

const createSchema = {
  properties: {
    profileId: {
      type: 'string',
    },
    items: itemsSchema,
    options: {
      type: 'object',
    },
  },
  required: ['profileId', 'items'],
  additionalProperties: false,
};

const patchSchema = {
  properties: {
    profileId: {
      type: 'string',
    },
    items: itemsSchema,
    samplingRate: {
      type: 'number',
      minimum: 0,
    },
  },
  required: ['profileId'],
  additionalProperties: false,
};

const removeSchema = {
  properties: {
    profileId: {
      type: 'string',
    },
    items: itemsSchema,
  },
  required: ['profileId'],
  additionalProperties: false,
};

const schema = {
  find: findSchema,
  get: getSchema,
  create: createSchema,
  update: {},
  patch: patchSchema,
  remove: removeSchema,
};

const validators = _.reduce(
  schema,
  (acc, v, k) => {
    acc[k] = validateSchema(v, ajv);
    return acc;
  },
  {},
);

export default _options => hook => validators[hook.method](hook);
