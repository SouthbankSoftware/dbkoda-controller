/**
 * Mongo connection object
 *
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-05T21:49:06+10:00
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

class MongoConnection {
  constructor(id, driver, status, conn, dbVersion, shellVersion, options) {
    this.id = id;
    this.driver = driver;
    this.shells = {};
    this.status = status;
    this.url = conn.url;
    this.ssl = conn.ssl;
    this.sshOpts = conn.sshOpts;
    this.username = conn.username;
    this.password = conn.password;
    this.dbVersion = dbVersion;
    this.shellVersion = shellVersion;
    this.hosts = conn.hosts;
    this.options = conn.options;
    this.database = conn.database;
    this.db = driver.db(this.database);
    this.connectionParameters = conn;
    this.requireSlaveOk = conn.requireSlaveOk;
    this.authenticationDatabase = conn.authenticationDatabase;
    this.usePasswordStore = conn.usePasswordStore;
    this.options = options;
  }

  getShell(shellId) {
    return this.shells[shellId];
  }

  addShell(shellId, shell) {
    shell.id = shellId;
    this.shells[shellId] = shell;
  }
}

module.exports = MongoConnection;
