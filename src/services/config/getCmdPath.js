/**
 * @flow
 *
 * Asynchronously get a cmd's absolute path
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-06-19T13:51:17+10:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-28T10:37:42+10:00
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
import { exec } from 'child_process';
import os from 'os';
// $FlowFixMe
import find from 'find';

const WIN_MONGO_BINARY_FILENAME = 'mongo.exe';
const WIN_MONGO_BINARY_SEARCH_PATH = 'C:\\Program Files\\MongoDB';

export default (cmd: string): Promise<?string> => {
  const isWin = os.platform() === 'win32';

  if (isWin && !cmd.endsWith('.exe')) {
    cmd += '.exe';
  }

  let p = new Promise(resolve => {
    let pathCmd;

    if (isWin) {
      pathCmd = `where.exe ${cmd}`;
    } else {
      pathCmd = `bash -lc 'which ${cmd}'`;
    }

    exec(pathCmd, (err, stdout) => {
      if (err) {
        return resolve(null);
      }

      let result = stdout.toString().trim();
      result = _.last(result.split(/\r\n|\n/));
      resolve(result || null);
    });
  });

  if (isWin && cmd === WIN_MONGO_BINARY_FILENAME) {
    p = p.then(cmdPath => {
      if (!cmdPath) {
        return new Promise(resolve => {
          find
            .file(WIN_MONGO_BINARY_FILENAME, WIN_MONGO_BINARY_SEARCH_PATH, files =>
              resolve(_.last(files) || null)
            )
            .error(err => {
              l.error(err);

              resolve(null);
            });
        });
      }

      return cmdPath;
    });
  }

  return p;
};
