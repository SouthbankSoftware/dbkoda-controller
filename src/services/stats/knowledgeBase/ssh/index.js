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


import _ from 'lodash';
import linuxStats from './linux';

export const items = ['cpu', 'memory'];

export const rules = {
  linux: linuxStats,
  mac: {}
};


export const findRules = ({osType, release, version}, rules) => {
  let matchedOs = [];
  _.forOwn(rules, (value, key) => {
    if (key === osType) {
      matchedOs = value;
    }
  });
  if (!matchedOs || matchedOs.length === 0) {
    return null;
  }
  if (!release) {
    // no release specified return the first as default one
    return matchedOs[0];
  }
  const matchedRelease = [];
  matchedOs.forEach((mos) => {
    if (mos.release.toLowerCase().indexOf(release.toLowerCase()) >= 0) {
      matchedRelease.push(mos);
    }
    if (mos.release === 'all') {
      matchedRelease.unshift(mos);
    }
  });
  if (matchedRelease.length === 0) {
    return matchedOs[0];
  }
  if (!version) {
    // get the closest match
    return matchedRelease[matchedRelease.length - 1];
  }
  const matchedVersion = [];
  matchedRelease.forEach((rel) => {
    if (version.indexOf(rel.version) >= 0) {
      matchedVersion.push(rel);
    }
    if (rel.version === 'all') {
      matchedVersion.unshift(rel);
    }
  });
  if (matchedVersion.length === 0) {
    return matchedRelease[matchedRelease.length - 1];
  }
  return matchedVersion[matchedVersion.length - 1];
};


/**
 * find the knowledge base rules
 *
 * @param osType  the operation system type, could be linux, mac, windows
 * @param release could be centos, ubuntu, coreos etc.
 * @param version   the os version
 * @returns {*}
 */
export const getKnowledgeBaseRules = (osType, release, version) => {
  return findRules({osType, release, version}, rules);
};
