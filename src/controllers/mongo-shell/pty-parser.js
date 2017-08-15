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
const {StringDecoder} = require('string_decoder');
const EventEmitter = require('events').EventEmitter;
const PtyOptions = require('./pty-options');
const ParseState = require('./parser-state');
const {escapedStateHandler, csiStateHandler, csiStateParameterHandler, normalStateHandler} = require('./input-handler');

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

  onRead(data) {
    // log.info('get pty output ', data);
    this.parse(data);
    // console.log('buffer:', this.buffers);
    this.buffers.map((buffer) => {
      this.emit('data', buffer);
    });
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

  pushChar(ch) {
    if (this.buffers.length <= this.bufferY) {
      this.buffers.push('');
    }
    this.buffers[this.bufferY] += ch;
  }

}


module.exports = Parser;
