/**
 * Created by joey on 14/8/17
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-01T00:28:36+10:00
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
import { EventEmitter } from 'events';
import escapeRegExp from 'escape-string-regexp';
import ParseState from './parser-state';
import {
  escapedStateHandler,
  csiStateHandler,
  csiStateParameterHandler,
  normalStateHandler
} from './input-handler';
import Buffer from './buffer';

/**
 * parsing pty output
 */
export default class Parser extends EventEmitter {
  constructor(MongoShell) {
    super();

    this.buffers = [];
    this.state = ParseState.NORMAL;
    this.currentParam = 0;
    this.params = [];
    this.prefix = '';
    this.postfix = '';
    this.bufferX = 0; // the x position on the buffer
    this.bufferY = 0; // the y position on the buffer

    Parser.PROMPT_REGEX = new RegExp(`${escapeRegExp(MongoShell.prompt)}$`);
    Parser.CUSTOM_EXEC_ENDING_REGEX = new RegExp(`${escapeRegExp(MongoShell.CUSTOM_EXEC_ENDING)}$`);
  }

  getCachedBuffer() {
    const cachedBuffer = _.find(this.buffers, buffer => buffer.cached === true);
    return Object.assign({}, cachedBuffer);
  }

  onRead(data) {
    this.parse(data);

    const buffersLen = this.buffers.length;
    const lastBufferIdx = buffersLen - 1;
    const secondLastBufferIdx = buffersLen - 2;

    for (let i = 0; i < buffersLen; i += 1) {
      const buffer = this.buffers[i];

      if (!buffer) continue;

      const bufferData = this.buffers[i].data;
      let shouldEmit = true;

      if (i === secondLastBufferIdx) {
        const match = bufferData.match(Parser.CUSTOM_EXEC_ENDING_REGEX);

        if (match) {
          shouldEmit = false;
          this.emit('command-ended', match[0]);
        }
      } else if (i === lastBufferIdx) {
        shouldEmit = false;

        const match = bufferData.match(Parser.PROMPT_REGEX);

        if (match) {
          this.emit('command-ended', match[0]);
        } else if (bufferData.trim() === '...') {
          this.emit('incomplete-command-ended', '... ');
        }

        this.buffers = [buffer];
      }

      if (shouldEmit) {
        l.debug('Parser emitting: ', bufferData);
        this.emit('data', bufferData);
      }
    }

    this.bufferY = 0;
  }

  // onRead(data) {
  //   this.parse(data);
  //   let cached = null;
  //   if (this.buffers.length > 0) {
  //     // if (this.bufferY === -1) {
  //     //   // remove the cache line
  //     //   this.bufferY = 0;
  //     //   this.buffers.splice(0, 1);
  //     // }
  //     if (this.buffers.length === 0) {
  //       return;
  //     }
  //     cached = this.buffers.pop();
  //     this.buffers.map(buffer => {
  //       l.debug('emit output data ', buffer.data);
  //       this.emit('data', buffer.data);
  //     });
  //     this.buffers = [];
  //     this.buffers.push(cached);
  //   }
  //   // check whether the last line in the buffer is prompt
  //   if (this.buffers.length > 0 && this.buffers[0].data) {
  //     if (this.buffers[0].data.match(/dbKoda Mongo Shell>$/)) {
  //       this.emit('command-ended');
  //     } else if (this.buffers[0].data.trim() === '...') {
  //       this.emit('incomplete-command-ended', '... ');
  //     }
  //   }
  //   this.bufferY = this.buffers.length - 1 >= 0 ? this.buffers.length - 1 : 0;
  // }

  /**
   * parse the data from pty output.
   * only God and Joey know how it works. please don't make any change
   * @param data
   */
  parse(data) {
    for (let i = 0, len = data.length; i < len; i += 1) {
      const code = data.charCodeAt(i);
      const ch = data.charAt(i);
      switch (this.state) {
        case ParseState.NORMAL:
          if (Object.prototype.hasOwnProperty.call(normalStateHandler, code)) {
            normalStateHandler[code](this);
          } else {
            this.pushChar(ch);
          }
          break;
        case ParseState.ESCAPED:
          if (Object.prototype.hasOwnProperty.call(escapedStateHandler, ch)) {
            escapedStateHandler[ch](this);
          }
          break;
        case ParseState.CSI_PARAM:
          if (Object.prototype.hasOwnProperty.call(csiStateParameterHandler, ch)) {
            csiStateParameterHandler[ch](this);
            break;
          }
          this.finalizeParam();
          this.state = ParseState.CSI;
        // eslint-disable-next-line no-fallthrough
        case ParseState.CSI:
          if (Object.prototype.hasOwnProperty.call(csiStateHandler, ch)) {
            csiStateHandler[data[i]](this, this.params, this.prefix, this.postfix);
          } else {
            log.error('cant find csi handler for ', ch);
          }
          this.state = ParseState.NORMAL;
          this.prefix = '';
          this.postfix = '';
          break;
        default:
          log.error('unknown state ', this.state);
          break;
      }
    }
  }

  finalizeParam() {
    this.params.push(this.currentParam);
    this.currentParam = 0;
  }

  /**
   * push data to current buffer
   *
   * @param data
   */
  pushChar(ch) {
    if (this.bufferY < 0) {
      return;
    }
    if (this.buffers.length <= this.bufferY) {
      this.buffers.push(new Buffer()); // eslint-disable-line no-buffer-constructor
      this.bufferX = 0;
    }
    // else if (this.bufferX >= PytOptions.cols) {
    //   this.bufferX = 0;
    //   this.bufferY += 1;
    //   this.buffers.push(new Buffer()); // eslint-disable-line no-buffer-constructor
    // }
    if (this.bufferY < this.buffers.length && !this.buffers[this.bufferY].data) {
      this.buffers[this.bufferY].data = ' ';
    }
    const diff = this.bufferX - this.buffers[this.bufferY].data.length + 1;
    if (diff > 0) {
      _.times(diff, (this.buffers[this.bufferY].data += ' '));
    }
    const tmp = this.buffers[this.bufferY].data;
    // this.buffers[this.bufferY].write(ch, this.bufferX);
    // this.buffers[this.bufferY].data = buffer.toString();

    // if (this.bufferX >= tmp.length - 1) {
    //   this.buffers[this.bufferY].data = tmp + ch;
    // } else {
    this.buffers[this.bufferY].data =
      tmp.substr(0, this.bufferX) + ch + tmp.substr(this.bufferX + 1);
    // }
    this.bufferX += 1;
  }

  clearBuffer() {
    this.buffers = [];
    this.bufferY = 0;
    this.bufferX = 0;
  }
}
