/**
 * Created by joey on 14/8/17.
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-05T18:06:46+10:00
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

export default {
  NORMAL: 0,
  ESCAPED: 1,
  CSI_PARAM: 2,
  CSI: 3,
  OSC: 4,
  CHARSET: 5,
  DCS: 6,
  IGNORE: 7
};
