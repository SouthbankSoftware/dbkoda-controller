/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-12T15:46:20+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-07-13T10:24:12+10:00
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
  editor: {
    fontFamily: ?string,
    fontSize: ?string,
    fontWeight: number,
    lineHeight: number
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
          type: 'boolean',
          title: 'Use Docker',
          description: 'Use dockerized Mongo shell binary'
        },
        docker: {
          type: 'object',
          properties: {
            cmd: {
              type: ['string', 'null'],
              title: 'Docker Binary Path',
              description: 'Absolute path to Docker binary',
              browsable: true,
              fileOnly: true
            },
            createNew: {
              type: 'boolean',
              title: 'Create New Container'
            },
            imageName: {
              type: ['string', 'null'],
              title: 'Image Name'
            },
            containerId: {
              type: ['string', 'null'],
              title: 'Container ID'
            },
            hostPath: {
              type: ['string', 'null'],
              title: 'Host Mount Path',
              description: 'Volume mount path on host',
              browsable: true
            },
            containerPath: {
              type: ['string', 'null'],
              title: 'Container Mount Path',
              description: 'Volume mount path in container'
            }
          }
        },
        cmd: {
          type: ['string', 'null'],
          title: 'Mongo Binary Path',
          description: 'Absolute path to Mongo shell binary',
          browsable: true,
          fileOnly: true
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
      title: 'Apache Drill Path',
      description: 'Absolute path to Apache Drill directory',
      browsable: true,
      dirOnly: true
    },
    drillControllerCmd: {
      type: ['string', 'null']
    },
    showWelcomePageAtStart: {
      type: 'boolean'
    },
    telemetryEnabled: {
      type: 'boolean',
      title: 'Allow Telemetry Data',
      description:
        'Allow sending anonymous telemetry data to dbKoda so we can improve with your help'
    },
    showNewFeaturesDialogOnStart: {
      type: 'boolean',
      title: 'Show New Features Dialog on Startup'
    },
    tableOutputDefault: {
      type: 'boolean',
      title: 'Use Table Output as Default Output'
    },
    automaticAutoComplete: {
      type: 'boolean',
      title: 'Enable auto-completion when typing',
      description: 'Editor tabs need to be re-opened in order to take effect'
    },
    passwordStoreEnabled: {
      type: 'boolean',
      title: 'Enable Password Store'
    },
    performancePanel: {
      type: 'object',
      properties: {
        preventDisplaySleep: {
          type: 'boolean',
          title: 'Prevent Display Sleep when Lab is Visible',
          description: 'Performance Lab needs to be restarted in order to take effect'
        },
        metricSmoothingWindow: {
          type: 'integer',
          title: 'Metric Moving Average (number of samples)',
          minimum: 1
        },
        foregroundSamplingRate: {
          type: 'integer',
          title: 'Foreground Sampling Rate (ms)',
          minimum: 1000
        },
        backgroundSamplingRate: {
          type: 'integer',
          title: 'Background Sampling Rate (ms)',
          minimum: 1000
        },
        historySize: {
          type: 'integer',
          title: 'History Size (number of samples)',
          minimum: { $data: '1/historyBrushSize' }
        },
        historyBrushSize: {
          type: 'integer',
          title: 'History Default Brush Size (number of samples)',
          minimum: 1,
          maximum: { $data: '1/historySize' }
        },
        alarmDisplayingWindow: {
          type: 'integer',
          title: 'Alarm Keepalive (ms)',
          minimum: 1000
        }
      }
    },
    editor: {
      type: 'object',
      properties: {
        fontFamily: {
          type: ['string', 'null'],
          title: 'Font Family',
          // $FlowFixMe
          description: `e.g. ${configDefaults.editor.fontFamily}`
        },
        fontSize: {
          type: ['string', 'null'],
          title: 'Font Size',
          // $FlowFixMe
          description: `e.g. ${configDefaults.editor.fontSize}`
        },
        fontWeight: {
          type: 'integer',
          title: 'Font Weight',
          minimum: 1
        },
        lineHeight: {
          type: 'number',
          title: 'Line Height'
        }
      }
    },
    maxOutputHistory: {
      type: 'integer',
      title: 'Max Output History Lines to Keep',
      description: 'Maximum number of history lines should be kept for output panel',
      minimum: 1
    }
  },
  additionalProperties: false
};

export default configSchema;
