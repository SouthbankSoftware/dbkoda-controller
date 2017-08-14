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
/* eslint no-return-assign: 0*/

const ParserState = require('./parser-state');

/**
 * check escape character. set the related parser state for each character
 */
const escapedStateHandler = {
  '[': (parser) => {
    parser.state = ParserState.CSI_PARAM;
  },
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
  '2': parser => csiNumberParamHandler(parser, 1),
  '3': parser => csiNumberParamHandler(parser, 1),
  '4': parser => csiNumberParamHandler(parser, 1),
  '5': parser => csiNumberParamHandler(parser, 1),
  '6': parser => csiNumberParamHandler(parser, 1),
  '7': parser => csiNumberParamHandler(parser, 1),
  '8': parser => csiNumberParamHandler(parser, 1),
  '9': parser => csiNumberParamHandler(parser, 1),
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
};

const csiStateHandler = {
  'G': (parser, params) => {
    cursorCharAbsolute(parser, params);
  },
  'J': (parser, params) => {
    parser.eraseInDisplay(params);
  }
};

module.exports = {escapedStateHandler, csiStateParameterHandler, csiStateHandler};
