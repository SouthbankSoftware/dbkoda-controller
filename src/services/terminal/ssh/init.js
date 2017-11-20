/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-11-16T10:55:12+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-17T10:44:58+11:00
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

import { Client } from 'ssh2';
import fs from 'fs';

export default (context, item) => {
  const {
    _id,
    username,
    password,
    host,
    port,
    privateKey: privateKeyPath,
    passphrase,
    size,
  } = item;
  const { service } = context;

  const client = new Client();
  let privateKey;

  if (privateKeyPath) {
    privateKey = fs.readFileSync(privateKeyPath);
  }

  client
    .on('ready', () => {
      l.debug(`Created SSH Terminal ${_id}`);

      client.shell({ ...size, term: 'xterm' }, (err, stream) => {
        if (err) {
          l.error(`SSH Terminal ${_id} error`, err);
          return;
        }

        const terminal = service.terminals.get(_id);
        const onData = (payload) => {
          if (terminal.debug) {
            l.debug(`SSH Terminal ${_id}: ${JSON.stringify(payload)}`);
          }
          service.emit('data', { _id, payload });
        };

        if (!terminal) {
          l.error(`SSH Terminal ${_id} doesn't exist`);
          return;
        }

        stream.setEncoding('utf8');
        stream
          .on('close', () => {
            l.warn(`SSH Terminal ${_id} stream closed`);

            client.end();
          })
          .on('data', onData)
          .stderr.on('data', onData)
          .on('error', (error) => {
            l.error(`SSH Terminal ${_id} stream error`, error);
          });

        terminal.stream = stream;
      });
    })
    .on('error', (error) => {
      l.error(`SSH Terminal ${_id} error`, error);
    })
    .connect({
      username,
      password,
      host,
      port,
      privateKey,
      passphrase,
    });

  return { client };
};
