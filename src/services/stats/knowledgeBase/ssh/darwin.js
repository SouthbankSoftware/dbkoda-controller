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

const getMegabyteValue = (value) => {
  if (value.indexOf('G') > 0) {
    return parseInt(value.replace('G', ''), 10) * 1024;
  }
  if (value.indexOf('M') > 0) {
    return parseInt(value.replace('M', ''), 10);
  }
};

const commandParsers = {
  'cpuMemory': (d) => {
    l.info('get data ', d);
    const split = d.output.split('\n');
    const output = {};
    split && split.forEach((str) => {
      if (!output.value) {
        output.value = {cpu: {}};
      }
      if (str.indexOf('CPU usage:') >= 0) {
        // parse cpu output
        let left = str.replace(/CPU usage:/, '');
        l.info('left:', left);
        left = left.split(',');
        if (left && left.length > 2) {
          const user = parseFloat(left[0].substr(0, left[0].indexOf('%')).trim());
          const system = parseFloat(left[0].substr(0, left[1].indexOf('%')).trim());
          const idle = parseFloat(left[0].substr(0, left[2].indexOf('%')).trim());
          output.value.cpu.usage = user + system;
          output.value.cpuDetail = {user, system, idle};
        }
      } else if (str.indexOf('PhysMem:') >= 0) {
        // parse memory output
        const left = str.replace(/PhysMem:/, '').split(',');
        let used = left[0].trim().split(' ')[0];
        let unUsed = left[1].trim().split(' ')[0];
        used = getMegabyteValue(used);
        unUsed = getMegabyteValue(unUsed);
        output.value.memory = used / (used + unUsed) * 100;
        output.value.memoryDetail = {used, unUsed};
      } else if (str.indexOf('Load Avg') >= 0) {
        try {
          const loadAvgs = str.split(' ');
          output.value.cpu.runQueue = parseFloat(loadAvgs[loadAvgs.length - 2], 10);
        } catch (err) {
          l.error(err);
        }
      }
    });
    return output;
  },
  'disk': (d) => {
    const o = {timestamp: (new Date()).getTime()};
    if (d && d.output) {
      const splited = d.output.split(/\s+/).filter(x => x);
      if (splited.length > 2) {
        try {
          const v = parseFloat(splited[2].trim(), 10);
          o.value = {disk: {download: v, samplingRate: d.samplingRate}};
        } catch (e) {
          log.warn(e);
        }
      }
    }
    log.debug('disk output value:', o);
    return o;
  },
  'network': ({output, samplingRate}) => {
    const splited = output.split(/\s+/);
    if (splited.length >= 7) {
      const income = splited[4];
      const outcome = splited[6];
      return {timestamp: (new Date()).getTime(), value: {network: {upload: outcome, download: income, samplingRate}}};
    }
  }
};

const common = {
  os: 'darwin',
  release: 'all',
  version: 'all',
  // cmd: 'ps -A -o %cpu,%mem | awk \'{ cpu += $1; mem += $2} END {print cpu , mem}\'',
  cmds: {
    cpuMemory: 'top -l 1 -n 0', // command need to query os stats
    disk: 'iostat -c 2|tail -n 1',
    network: 'netstat -I `route -n get default |grep interface|awk \'{print $2}\'` |tail -n 1'
  },
  parse: (k, d, samplingRate) => { // the key is defined in knowledge base per command
    return commandParsers[k]({...d, samplingRate});
  }
};

export default [common];
