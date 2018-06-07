/**
 * Created by joey on 14/8/17
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-08T02:17:30+10:00
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

    if (!Parser.PROMPT_REGEX) {
      Parser.PROMPT_REGEX = new RegExp(`${escapeRegExp(MongoShell.PROMPT)}$`);
    }

    if (!Parser.CUSTOM_EXEC_ENDING_REGEX) {
      Parser.CUSTOM_EXEC_ENDING_REGEX = new RegExp(
        `${escapeRegExp(MongoShell.CUSTOM_EXEC_ENDING)}$`
      );
    }
  }

  onRead = data => {
    this.parse(data);

    const buffersLen = this.buffers.length;
    const lastBufferIdx = buffersLen - 1;
    const secondLastBufferIdx = buffersLen - 2;

    for (let i = 0; i < buffersLen; i += 1) {
      const buffer = this.buffers[i];

      if (i === secondLastBufferIdx) {
        const match = buffer.match(Parser.CUSTOM_EXEC_ENDING_REGEX);

        if (match) {
          this.emit('executionEnded');

          this.buffers = [''];

          // skip rest
          break;
        }
      } else if (i === lastBufferIdx) {
        const match = buffer.match(Parser.PROMPT_REGEX);

        if (match) {
          this.emit('promptShown');
        } else if (buffer.trim() === '...') {
          this.emit('threeDotShown');
        }

        this.buffers = [buffer];

        // don't emit last line yet, which could be further modified by future commands
        break;
      }

      this.emit('parsedLine', buffer);
    }

    this.bufferY = 0;
  };

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
      this.buffers.push('');
      this.bufferX = 0;
    }

    // make Y direction consistent
    if (this.bufferY < this.buffers.length && !this.buffers[this.bufferY]) {
      this.buffers[this.bufferY] = ' ';
    }

    // make X direction consistent
    const diff = this.bufferX - this.buffers[this.bufferY].length + 1;
    if (diff > 0) {
      _.times(diff, (this.buffers[this.bufferY] += ' '));
    }
    const tmp = this.buffers[this.bufferY];

    this.buffers[this.bufferY] = tmp.substr(0, this.bufferX) + ch + tmp.substr(this.bufferX + 1);

    this.bufferX += 1;
  }

  clearBuffer() {
    this.buffers = [];
    this.bufferY = 0;
    this.bufferX = 0;
  }
}
