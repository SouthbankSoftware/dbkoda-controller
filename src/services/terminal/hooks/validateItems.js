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
import terminalTypes from '../terminalTypes';

const sizeSchema = {
  type: 'object',
  properties: {
    cols: {
      type: 'number',
    },
    rows: {
      type: 'number',
    },
  },
  required: ['cols', 'rows'],
};

const createSchema = {
  properties: {
    _id: {
      type: 'string',
    },
    type: {
      enum: _.keys(terminalTypes),
    },
    debug: {
      type: 'boolean',
      default: false,
    },
    username: {
      type: 'string',
    },
    password: {
      type: 'string',
    },
    host: {
      type: 'string',
    },
    port: {
      type: 'number',
    },
    privateKey: {
      type: 'string',
    },
    passphrase: {
      type: 'string',
    },
    profileId: {
      type: 'string',
    },
    size: sizeSchema,
  },
  required: ['_id', 'type'],
  additionalProperties: false,
  switch: [
    {
      if: {
        properties: {
          type: { const: terminalTypes.ssh },
        },
      },
      then: {
        required: ['username', 'host', 'port'],
      },
    },
  ],
};

const patchSchema = {
  properties: {
    _id: {
      type: 'string',
    },
    cmd: {
      type: 'string',
    },
    size: sizeSchema,
    debug: {
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
