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

const common = {
  release: 'all', // ubuntu, centos, red hat, etc.
  version: 'all', // 15.0, 16.0, etc.
  cmd: 'vmstat $samplingRate', // command need to query os stats
  parse: (d) => { // define the parse command output logic
    log.debug('post process ', d);
    // parse the vmstat command output
    const splited = d.split(os.platform() === 'win32' ? '\n\r' : '\n');
    const output: any = {timestamp: (new Date()).getTime()};
    splited.forEach((line) => {
      if (line.match(/procs/) && line.match(/memory/)) {
        // this is header, ignore
      } else if (line.match(/swpd/ && line.match(/buff/))) {
        // this is header
      } else {
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
                in: intItems[10], // The number of interrupts per second, including the clock.
                cs: intItems[11], // The number of context switches per second
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
          data.cpu = data.details.cpu.us + data.details.cpu.sy + data.details.cpu.wa + data.details.cpu.st;
          const totalMemory = data.details.memory.swpd + data.details.memory.buff + data.details.memory.cache + data.details.memory.free;
          let usedMemory = data.details.memory.swpd + data.details.memory.buff + data.details.memory.cache;
          if (usedMemory > totalMemory) {
            usedMemory = totalMemory;
          }
          data.memory = parseFloat((usedMemory / totalMemory) * 100, 10);
          data.io = data.details.io;
          output.value = data;
        }
      }
    });
    return output;
  }
};

export default [common];
