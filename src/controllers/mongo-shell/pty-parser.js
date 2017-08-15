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

  onRead(data) {
    const cachedBuffer = this.getCachedBuffer();  // get the previous cached data
    this.parse(data);
    if (this.buffers && this.buffers.length > 0 && cachedBuffer) {
      if (cachedBuffer.data && this.buffers[0].data && this.buffers[0].data.replace(/\n/, '') !== cachedBuffer.data.replace(/\n/, '') && this.buffers[0].data.indexOf(cachedBuffer.data) === 0) {
        this.buffers[0].cached = false;
        this.buffers[0].data = this.buffers[0].data.replace(cachedBuffer.data, '');
      }
    }
    const tmpBuffer = this.buffers.map((buffer, i) => {
      if (this.bufferY >= i && buffer && buffer.data && !buffer.cached) {
        const data = buffer.data;
        this.emit('data', data);
      }
      if (i === this.buffers.length - 1) {
        // cache the last line
        return buffer;
      }
    });
    const newBuffers = [];
    if (tmpBuffer && tmpBuffer.length > 0 && tmpBuffer[0] && tmpBuffer[0].data && !tmpBuffer[0].cached) {
      newBuffers.push(new Buffer(tmpBuffer[0].data, true));
    }
    this.bufferY = newBuffers.length - 1 < 0 ? 0 : newBuffers.length - 1;
    this.buffers = newBuffers;
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

}


module.exports = Parser;
