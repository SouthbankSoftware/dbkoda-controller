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
 * Created by joey on 20/12/17.
 */


const common = {
  os: 'darwin',
  release: 'all',
  version: 'all',
  cmd: 'ps -A -o %cpu,%mem | awk \'{ cpu += $1; mem += $2} END {print cpu , mem}\'', // command need to query os stats
  parse: (d) => {
    console.log('get data, ', d);
    const output = {timestamp: (new Date()).getTime()};
    if (d && d.indexOf(' ') > 0) {
      const split = d.split(' ');
      output.value = {cpu: split[0].replace(/\n/g, ''), memory: split[1].replace(/\n/g, '')};
    }
    return output;
  }
};

export default [common];
