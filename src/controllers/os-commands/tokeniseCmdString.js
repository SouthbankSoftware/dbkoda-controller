/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-01-17T16:02:35+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-01-17T16:16:28+11:00
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

import { unescapeDoubleQuotes } from './processDoubleQuotes';

const RE = /"((?:[^"]+?(?:\\")?)+)"|([^"\s]+)/g;

export default input => {
  let match;
  const result = [];

  while ((match = RE.exec(input)) !== null) {
    if (match[1]) {
      result.push(unescapeDoubleQuotes(match[1]));
    } else {
      result.push(match[2]);
    }
  }

  return result;
};
