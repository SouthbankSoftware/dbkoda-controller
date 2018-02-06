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

import crypto from 'crypto';
// $FlowFixMe
import bcrypt from 'bcrypt';

export default class CryptoPass {
  _algorithm: string = 'aes-256-ctr';
  _masterPassword: string;
  _verifyHash: string;

  constructor(masterPass: string) {
    this._masterPassword = masterPass;
  }

  get algorithm(): string {
    return this._algorithm;
  }

  get masterPassword(): string {
    return this._masterPassword;
  }

  getVerifyHash(): Promise<string> {
    return bcrypt.hash(this._masterPassword, 10)
        .then((verifyHash) => {
          this._verifyHash = verifyHash;
          return Promise.resolve(verifyHash);
        });
  }

  compareVerifyHash(masterHash: string, verifyHash: ?string): Promise<boolean> {
    if (verifyHash) {
      return bcrypt.compare(masterHash, verifyHash);
    }
    return bcrypt.compare(masterHash, this._verifyHash);
  }

  encrypt(text: string): string {
    const cipher = crypto.createCipher(this.algorithm, this.masterPassword);
    let encrypted: string = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(text: string): string {
    const decipher = crypto.createDecipher(this.algorithm, this.masterPassword);
    let decrypted: string = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  reset() {
    this._masterPassword = '';
    this._verifyHash = '';
  }
}
