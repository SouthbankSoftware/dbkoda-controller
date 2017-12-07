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
 * Created by joey on 8/12/17.
 */

const SshClient = require('ssh2').Client;
const uuid = require('node-uuid');
const _ = require('lodash');
const errors = require('feathers-errors');

export default class SSHCounter {
  constructor() {
    this.connections = [];
  }

  create(params) {
    const that = this;
    return new Promise((resolve, reject) => {
      const client = new SshClient();
      client
        .on('ready', () => {
          const id = params.id ? params.id : uuid.v1();
          this.connections[id] = { client };
          log.info('Client :: ready');

          client.shell(
            false,
            {
              pty: true,
            },
            (err, stream) => {
              if (err) {
                return reject(err);
              }
              stream.setEncoding('utf8');
              stream.on('data', (data) => {
                console.log('Stream :: data :', data);
                that.processData(id, data);
              });
              stream.on('finish', () => {
                console.log('Stream :: finish');
              });
              stream.stderr.on('data', (data) => {
                console.log('Stream :: strerr :: Data :', data);
                that.processData(id, data);
              });
              stream.on('close', (code, signal) => {
                console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                if (code !== 0) {
                  return reject(code);
                }
              });
              this.connections[id].stream = stream;
              resolve({ status: 'SUCCESS', id });
            },
          );
        })
        .on('error', (err) => {
          reject(new errors.BadRequest('Client Error: ' + err.message));
        })
        .connect(_.omit(params, 'cwd'));
    });
  }
}
