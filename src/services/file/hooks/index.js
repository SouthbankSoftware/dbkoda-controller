/**
 * @Author: guiguan
 * @Date:   2017-01-27T09:52:50+11:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-09-22T11:07:36+10:00
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

import normaliseItems from '~/hooks/normaliseItems';
import validateItems from './validateItems';
import openFile from './openFile';
import writeFile from './writeFile';
import watchFile from './watchFile';
import removeFile from './removeFile';

const before = {
  all: [normaliseItems(), validateItems()],
  find: [],
  get: [openFile(), watchFile()],
  create: [writeFile(), watchFile()],
  update: [writeFile(), watchFile()],
  patch: [writeFile(), watchFile()],
  remove: [removeFile()]
};

const after = {
  all: [],
  find: [],
  get: [],
  create: [],
  update: [],
  patch: [],
  remove: []
};

export default {
  before,
  after
};
