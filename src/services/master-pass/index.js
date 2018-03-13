/**
 * @flow
 *
 * @Author: christrott
 * @Date:   2018-01-02T16:24:08+11:00
 * @Last modified by:   christrott
 * @Last modified time: 2018-01-30T16:24:08+11:00
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

/* eslint-disable class-methods-use-this */
// $FlowFixMe
import errors from 'feathers-errors';
import hooks from './hooks';
import PassStore from './PassStore';
import CryptoPassword from './CryptoPass';

export class MasterPass {
  MASTER_PASSWORD_REQUIRED = 'master-pass::password-required';
  PASSWORD_STORE_RESET = 'master-pass::store-reset';
  MAX_ATTEMPTS = 5;
  events: Array<string>;
  store: PassStore;
  cryptoPass: CryptoPassword;
  failedAttempts: number = 0;

  constructor(_options: ?{}) {
    this.events = ['error', this.MASTER_PASSWORD_REQUIRED, this.PASSWORD_STORE_RESET];
  }

  // $FlowFixMe
  setup(app) {
    const fileService: {} = app.service('/files');
    this.store = new PassStore(fileService);
  }

  emitError(id: string, error: string, level: 'warn' | 'error' = 'error') {
    // $FlowFixMe
    this.emit('error', { _id: id, payload: { error, level } });
  }

  get(_id: string, _params: {}) {
    if (!this.cryptoPass || !this.cryptoPass.masterPassword) {
      // $FlowFixMe
      this.emit(this.MASTER_PASSWORD_REQUIRED, { 'method': 'get' });
      throw new errors.NotAuthenticated('Password Store not authenticated');
    }
    return this.store.getPassword(_id)
      .then((passwordEnc: string) => {
        if (!passwordEnc) {
          Promise.reject();
          throw new errors.NotFound(`Password store item ${_id} doesn't exist`);
        }
        const password: string = this.cryptoPass.decrypt(passwordEnc);
        return Promise.resolve(password);
      });
  }

  create(_data: { masterPassword: string, profileIds: Array<string> }, _params: {}): ?Promise<Array<string>> {
    const { masterPassword, profileIds } = _data;
    this.cryptoPass = new CryptoPassword(masterPassword);
    return this.cryptoPass.getVerifyHash()
      .then((verifyHash) => {
        return this.store.initStore(verifyHash)
          .then(() => {
            return this.store.getPassword('verify').then((storeVerifyHash) => {
              return this.cryptoPass.compareVerifyHash(masterPassword, storeVerifyHash)
              .then((compareOk) => {
                if (!compareOk) {
                  this.failedAttempts += 1;
                  this.cryptoPass.reset();
                  console.log(`Login failed ${this.failedAttempts}`);
                  if (this.failedAttempts >= this.MAX_ATTEMPTS) {
                    this.remove();
                    this.emit(this.PASSWORD_STORE_RESET, {});
                    this.failedAttempts = 0;
                  }
                  throw new errors.NotAuthenticated('Unable to init store with the specified master password.');
                }
                this.failedAttempts = 0;
                return Promise.resolve(this.store.syncStore(profileIds));
              });
            });
          });
      })
      .catch((error) => {
        console.log(error);
        return Promise.reject(error);
      });
  }

  patch(_id: string, _data: { password: string }, _params: {}): Promise<boolean> {
    if (!this.cryptoPass || !this.cryptoPass.masterPassword) {
      // $FlowFixMe
      this.emit(this.MASTER_PASSWORD_REQUIRED, { 'method': 'get' });
      throw new errors.NotAuthenticated('Password Store not authenticated');
    }
    const profileId = _id;
    const { password } = _data;
    const encryptedPwd: string = this.cryptoPass.encrypt(password);
    return this.store.setPassword(profileId, encryptedPwd);
  }

  remove(_id: string, _params: {}) {
    this.cryptoPass.reset();
    return this.store.removeStore();
  }

  update(_id: string, _data: {}, _params: {}) {
    throw new errors.NotImplemented('Update not implemented');
  }
}

/** @ignore */
export default function() {
  const app = this;

  // Initialize our service with any options it requires
  app.use('/master-pass', new MasterPass());

  // Get our initialize service to that we can bind hooks
  const service = app.service('/master-pass');

  // Set up our before hooks
  service.before(hooks.before);

  // Set up our after hooks
  service.after(hooks.after);
}
