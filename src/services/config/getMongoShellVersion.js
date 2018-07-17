/**
 * @flow
 *
 * Asynchronously get Mongo shell version
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-06-19T13:51:17+10:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-07-17T13:39:58+10:00
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

/*
Supported Mongo Shell versions >= 3.0


`docker run --rm mongo:3.0 mongo --version`:
MongoDB shell version: 3.0.15
---
`docker run --rm mongo:3.2 mongo --version`:
MongoDB shell version: 3.2.20
---
`docker run --rm mongo:3.4 mongo --version`:
MongoDB shell version v3.4.15
git version: 52e5b5fbaa3a2a5b1a217f5e647b5061817475f9
OpenSSL version: OpenSSL 1.0.1t  3 May 2016
allocator: tcmalloc
modules: none
build environment:
    distmod: debian81
    distarch: x86_64
    target_arch: x86_64
---
`docker run --rm mongo:3.6 mongo --version`:
MongoDB shell version v3.6.5
git version: a20ecd3e3a174162052ff99913bc2ca9a839d618
OpenSSL version: OpenSSL 1.0.1t  3 May 2016
allocator: tcmalloc
modules: none
build environment:
    distmod: debian81
    distarch: x86_64
    target_arch: x86_64
---
`docker run --rm mongo:3.7 mongo --version`:
MongoDB shell version v3.7.9
git version: 681d1e0bf8d45c366848678811bad6f1a471f20c
OpenSSL version: OpenSSL 1.0.2g  1 Mar 2016
allocator: tcmalloc
modules: none
build environment:
    distmod: ubuntu1604
    distarch: x86_64
    target_arch: x86_64
---
`docker run --rm mongo:4.0-rc mongo --version`:
MongoDB shell version v4.0.0-rc5
git version: ec8cfc7cc16cd4498778ee8b0393385a3de3e739
OpenSSL version: OpenSSL 1.0.2g  1 Mar 2016
allocator: tcmalloc
modules: none
build environment:
    distmod: ubuntu1604
    distarch: x86_64
    target_arch: x86_64
*/

import { exec } from 'child_process';

const VERSION_REGEX = /(?:MongoDB shell|db) version:? v?(\d+\.\d+\.\d+(?:-\S+)?)/;

export const UNKNOWN = 'UNKNOWN';

export default (mongoVersionCmd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    exec(mongoVersionCmd, (err, stdout) => {
      if (err) {
        return reject(err);
      }

      const m = stdout.toString().match(VERSION_REGEX);

      if (m) {
        return resolve(m[1]);
      }

      resolve(UNKNOWN);
    });
  });
