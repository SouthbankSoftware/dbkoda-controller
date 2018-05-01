/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-05-01T19:33:17+10:00
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

const assert = require('assert');
const CryptoPass = require('../../../../src/services/master-pass/CryptoPass');

describe('CryptoPass class', () => {
  it('will encrypt and decrypt a string', () => {
    const cryptoPass = new CryptoPass('SomeTestPassword');
    const initialString = 'TestString';
    // FIXME: vulnerability https://github.com/nodejs/node/issues/16746
    const encryptString = cryptoPass.encrypt(initialString);
    assert.notEqual(encryptString, initialString);
    const decryptString = cryptoPass.decrypt(encryptString);
    assert.equal(decryptString, initialString);
  });

  it('will generate a verify hash that matches the master hash', async () => {
    const testPassword = 'T35TP@55W0RD';
    const cryptoPass = new CryptoPass(testPassword);
    const hash = await cryptoPass.getVerifyHash();
    const hashVerified = cryptoPass.compareVerifyHash(hash);
    assert.ok(hashVerified);
  });
});
