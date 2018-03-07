/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-05T14:43:58+11:00
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

/* eslint class-methods-use-this: 0 */
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import fs from 'fs';
import _ from 'lodash';
import { execSync } from 'child_process';
import { loadCommands } from '../../config';
import hooks from './hooks';

class SupportBundleService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      description: 'A service for creating support bundles.',
      get: {
        description: 'create a support bundle and return location.',
        parameters: []
      }
    };
  }

  async get(getCreatedDate) {
    if (getCreatedDate) {
      const dateFolderCreated = await this._getCreatedDate();
      return Promise.resolve(dateFolderCreated);
    }
    const bundlePath = await this._createBundle();
    l.info('Returning support bundle location to UI.');
    return Promise.resolve(bundlePath);
  }

  _getCreatedDate() {
    return new Promise((resolve, reject) => {
      try {
        const folderStat = fs.statSync(path.resolve(os.homedir(), '.dbKoda'));
        let birth = folderStat.birthtime;
        // Get birth.
        birth = JSON.stringify(birth);
        birth = new Date(birth.substr(0, 8));

        // Get today.
        let today = new Date();
        let dd = today.getDate();
        let mm = today.getMonth() + 1; // January is 0!
        const yyyy = today.getFullYear();

        if (dd < 10) {
          dd = '0' + dd;
        }

        if (mm < 10) {
          mm = '0' + mm;
        }

        today = mm + '/' + dd + '/' + yyyy;
        today = new Date(today);
        let daysSinceBirth = today - birth;
        daysSinceBirth /= 1000 * 60 * 60 * 24;
        resolve({ dateCreated: birth, daysSinceCreation: daysSinceBirth });
      } catch (e) {
        l.error(e);
        reject(e);
      }
    });
  }

  _bundleFiles(bundlePath, filePaths) {
    return new Promise((resolve, reject) => {
      try {
        l.info('Creating new bundle at:', bundlePath);

        const output = fs.createWriteStream(bundlePath);
        const archive = archiver('zip', {
          zlib: { level: 7 } // Sets compression level
        });

        // listen for all archive data to be written.
        output.on('close', () => {
          l.info(archive.pointer() + ' total byes');
          l.info('archiver has been finalized and the output file descriptor has closed.');
          resolve(bundlePath);
        });

        // good practice to catch warnings
        archive.on('warning', err => {
          if (err.code === 'ENOENT') {
            l.warn(err);
          } else {
            reject(err);
          }
        });

        archive.on('error', err => {
          reject(err);
        });

        archive.pipe(output);

        // Append stateStore.
        if (fs.existsSync(filePaths.statePath)) {
          l.info('Appending State Store...');
          archive.append(fs.createReadStream(filePaths.statePath), {
            name: 'stateStore.json'
          });
        }

        // Append config.yml
        if (fs.existsSync(filePaths.configPath)) {
          l.info('Appending Config...');
          archive.append(fs.createReadStream(filePaths.configPath), {
            name: 'config.yml'
          });
        }

        // Append controller log.
        if (fs.existsSync(filePaths.controllerLogPath)) {
          l.info('Appending Controller Log...');
          archive.append(fs.createReadStream(filePaths.controllerLogPath), {
            name: 'controllerLog.txt'
          });
        }

        // Append dbKoda log.
        if (filePaths.dbKodaLogPath && fs.existsSync(filePaths.dbKodaLogPath)) {
          l.info('Appending App Log...');
          archive.append(fs.createReadStream(filePaths.dbKodaLogPath), {
            name: 'applicationLog.txt'
          });
        }

        // Get OS and Mongo Version.
        if (filePaths.dbKodaLogPath && fs.existsSync(filePaths.dbKodaLogPath)) {
          l.info('Appending OS and Mongo Version...');
          // Get OS:
          const osType = os.platform();
          // Get OS version:
          const osRelease = os.release();
          // Get Mongo Version.
          let mongoVersion = 'Undetermined';
          try {
            const configObj = loadCommands();

            if (!configObj.mongoVersionCmd) {
              log.error('unkonwn version');
              mongoVersion = 'UNKNOWN';
            } else {
              const output = execSync(configObj.mongoVersionCmd, {
                encoding: 'utf8'
              });
              mongoVersion = output;
              const mongoVStr = output.split('\n');
              if (mongoVStr && mongoVStr.length > 0) {
                if (mongoVStr[0].indexOf('MongoDB shell version v') >= 0) {
                  mongoVersion = mongoVStr[0].replace('MongoDB shell version v', '').trim();
                }
                if (mongoVStr[0].indexOf('MongoDB shell version:') >= 0) {
                  mongoVersion = mongoVStr[0].replace('MongoDB shell version:', '').trim();
                }
                mongoVersion = mongoVStr[0];
              }
            }
          } catch (e) {
            l.error('Unable to get Mongo version due to error: ', e);
            mongoVersion = 'UNKNOWN';
          }

          l.info(
            'System info Found: { "osType": "' +
              osType +
              '", "osRelease": "' +
              osRelease +
              '", "mongoShellVersion": "' +
              mongoVersion.replace('MongoDB shell version v', '') +
              '"}'
          );

          archive.append(
            '{ "osType": "' +
              osType +
              '", "osRelease": "' +
              osRelease +
              '", "mongoShellVersion": "' +
              mongoVersion.replace('MongoDB shell version v', '') +
              '"}',
            { name: 'systemInfo.json' }
          );
        }

        // Finalize the archive
        archive.finalize();
      } catch (e) {
        reject(e);
      }
    });
  }

  _createBundle() {
    return new Promise((resolve, reject) => {
      // Do all the logic to create a bundle.
      let configPath = path.resolve(os.homedir(), '.dbKoda', 'config.yml');
      const statePath = path.resolve(os.homedir(), '.dbKoda', 'stateStore.json');
      let isBundlePathValid = false;
      let bundleNumber = 1;
      let bundlePath = path.resolve(os.homedir(), '.dbKoda', 'supportBundle.zip');

      while (!isBundlePathValid) {
        if (fs.existsSync(bundlePath)) {
          l.info('Support bundle already exists.');
          bundlePath = path.resolve(
            os.homedir(),
            '.dbKoda',
            'supportBundle-' + bundleNumber + '.zip'
          );
          bundleNumber += 1;
        } else {
          isBundlePathValid = true;
        }
      }

      l.info('Creating new support bundle (dev mode).');
      l.info('The following paths will be added to a support bundle: ');
      let logPath;
      if (global.IS_PRODUCTION) {
        logPath = process.env.LOG_PATH;
        configPath = process.env.CONFIG_PATH;
      } else if (os.release().match(/Win/gi)) {
        logPath = path.resolve(os.homedir(), 'AppData', 'Roaming', 'dbKoda', 'logs');
      } else {
        logPath = path.resolve(os.homedir(), 'Library', 'Application Support', 'dbKoda', 'logs');
      }

      const files = fs.readdirSync(logPath);
      const controllerLogList = [];
      const appLogList = [];

      l.info('Files in Log Directory:');
      files.map(file => {
        l.info(file);
        if (file.match(/controller/g)) {
          controllerLogList.push(file);
        } else if (file.match(/app/g)) {
          appLogList.push(file);
        }
      });

      const controllerLogPath = path.join(
        logPath,
        _.max(controllerLogList, f => {
          const fullPath = path.join(logPath, f);
          return fs.statSync(fullPath).ctime;
        })
      );
      const dbKodaLogPath = path.join(
        logPath,
        _.max(appLogList, f => {
          const fullPath = path.join(logPath, f);
          return fs.statSync(fullPath).ctime;
        })
      );

      l.info('App Logs: ', dbKodaLogPath);
      l.info('Controller Logs: ', controllerLogPath);
      l.info('Config File: ', configPath);
      l.info('State Store: ', statePath);

      // Create filePaths object
      const filePaths = {
        controllerLogPath,
        dbKodaLogPath,
        statePath,
        configPath
      };

      // Create Support Bundle at Log Location.
      this._bundleFiles(bundlePath, filePaths)
        .then(res => {
          // Return location of file.
          l.info('Support bundles at: ', res);
          resolve(res);
        })
        .catch(err => {
          l.error('Support bundle failed to create with err: ', err);
          reject(err);
        });
    });
  }
}

module.exports = function() {
  const app = this;

  // Initialize our service with any options it requires
  const service = new SupportBundleService();
  app.use('/supportBundle', service);

  // Get our initialize service to that we can bind hooks
  const supportBundleService = app.service('/supportBundle');

  // Set up our before hooks
  supportBundleService.before(hooks.before);

  // Set up our after hooks
  supportBundleService.after(hooks.after);
  return service;
};

module.exports.Service = SupportBundleService;
