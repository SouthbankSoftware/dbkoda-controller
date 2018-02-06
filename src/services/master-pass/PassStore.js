/**
 * @flow
 *
 * @Last modified by:   christrott
 * @Last modified time: 2017-01-30T15:17:54+11:00
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

import path from 'path';
import os from 'os';
import _ from 'lodash';
// $FlowFixMe
import yaml from 'js-yaml';

export default class PassStore {
  // $FlowFixMe
  file;
  storeFilePath: string;
  store: Map<string, string>; // Store the map of profileId and password

  // $FlowFixMe
  constructor(fileService) {
    this.file = fileService;
    this.storeFilePath = (process.env.UAT == 'true')
      ? path.resolve('tmp', 'store.yml')
      : path.resolve(os.homedir(), '.dbKoda', 'store.yml');
    this.store = new Map();
  }

  getPassword(profileId: string): Promise<string> {
    // $FlowFixMe
    const password: string = this.store.get(profileId);
    return Promise.resolve(password);
  }

  setPassword(profileId: string, password: string) {
    // Set the password in the store
    this.store.set(profileId, password);
    // Save the encrypted store to a file
    const storeDump = yaml.safeDump(PassStore._convertStoreToJson(this.store));
    return this.file.create({ _id: this.storeFilePath, content: storeDump });
  }

  initStore(verifyHash: string): Promise<string> {
    // Load the existing file
    return this.file
      .get(this.storeFilePath)
      .then((storeFile) => {
        if (storeFile) {
          const storeObj = yaml.safeLoad(storeFile.content, 'utf-8');
          this.store = PassStore._convertJsonToStore(storeObj);
          return Promise.resolve();
        }
      })
      .catch((error) => {
        if (error && error.code === 404) {
          console.log('File not found, creating new file');
          Promise.resolve(this.createStore(verifyHash));
        } else {
          Promise.reject(error);
        }
      });
  }

  createStore(verifyHash: string) {
    // Init the store and an empty file
    this.store.set('verify', verifyHash);
    const storeDump = yaml.safeDump(PassStore._convertStoreToJson(this.store));
    this.file
      .create({ _id: this.storeFilePath, content: storeDump })
      .then(() => {
        return Promise.resolve();
      });
  }

  syncStore(profileIds: Array<string>): Promise<Array<string>> {
    const storeIds: Array<string> = [...this.store.keys()];
    const missingIds: Array<string> = _.difference(profileIds, storeIds);
    const redundantIds: Array<string> = _.difference(storeIds, profileIds);
    // Remove ids that no longer exist on the UI
    _.reduce(this.store, (result, currentItem) => {
      if (_.find(redundantIds, currentItem)) {
        this.store.delete(currentItem);
      }
    });
    return Promise.resolve(missingIds);
  }

  removeStore() {
    this.store = new Map();
    return this.file.remove(this.storeFilePath);
  }

  static _convertStoreToJson(storeMap: Map<string, string>) {
    return [...storeMap.entries()];
  }

  static _convertJsonToStore(storeJson: {}) {
    // $FlowFixMe
    return new Map([...storeJson]);
  }
}
