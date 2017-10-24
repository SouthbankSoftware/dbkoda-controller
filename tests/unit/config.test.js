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
import '../../src/app';
import { loadConfig, loadConfigFromYamlFile, loadCommands, getMongoPath } from '../../src/config';

const os = require('os');
const assert = require('assert');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');

const extension = os.platform() === 'win32' ? '.exe' : '';

describe('configure path tests', () => {
  it('load path without configure file', () => {
    const config = loadConfig({
      mongoCmd: null,
      mongoVersionCmd: null,
      mongodumpCmd: null,
      mongorestoreCmd: null,
      mongoimportCmd: null,
      mongoexportCmd: null
    });
    assert.notEqual(config.mongoCmd, null);
    assert.notEqual(config.mongodumpCmd, null);
    assert.notEqual(config.mongoexportCmd, null);
    assert.notEqual(config.mongoimportCmd, null);
    assert.notEqual(config.mongorestoreCmd, null);
    assert.notEqual(config.mongoVersionCmd, null);
    console.log('loaded config', config);
    if (os.platform() === 'win32') {
      _.keys(config).map((key) => {
        if (key !== 'mongoVersionCmd' && key !== 'drillCmd') {
          assert.equal(config[key].match(new RegExp('.exe$')) !== null, true);
        }
      });
    }
  }).timeout(10000);

  it('load path with mongo configuration only', (done) => {
    const p = path.join(__dirname, '/config_mongo.yml');
    const config = loadConfigFromYamlFile(p);
    loadConfig(config);
    console.log('config = ', config);
    assert.notEqual(config.mongoCmd, null);
    assert.notEqual(config.mongodumpCmd, null);
    assert.notEqual(config.mongoexportCmd, null);
    assert.notEqual(config.mongoimportCmd, null);
    assert.notEqual(config.mongorestoreCmd, null);
    assert.notEqual(config.mongoVersionCmd, null);
    if (os.platform() === 'win32') {
      _.keys(config).map((key) => {
        if (key !== 'mongoVersionCmd' && key !== 'drillCmd' &&
          key !== 'showWelcomePageAtStart' && key !== 'telemetryEnabled') {
          assert.equal(config[key].match(new RegExp('.exe$')) !== null, true);
        }
      });
    } else {
      _.keys(config).map((key) => {
        const cmdName = key.replace('Cmd', '');
        if (key !== 'mongoVersionCmd' && key !== 'drillCmd' &&
          key !== 'showWelcomePageAtStart' && key !== 'telemetryEnabled') {
          assert.equal(config[key], '/opt/mongo/bin/' + cmdName);
        }
      });
    }
    done();
  });

  it('load path with exe extension', () => {
    const p = path.join(__dirname, '/config_mongo_exe.yml');
    const config = loadConfigFromYamlFile(p);
    assert.equal(config.mongoCmd, 'mongo.exe');
  });

  it('load none existed file', () => {
    const config = loadConfigFromYamlFile('xxxxx');
    assert.equal(config.mongoCmd, config.mongoCmd); // File should now be written as passed in
    fs.unlinkSync('xxxxx');
  });

  it('load commands from file', () => {
    const oldPath = process.env.CONFIG_PATH;
    let config = loadConfigFromYamlFile(path.join(__dirname, 'config_1.yml'));
    assert.equal(config.mongoCmd, '/Users/user1/tools/mongodb-osx-x86_64-3.4.9/bin/mongo' + extension);
    assert.equal(config.mongodumpCmd, '/Users/user1/tools/mongodb-osx-x86_64-3.4.9/bin/mongodump' + extension);
    assert.equal(config.mongorestoreCmd, '/Users/user1/tools/mongodb-osx-x86_64-3.4.9/bin/mongorestore' + extension);
    assert.equal(config.mongoimportCmd, '/Users/user1/tools/mongodb-osx-x86_64-3.4.9/bin/mongoimport' + extension);
    assert.equal(config.mongoexportCmd, '/Users/user1/tools/mongodb-osx-x86_64-3.4.9/bin/mongoexport' + extension);
    config = loadConfig(config);
    assert.equal(config.mongoVersionCmd, '/Users/user1/tools/mongodb-osx-x86_64-3.4.9/bin/mongo' + extension + ' --version');
    process.env.CONFIG_PATH = path.join(__dirname, 'config_1.yml');
    config = loadCommands();
    assert.equal(config.mongoVersionCmd, '"/Users/user1/tools/mongodb-osx-x86_64-3.4.9/bin/mongo' + extension + '" --version');
    process.env.CONFIG_PATH = oldPath;
  });

  it('test load incorrect mongo command', () => {
    const oldPath = process.env.CONFIG_PATH;
    process.env.CONFIG_PATH = path.join(__dirname, 'config_incorrect_mongocmd_name.yml');
    const config = loadCommands();
    assert.equal(config.mongoCmd, undefined);
    assert.equal(config.mongodumpCmd, undefined);
    assert.equal(config.mongorestoreCmd, undefined);
    assert.equal(config.mongoimportCmd, undefined);
    assert.equal(config.mongoexportCmd, '/var/opt/mongoexport' + extension);
    process.env.CONFIG_PATH = oldPath;
  });

  it('test load incorrect mongo command1', () => {
    if (os.platform() !== 'win32') {
      const oldPath = process.env.CONFIG_PATH;
      process.env.CONFIG_PATH = path.join(__dirname, 'config_incorrect_mongocmd_name1.yml');
      const config = loadCommands();
      assert.equal(config.mongoCmd, undefined);
      assert.equal(config.mongodumpCmd, '/var/opt/mongodump');
      assert.equal(config.mongorestoreCmd, '/var/opt/mongorestore');
      assert.equal(config.mongoimportCmd, '/var/opt/mongoimport');
      assert.equal(config.mongoexportCmd, '/var/opt/mongoexport');
      assert.equal(config.mongoVersionCmd, '"/var/opt/mongod" --version');
      process.env.CONFIG_PATH = oldPath;
    }
  });

  it('test load incorrect mongo command on windows', () => {
    if (os.platform() === 'win32') {
      const oldPath = process.env.CONFIG_PATH;
      process.env.CONFIG_PATH = path.join(__dirname, 'config_incorrect_mongocmd_name_win.yml');
      const config = loadCommands();
      assert.equal(config.mongoCmd, undefined);
      assert.equal(config.mongodumpCmd, 'c:/var/opt/mongodump.exe');
      assert.equal(config.mongorestoreCmd, 'c:/var/opt/mongorestore.exe');
      assert.equal(config.mongoimportCmd, 'c:/var/opt/mongoimport.exe');
      assert.equal(config.mongoexportCmd, 'c:/var/opt/mongoexport.exe');
      assert.equal(config.mongoVersionCmd, '"c:/var/opt/mongod.exe" --version');
      process.env.CONFIG_PATH = oldPath;
    }
  });

  it('test load command with space path on windows', () => {
    if (os.platform() === 'win32') {
      const oldPath = process.env.CONFIG_PATH;
      process.env.CONFIG_PATH = path.join(__dirname, 'config_space.yml');
      const config = loadCommands();
      assert.equal(config.mongoCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongo.exe');
      assert.equal(config.mongodumpCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongodump.exe');
      assert.equal(config.mongorestoreCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongorestore.exe');
      assert.equal(config.mongoimportCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongoimport.exe');
      assert.equal(config.mongoexportCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongoexport.exe');
      assert.equal(config.mongoVersionCmd, '"c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongo.exe" --version');
      process.env.CONFIG_PATH = oldPath;
    }
  });

  it('test load command with space path on windows1', () => {
    if (os.platform() === 'win32') {
      const oldPath = process.env.CONFIG_PATH;
      process.env.CONFIG_PATH = path.join(__dirname, 'config_space1.yml');
      const config = loadCommands();
      assert.equal(config.mongoCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongo.exe');
      assert.equal(config.mongodumpCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongodump.exe');
      assert.equal(config.mongorestoreCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongorestore.exe');
      assert.equal(config.mongoimportCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongoimport.exe');
      assert.equal(config.mongoexportCmd, 'c:/Program Files/mongo/mongodb-win32-x86_64-2008plus-ssl-3.2.16-23-g32c4fbb/bin/mongoexport.exe');
      process.env.CONFIG_PATH = oldPath;
    }
  });

  it('test load mongo path', () => {
    if (os.platform() === 'win32') {
      const path = getMongoPath('mongo.exe');
      assert.equal(path, '');
    } else {
      const path = getMongoPath('mongo');
      assert.equal(path, '');
    }
  });
});
