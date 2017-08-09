/*
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
/**
 * Created by joey on 9/8/17.
 */

import {loadConfig} from '../../src/config';

const os = require('os');
const assert = require('assert');
const _ = require('lodash');
const path = require('path');


describe('configure path tests', () => {
  it('load path without configure file', () => {
    const config = loadConfig();
    assert.notEqual(config.mongoCmd, null);
    assert.notEqual(config.mongodumpCmd, null);
    assert.notEqual(config.mongoexportCmd, null);
    assert.notEqual(config.mongoimportCmd, null);
    assert.notEqual(config.mongorestoreCmd, null);
    assert.notEqual(config.mongoVersionCmd, null);
    if (os.platform() === 'win32') {
      _.keys(config).map((key) => {
        if (key !== 'mongoVersionCmd') {
          assert.equal(key.match(new RegExp('.exe$')), true);
        }
      });
    }
  }).timeout(10000);

  it('load path with mongo configuration only', (done) => {
    const p = path.join(__dirname, '/config_mongo.yml');
    const config = loadConfig(p);
    console.log('config = ', config);
    assert.notEqual(config.mongoCmd, null);
    assert.notEqual(config.mongodumpCmd, null);
    assert.notEqual(config.mongoexportCmd, null);
    assert.notEqual(config.mongoimportCmd, null);
    assert.notEqual(config.mongorestoreCmd, null);
    assert.notEqual(config.mongoVersionCmd, null);
    if (os.platform() === 'win32') {
      _.keys(config).map((key) => {
        if (key !== 'mongoVersionCmd') {
          assert.equal(key.match(new RegExp('.exe$')), true);
        }
      });
    } else {
      _.keys(config).map((key) => {
        const cmdName = key.replace('Cmd', '');
        if (key !== 'mongoVersionCmd') {
          assert.equal(config[key], '/opt/mongo/bin/' + cmdName);
        }
      });
    }
    done();
  });
});
