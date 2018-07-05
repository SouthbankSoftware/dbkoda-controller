/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-12T15:46:20+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-07-03T11:43:07+10:00
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

// [IMPORTANT] please keep `configDefaults` (both flow types and default values) and `configSchema`
// consistent
export const configDefaults: {
  user: {
    id: ?string
  },
  mongo: {
    dockerized: boolean,
    docker: {
      cmd: ?string,
      createNew: boolean,
      imageName: ?string,
      containerId: ?string,
      hostPath: ?string,
      containerPath: ?string
    },
    cmd: ?string,
    versionCmd: ?string,
    importCmd: ?string,
    exportCmd: ?string,
    dumpCmd: ?string,
    restoreCmd: ?string
  },
  drillCmd: ?string,
  drillControllerCmd: ?string,
  telemetryEnabled: boolean,
  showNewFeaturesDialogOnStart: boolean,
  tableOutputDefault: boolean,
  automaticAutoComplete: boolean,
  showWelcomePageAtStart: boolean,
  passwordStoreEnabled: boolean,
  performancePanel: {
    preventDisplaySleep: boolean,
    metricSmoothingWindow: number,
    foregroundSamplingRate: number,
    backgroundSamplingRate: number,
    historySize: number,
    historyBrushSize: number,
    alarmDisplayingWindow: number
  },
  maxOutputHistory: number
} = {
  user: {
    id: null // this should always be `null` by default, and controller will figure it out
  },
  mongo: {
    dockerized: false,
    docker: {
      cmd: null, // this should always be `null` by default, and controller will figure it out
      createNew: true,
      imageName: 'mongo:3.6',
      containerId: null,
      hostPath: null,
      containerPath: null
    },
    cmd: null, // this should always be `null` by default, and controller will figure it out
    versionCmd: null,
    importCmd: null,
    exportCmd: null,
    dumpCmd: null,
    restoreCmd: null
  },
  drillCmd: null, // ui will figure this out
  drillControllerCmd: null, // ui will figure this out
  telemetryEnabled: true,
  showNewFeaturesDialogOnStart: true,
  tableOutputDefault: true,
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
  },
  editor: {
    fontFamily: '"Courier New", "Courier", "monospace"',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.28581
  },
  maxOutputHistory: 1000
};

const configSchema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'null']
        }
      }
    },
    mongo: {
      type: 'object',
      properties: {
        dockerized: {
          type: 'boolean'
        },
        docker: {
          type: 'object',
          properties: {
            cmd: {
              type: ['string', 'null'],
              isFilePath: true
            },
            createNew: {
              type: 'boolean'
            },
            imageName: {
              type: ['string', 'null']
            },
            containerId: {
              type: ['string', 'null']
            },
            hostPath: {
              type: ['string', 'null'],
              isFilePath: true
            },
            containerPath: {
              type: ['string', 'null']
            }
          }
        },
        cmd: {
          type: ['string', 'null'],
          isFilePath: true
        },
        versionCmd: {
          type: ['string', 'null']
        },
        importCmd: {
          type: ['string', 'null']
        },
        exportCmd: {
          type: ['string', 'null']
        },
        dumpCmd: {
          type: ['string', 'null']
        },
        restoreCmd: {
          type: ['string', 'null']
        }
      }
    },
    drillCmd: {
      type: ['string', 'null'],
      isFilePath: true
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
    },
    editor: {
      type: 'object',
      properties: {
        fontFamily: {
          type: ['string', 'null']
        },
        fontSize: {
          type: ['string', 'null']
        },
        fontWeight: {
          type: 'integer',
          minimum: 1
        },
        lineHeight: {
          type: 'number'
        }
      }
    },
    maxOutputHistory: {
      type: 'integer',
      minimum: 1
    }
  },
  additionalProperties: false
};

export default configSchema;
