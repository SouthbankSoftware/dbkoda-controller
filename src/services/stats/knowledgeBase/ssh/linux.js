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
 * Created by joey on 18/12/17.
 */

import os from 'os';
import _ from 'lodash';

const commandParsers = {
  'cpuMemory': ({output, samplingRate}) => {
    log.debug('cpu memory output:', output);
    // parse the vmstat command output
    const splited = output.split(os.platform() === 'win32' ? '\n\r' : '\n');
    if (!splited || splited.length < 4) {
      return;
    }
    const o: any = {timestamp: (new Date()).getTime()};
    const line = splited[3];
    const items = _.without(line.split(' '), '');
    if (items.length >= 17) {
      const intItems = items.map(item => parseInt(item, 10));
      const data: any = {
        details: {
          procs: {
            r: intItems[0], // The number of processes waiting for run time
            b: intItems[1], // The number of processes in uninterruptible sleep,
          },
          memory: {
            swpd: intItems[2], // the amount of virtual memory used.
            free: intItems[3], // the amount of idle memory
            buff: intItems[4], // the amount of memory used as buffers
            cache: intItems[5], // the amount of memory used as cache
          },
          swap: {
            si: intItems[6], // Amount of memory swapped in from disk
            so: intItems[7], // Amount of memory swapped to disk (/s).
          },
          io: {
            bi: intItems[8], // Blocks received from a block device (blocks/s).
            bo: intItems[9], // Blocks sent to a block device (blocks/s).
          },
          system: {
            in: intItems[10] * 1024, // The number of interrupts per second, including the clock.
            cs: intItems[11] * 1024, // The number of context switches per second
          },
          cpu: {
            us: intItems[12], //  Time spent running non-kernel code. (user time, including nice time)
            sy: intItems[13], //  Time spent running kernel code. (system time)
            id: intItems[14], //  Time spent idle. Prior to Linux 2.5.41, this includes IO-wait time
            wa: intItems[15], //  Time spent waiting for IO. Prior to Linux 2.5.41, included in idle.
            st: intItems[16], //  Time stolen from a virtual machine. Prior to Linux 2.6.11, unknown
          }
        }
      };
      let cpuUsage = data.details.cpu.us + data.details.cpu.sy + data.details.cpu.wa + data.details.cpu.st;
      if (cpuUsage > 100) {
        cpuUsage = 100;
      }
      data.cpu = {usage: cpuUsage, runQueue: data.details.procs.r};
      const totalMemory = data.details.memory.swpd + data.details.memory.buff + data.details.memory.cache + data.details.memory.free;
      let usedMemory = data.details.memory.swpd + data.details.memory.buff + data.details.memory.cache;
      if (usedMemory > totalMemory) {
        usedMemory = totalMemory;
      }
      data.memory = parseFloat((usedMemory / totalMemory) * 100, 10);
      data.disk = {'download': data.details.io.bi, 'upload': data.details.io.bo, samplingRate};
      o.value = data;
    }
    return o;
  },
  'network': ({output, samplingRate}) => {
    log.debug('network output ', output);
    const splited = output.split('\n');
    let download = 0;
    let upload = 0;
    splited.forEach((str) => {
      let value = null;
      try {
        if (str.indexOf('RX') >= 0 && str.indexOf('TX') >= 0 && str.indexOf('bytes:') >= 0) {
          if (str.indexOf('bytes:') >= 0) {
            const matched = str.match(/bytes:(\d+)/g);
            if (matched && matched.length > 1) {
              download = parseInt(matched[0].replace(/bytes:/, ''), 10);
              upload = parseInt(matched[1].replace(/bytes:/, ''), 10);
            }
          }
        } else if (str.indexOf('RX') >= 0 || str.indexOf('TX') >= 0) {
          const matched = str.match(/bytes[\s]*(\d+)/);
          if (matched && matched.length > 1) {
            value = matched[1];
            if (str.indexOf('RX') >= 0) {
              download = parseInt(value, 10);
            } else {
              upload = parseInt(value, 10);
            }
          }
        }
      } catch (e) {
        log.warn(e);
      }
    });
    log.debug(`network ${download} ${upload}.`);
    return {timestamp: (new Date()).getTime(), value: {network: {upload, download, samplingRate}}};
  }
};

const common = {
  release: 'all', // ubuntu, centos, red hat, etc.
  version: 'all', // 15.0, 16.0, etc.
  cmds: {
    'cpuMemory': 'vmstat 1 2', // command need to query os stats
    // 'disk': 'df /',
    'network': 'ifconfig `route | grep \'^default\' | grep -o \'[^ ]*$\'`'
  },
  parse: (key, output, samplingRate) => { // define the parse command output logic, the key is defined in knowledge base
    log.debug('post process ', key, output);
    return commandParsers[key]({...output, samplingRate});
  }
};

export default [common];
