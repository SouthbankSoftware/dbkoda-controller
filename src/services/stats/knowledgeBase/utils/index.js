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
 * Created by joey on 2/1/18.
 */

import _ from 'lodash';

/**
 * find matched rules based on os, release and version.
 *
 * @returns {*}
 */
export const findRules = ({osType, release, version}, rules) => {
  let matchedOs = [];
  _.forOwn(rules, (value, key) => {
    if (key === osType.toLowerCase()) {
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
    if (rel.version && rel.version.indexOf(version) >= 0) {
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
 * parsing below object into command:
 *
 * {
 *  cmd: 'vmstat $samplingRate $counter',
 *  samplingRate: 4,
 *  counter: 10
 * }
 */
export const buildCommand = (obj) => {
  if (!obj || !obj.cmd) {
    return null;
  }
  let command = obj.cmd;
  const match = obj.cmd.match(/\$[^\s]*/g);
  const replaceMap = {};
  if (match && match.length > 0) {
    match.forEach((str) => {
      const cmd = str.replace('$', '');
      if (obj[cmd]) {
        replaceMap[str] = obj[cmd];
      }
    });
  }
  _.forOwn(replaceMap, (v, k) => {
    const replace = `\\${k}`;
    const re = new RegExp(replace, 'g');
    command = obj.cmd.replace(re, v);
  });
  return command;
};
