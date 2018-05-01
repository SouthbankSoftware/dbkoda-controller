/**
 * @Author: guiguan
 * @Date:   2017-09-22T09:43:34+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-17T10:35:26+11:00
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

const getSchema = {
  properties: {
    _id: {
      type: 'string'
    }
  },
  required: ['_id'],
  additionalProperties: false
};

const createSchema = {
  properties: {
    masterPassword: {
      type: 'string'
    },
    profileIds: {
      type: 'array'
    }
  },
  required: ['masterPassword'],
  additionalProperties: false
};

const patchSchema = {
  properties: {
    password: {
      type: 'string'
    }
  },
  required: ['password'],
  additionalProperties: false
};

const removeSchema = {
  additionalProperties: false
};

const schema = {
  find: {},
  get: getSchema,
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
