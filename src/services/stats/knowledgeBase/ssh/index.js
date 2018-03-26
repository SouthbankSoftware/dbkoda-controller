/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-12T14:20:51+11:00
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


import linuxStats from './linux';
import darwinStats from './darwin';
import {findRules} from '../utils';

export const items = ['cpu', 'memory', 'disk', 'network', 'io'];

export const rules = {
  linux: linuxStats,
  darwin: darwinStats
};


/**
 * find the knowledge base rules
 *
 * @param osType  the operation system type, could be linux, mac, windows
 * @param release could be centos, ubuntu, coreos etc.
 * @param version   the os version
 * @returns {*}
 */
export const getKnowledgeBaseRules = ({osType, release, version}) => {
  const rule = findRules({osType, release, version}, rules);
  if (!rule) {
    return null;
  }
  return {...rule};
};
