/**
 * Created by joey on 14/8/17
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-08T15:29:09+10:00
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

import ParserState from './parser-state';
import escapeSequence from './escape-sequence';

const normalStateHandler = {
  [escapeSequence.CR]: parser => {
    parser.bufferX = 0;
  },
  [escapeSequence.LF]: parser => {
    parser.bufferX = 0;
    parser.bufferY += 1;
    parser.buffers.push('');
  },
  [escapeSequence.ESC]: parser => {
    parser.state = ParserState.ESCAPED;
  }
};

/**
 * check escape character. set the related parser state for each character
 */
const escapedStateHandler = {
  '[': parser => {
    parser.params = [];
    parser.currentParam = 0;
    parser.state = ParserState.CSI_PARAM;
  }
};

const csiNumberParamHandler = (parser, param) => {
  const i = parseInt(param, 10);
  parser.currentParam = parser.currentParam * 10 + i;
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
  '?': parser => (parser.prefix = '?'),
  '>': parser => (parser.prefix = '>'),
  '!': parser => (parser.prefix = '!'),
  $: parser => (parser.postfix = '$'),
  '"': parser => (parser.postfix = '"'),
  ' ': parser => (parser.postfix = ' '),
  "'": parser => (parser.postfix = "'"),
  ';': parser => parser.finalizeParam()
};

const cursorCharAbsolute = (parser, params) => {
  let [param] = params;
  if (param < 1) {
    param = 1;
  }
  parser.bufferX = param - 1;
  if (parser.buffers.length > parser.bufferY && parser.bufferY >= 0) {
    // if the x cursor is greater than the current line length, append space
    while (
      parser.buffers[parser.bufferY] &&
      parser.buffers[parser.bufferY].length < parser.bufferX
    ) {
      parser.buffers[parser.bufferY] += ' ';
    }
  }
};

/**
 * CSI Ps J  Erase in Display (ED).
 *     Ps = 0  -> Erase Below (default).
 *     Ps = 1  -> Erase Above.
 *     Ps = 2  -> Erase All.
 *     Ps = 3  -> Erase Saved Lines (xterm).
 */
const eraseInDisplay = (parser, params) => {
  for (let i = parser.bufferY; parser.bufferY >= 0 && i < parser.buffers.length; i += 1) {
    const currentLine = parser.buffers[i];
    switch (params[0]) {
      case 0:
        // erase right
        parser.buffers[i] = currentLine.substring(0, parser.bufferX);
        break;
      case 1:
        // erase left
        parser.buffers[i] = currentLine.substring(parser.bufferX + 1);
        break;
      case 2:
        // erase all
        parser.buffers[i] = '';
        parser.bufferX = 0;
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
      parser.buffers[parser.bufferY] = currentLine.substring(0, parser.bufferX);
      break;
    case 1:
      // erase left
      parser.buffers[parser.bufferY] = currentLine.substring(parser.bufferX + 1);
      break;
    default:
      log.error('unrecognize parameter for J ', params);
  }
};

const csiStateHandler = {
  G: (parser, params) => {
    cursorCharAbsolute(parser, params);
  },
  H: (parser, params) => {
    cursorCharAbsolute(parser, params); // cursorPosition
  },
  J: (parser, params) => {
    eraseInDisplay(parser, params);
  },
  K: (parser, params) => {
    eraseInLine(parser, params);
  },
  h: () => {
    // set mode
    l.debug('unhandled character h');
  },
  m: () => {
    // set color
    l.debug('unhandled character m');
  },
  l: () => {
    l.debug('unhandled character l');
  }, // reset mode
  A: (parser, params) => {
    // cursor up
    let num = 0;
    if (params && params.length > 0) {
      num = params[0];
    }
    parser.bufferY -= num;
    if (parser.bufferY < 0) {
      parser.bufferY = 0;
      parser.buffers = [];
    } else {
      parser.buffers = parser.buffers.splice(parser.bufferY, num);
    }
  },
  B: () => {
    l.debug('unhandled character B');
  }, // cursor down
  C: () => {
    l.debug('unhandled character C');
  }, // cursorForward
  D: () => {
    l.debug('unhandled character D');
  }, // cursorBackward
  E: () => {
    l.debug('unhandled character E');
  }, // cursorNextLine
  F: () => {
    l.debug('unhandled character F');
  }, // cursorPrecedingLine
  I: () => {
    l.debug('unhandled character I');
  }, // cursorForwardTab
  L: () => {
    l.debug('unhandled character L');
  }, // insert line
  M: () => {
    l.debug('unhandled character M');
  }, // delete line
  P: () => {
    l.debug('unhandled character P');
  }, // delete char
  S: () => {
    l.debug('unhandled character S');
  }, // scroll up
  T: () => {
    l.debug('unhandled character T');
  }, // scroll down
  X: () => {
    l.debug('unhandled character X');
  }, // eraseChars
  Z: () => {
    l.debug('unhandled character Z');
  } // cursorBackwardTab
};

export default {
  escapedStateHandler,
  csiStateParameterHandler,
  csiStateHandler,
  normalStateHandler
};
