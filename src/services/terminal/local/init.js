/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-11-16T10:55:12+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-12T15:13:11+11:00
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

import _ from 'lodash';
// FIXME has to use require here
const pty = require('node-pty');

export default (context, item) => {
  const { _id, size } = item;
  const { service } = context;

  // avoid env vars pollution. This list should be consistent with the one in `dbkoda/src/app.js`
  const env = _.omit(process.env, [
    'PREFIX',
    'NODE_ENV',
    'UAT',
    'CONTROLLER_PORT',
    'DBKODA_HOME',
    'LOG_PATH',
    'MONGO_SCRIPTS_PATH',
    'CONFIG_PATH',
    'PROFILES_PATH'
  ]);

  _.assign(env, {
    LANG: 'en_AU.UTF-8'
  });

  const ptyProcess = pty.spawn(
    process.platform === 'win32' ? 'powershell.exe' : 'bash',
    process.platform === 'win32' ? [] : ['-l'],
    {
      name: 'xterm',
      cols: (size && size.cols) || 80,
      rows: (size && size.rows) || 24,
      cwd: process.env.HOME,
      env
    }
  );

  l.debug(`Created Local Terminal ${_id}`);

  const onData = payload => {
    const terminal = service.terminals.get(_id);
    if (terminal && terminal.debug) {
      l.debug(`Local Terminal ${_id}: ${JSON.stringify(payload)}`);
    }
    service.emit('data', { _id, payload });
  };

  setTimeout(() => {
    ptyProcess.on('data', onData);
    ptyProcess.on('error', error => {
      l.error(`Local Terminal ${_id} error`, error);
      service.emitError(_id, error.message);
    });
    ptyProcess.on('exit', () => {
      l.warn(`Local Terminal ${_id} exited`);
      service.emitError(_id, 'Local pty process exited', 'warn');
    });
  });

  return { ptyProcess };
};
