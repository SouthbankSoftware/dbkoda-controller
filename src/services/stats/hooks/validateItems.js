/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:17:37+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-12T11:40:47+11:00
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

const createSchema = {
  properties: {
    _id: {
      type: 'string',
    },
    profileId: {
      type: 'string',
    },
  },
  required: ['_id', 'profileId'],
  additionalProperties: false,
};

const patchSchema = {
  properties: {
    _id: {
      type: 'string',
    },
    enabled: {
      type: 'boolean',
    },
  },
  required: ['_id'],
  additionalProperties: false,
};

const removeSchema = {
  properties: {
    _id: {
      type: 'string',
    },
  },
  required: ['_id'],
  additionalProperties: false,
};

const schema = {
  find: {},
  get: {},
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
