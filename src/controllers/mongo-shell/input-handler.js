/**
 * Created by joey on 14/8/17
 * @Last modified by:   guiguan
 * @Last modified time: 2017-11-23T16:51:32+11:00
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

/* eslint no-return-assign: 0 */

const ParserState = require('./parser-state');
const escapeSequence = require('./escape-sequence');
const Buffer = require('./buffer');

const normalStateHandler = {

};

normalStateHandler[escapeSequence.CR] = (parser) => {
  parser.bufferX = 0;
};

normalStateHandler[escapeSequence.LF] = (parser) => {
  parser.bufferX = 0;
  parser.bufferY += 1;
  parser.buffers.push(Buffer.alloc());
};

normalStateHandler[escapeSequence.ESC] = (parser) => {
  parser.state = ParserState.ESCAPED;
};

/**
 * check escape character. set the related parser state for each character
 */
const escapedStateHandler = {
  '[': (parser) => {
    parser.params = [];
    parser.currentParam = 0;
    parser.state = ParserState.CSI_PARAM;
  },
};

const csiNumberParamHandler = (parser, param) => {
  const i = parseInt(param, 10);
  parser.currentParam = (parser.currentParam * 10) + i;
};

/**
 * handle csi state parameter
 */
const csiStateParameterHandler = {
  '0': parser => csiNumberParamHandler(parser, 0),
  '1': parser => csiNumberParamHandler(parser, 1),
  '2': parser => csiNumberParamHandler(parser, 2),
  '3': parser => csiNumberParamHandler(parser, 3),
  '4': parser => csiNumberParamHandler(parser, 4),
  '5': parser => csiNumberParamHandler(parser, 5),
  '6': parser => csiNumberParamHandler(parser, 6),
  '7': parser => csiNumberParamHandler(parser, 7),
  '8': parser => csiNumberParamHandler(parser, 8),
  '9': parser => csiNumberParamHandler(parser, 9),
  '?': parser => parser.prefix = '?',
  '>': parser => parser.prefix = '>',
  '!': parser => parser.prefix = '!',
  '$': parser => parser.postfix = '$',
  '"': parser => parser.postfix = '"',
  ' ': parser => parser.postfix = ' ',
  '\'': parser => parser.postfix = '\'',
  ';': parser => parser.finalizeParam(),
};

const cursorCharAbsolute = (parser, params) => {
  let param = params[0];
  if (param < 1) {
    param = 1;
  }
  parser.bufferX = param - 1;
  if (parser.buffers.length > parser.bufferY) {
    // if the x cursor is greater than the current line length, append space
    const currentLine = parser.buffers[parser.bufferY];
    while (currentLine && currentLine.data && currentLine.data.length < parser.bufferX) {
      currentLine.data += ' ';
    }
  }
};

/**
 * CSI Ps J  Erase in Display (ED).
 *     Ps = 0  -> Erase Below (default).
 *     Ps = 1  -> Erase Above.
 *     Ps = 2  -> Erase All.
 *     Ps = 3  -> Erase Saved Lines (xterm).
 * CSI ? Ps J
 *   Erase in Display (DECSED).
 *     Ps = 0  -> Selective Erase Below (default).
 *     Ps = 1  -> Selective Erase Above.
 *     Ps = 2  -> Selective Erase All.
 */
const eraseInDisplay = (parser, params) => {
  for (let i = parser.bufferY; i < parser.buffers.length; i += 1) {
    const currentLine = parser.buffers[i];
    switch (params[0]) {
      case 0:
        // erase right
        currentLine.data = currentLine.data.substring(0, parser.bufferX);
        break;
      case 1:
        // erase left
        currentLine.data = currentLine.data.substring(parser.bufferX + 1);
        break;
      default:
        log.error('unrecognize parameter for J ', params);
    }
  }
};

const eraseInLine = (parser, params) => {
  const currentLine = parser.buffers[parser.bufferY];
  if (!currentLine) {
    return;
  }
  switch (params[0]) {
    case 0:
      // erase right
      currentLine.data = currentLine.data.substring(0, parser.bufferX);
      break;
    case 1:
      // erase left
      currentLine.data = currentLine.data.substring(parser.bufferX + 1);
      break;
    default:
      log.error('unrecognize parameter for J ', params);
  }
};

const csiStateHandler = {
  'G': (parser, params) => {
    cursorCharAbsolute(parser, params);
  },
  'H': (parser, params) => {
    cursorCharAbsolute(parser, params); // cursorPosition
  },
  'J': (parser, params) => {
    eraseInDisplay(parser, params);
  },
  'K': (parser, params) => {
    eraseInLine(parser, params);
  },
  'h': () => { // set mode
  },
  'm': () => { // set color
  },
  'l': () => {}, // reset mode
  'A': (parser, params) => { // cursor up
    let num = 0;
    if (params && params.length > 0) {
      num = params[0];
    }
    parser.bufferY -= num;
    if (parser.bufferY < 0) {
      parser.bufferY = 0;
    }
    },
  'B': () => {}, // cursor down
  'C': () => {}, // cursorForward
  'D': () => {}, // cursorBackward
  'E': () => {}, // cursorNextLine
  'F': () => {}, // cursorPrecedingLine
  'I': () => {}, // cursorForwardTab
  'L': () => {}, // insert line
  'M': () => {}, // delete line
  'P': () => {}, // delete char
  'S': () => {}, // scroll up
  'T': () => {}, // scroll down
  'X': () => {}, // eraseChars
  'Z': () => {}, // cursorBackwardTab
};

module.exports = {escapedStateHandler, csiStateParameterHandler, csiStateHandler, normalStateHandler};
