/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-06-19T16:10:22+10:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-07-17T17:34:26+10:00
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

import { exec } from 'child_process';

/**
 * Check whether the target image exists or the target container exists and is running
 */
export default (dockerCmd: string, type: 'image' | 'container', target: string): Promise<boolean> =>
  new Promise((resolve, reject) => {
    exec(
      `"${dockerCmd}" inspect --type=${type}${
        type === 'container' ? " -f '{{.State.Running}}'" : ''
      } ${target}`,
      (err, stdout) => {
        if (err) {
          if (err.message.includes(`No such ${type}`)) {
            return resolve(false);
          }

          return reject(err);
        }

        if (type === 'container') {
          const result = stdout.trim();
          return resolve(result === 'true' || result === "'true'");
        }

        resolve(true);
      }
    );
  });
