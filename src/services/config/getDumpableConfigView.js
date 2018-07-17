/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-06-21T16:13:44+10:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-21T16:15:39+10:00
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
import { configDefaults } from './configSchema';

const _filterConfigObj = (configObj, defaultConfigObj) => {
  if (!configObj || !defaultConfigObj) return null;

  const result = _.isArray(defaultConfigObj) ? [] : {};

  _.forEach(defaultConfigObj, (v, k) => {
    if (typeof v === 'object' && v !== null) {
      result[k] = _filterConfigObj(configObj[k], v);
    } else {
      const cV = configObj[k];
      result[k] = cV === undefined ? null : cV;
    }
  });

  return result;
};

export default (config: *) => _filterConfigObj(config, configDefaults);
