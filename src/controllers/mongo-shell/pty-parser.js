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
 * Created by joey on 14/8/17.
 */
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const ParseState = require('./parser-state');
const {escapedStateHandler, csiStateHandler, csiStateParameterHandler, normalStateHandler} = require('./input-handler');
const Buffer = require('./buffer');

/* eslint no-fallthrough : 0 */

/**
 * parsing pty output
 */
class Parser extends EventEmitter {

  constructor() {
    super();
    this.buffers = [];
    this.state = ParseState.NORMAL;
    this.currentParam = 0;
    this.params = [];
    this.prefix = '';
    this.postfix = '';
    this.bufferX = 0;   // the x position on the buffer
    this.bufferY = 0;   // the y position on the buffer
  }

  getCachedBuffer() {
    const cachedBuffer = _.find(this.buffers, buffer => buffer.cached === true);
    return Object.assign({}, cachedBuffer);
  }

  /**
   * listen on pty output
   *
   * @param data
   */
  onRead(data) {
    this.parse(data);

    let newLineIdx = -1;
    for (let i = 0; i < this.buffers.length; i += 1) {
      // find the last \r on buffer array
      const buffer = this.buffers[i];
      if (buffer.data && buffer.data.indexOf('\r') >= 0) {
        newLineIdx = i;
      }
    }
    // all buffers before the last \r should be sent to client
    for (let i = 0; i <= newLineIdx; i += 1) {
      const buffer = this.buffers.shift();
      this.emit('data', buffer.data);
    }
    this.bufferY = this.buffers.length - 1 >= 0 ? this.buffers.length - 1 : 0;
    // check whether the last line in the buffer is prompt
    if (this.buffers.length > 0) {
      if (this.buffers[0].data === 'dbKoda>') {
        this.emit('command-ended');
      } else if (this.buffers[this.buffers.length - 1].data === '... ') {
        this.emit('incomplete-command-ended', '... ');
      }
    }
  }

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
    if (this.buffers.length <= this.bufferY) {
      this.buffers.push(new Buffer());
    }
    this.buffers[this.bufferY].data += ch;
  }

  clearBuffer() {
    this.buffers = [];
    this.bufferY = 0;
    this.bufferX = 0;
  }

}


module.exports = Parser;
