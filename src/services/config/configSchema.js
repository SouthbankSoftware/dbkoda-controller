/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-12T15:46:20+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-14T08:00:44+11:00
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

// $FlowFixMe
import Ajv from 'ajv';
import ajv from '~/helpers/ajv';
import app from '~/app';
import { isDockerCommand } from '../../controllers/docker';

// [IMPORTANT] please keep `configDefaults` and `configSchema` consistent
export const configDefaults = {
  mongoCmd: null, // this should always be `null` by default, and controller will figure it out
  drillCmd: null, // ui will figure this out
  drillControllerCmd: null, // ui will figure this out
  mongoVersionCmd: null,
  telemetryEnabled: true,
  showNewFeaturesDialogOnStart: true,
  tableOutputDefault: false,
  automaticAutoComplete: true,
  showWelcomePageAtStart: true,
  passwordStoreEnabled: false,
  performancePanel: {
    preventDisplaySleep: false,
    metricSmoothingWindow: 6,
    foregroundSamplingRate: 5000,
    backgroundSamplingRate: 15000,
    historySize: 720,
    historyBrushSize: 30,
    alarmDisplayingWindow: 60000
  }
};

const configSchema = {
  $async: true,
  type: 'object',
  properties: {
    mongoCmd: {
      type: ['string', 'null'],
      validMongoCmd: null
    },
    mongoVersionCmd: {
      type: ['string', 'null'],
    },
    drillCmd: {
      type: ['string', 'null']
    },
    drillControllerCmd: {
      type: ['string', 'null']
    },
    showWelcomePageAtStart: {
      type: 'boolean'
    },
    telemetryEnabled: {
      type: 'boolean'
    },
    showNewFeaturesDialogOnStart: {
      type: 'boolean'
    },
    tableOutputDefault: {
      type: 'boolean'
    },
    automaticAutoComplete: {
      type: 'boolean'
    },
    passwordStoreEnabled: {
      type: 'boolean'
    },
    performancePanel: {
      type: 'object',
      properties: {
        preventDisplaySleep: {
          type: 'boolean'
        },
        metricSmoothingWindow: {
          type: 'integer',
          minimum: 1
        },
        foregroundSamplingRate: {
          type: 'integer',
          minimum: 1000
        },
        backgroundSamplingRate: {
          type: 'integer',
          minimum: 1000
        },
        historySize: {
          type: 'integer',
          minimum: { $data: '1/historyBrushSize' }
        },
        historyBrushSize: {
          type: 'integer',
          minimum: 1,
          maximum: { $data: '1/historySize' }
        },
        alarmDisplayingWindow: {
          type: 'integer',
          minimum: 1000
        }
      }
    }
  },
  additionalProperties: false
};

ajv.addKeyword('validMongoCmd', {
  async: true,
  type: 'string',
  validate: (schema, path) => {
    if (path === null) return Promise.resolve(true);

    if (isDockerCommand(path)) return Promise.resolve(true);

    const mongoCmdValidatorService = app.service('mongo-cmd-validator');

    return mongoCmdValidatorService
      .create({
        mongoCmdPath: path
      })
      .then(() => true)
      .catch(err => {
        l.error(err);

        return Promise.reject(new Ajv.ValidationError([err]));
      });
  }
});

export default configSchema;
