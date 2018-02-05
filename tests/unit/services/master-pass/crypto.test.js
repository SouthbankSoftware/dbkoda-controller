const assert = require('assert');
const CryptoPass = require('../../../../src/services/master-pass/CryptoPass');

describe('CryptoPass class', () => {
  it('will encrypt and decrypt a string', () => {
    const cryptoPass = new CryptoPass('aes-256-ctr', 'SomeTestPassword');
    const initialString = 'TestString';
    const encryptString = cryptoPass.encrypt(initialString);
    assert.notEqual(encryptString, initialString);
    const decryptString = cryptoPass.decrypt(encryptString);
    assert.equal(decryptString, initialString);
  });

  it('will generate a verify hash that matches the master hash', async () => {
    const testPassword = 'T35TP@55W0RD';
    const cryptoPass = new CryptoPass('aes-256-ctr', testPassword);
    const hash = cryptoPass.verifyHash;
    const hashVerified = cryptoPass.compareVerifyHash(hash);
    assert.ok(hashVerified);
  });
});
