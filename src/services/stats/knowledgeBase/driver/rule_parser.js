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
 * Created by joey on 6/2/18.
 */
import _ from 'lodash';
import rules from './rules.json';

const mkFunc = require('expression-parser/func');
const parse = require('expression-parser/parse');

/**
 * check whether the given version match the pattern. The pattern can be something like 3.2.*
 */
export const checkVersion = (version, pattern) => {
  if (pattern.indexOf('*') >= 0) {
    const filtered = pattern.replace('*', '').replace(/\.$/, '');
    return version.indexOf(filtered) >= 0;
  }
  return version === pattern;
};

/**
 * parse the data from path: globalLock.activeClients.readers
 */
export const getDataFromSourcePath = (stats, source) => {
  if (!source) {
    return undefined;
  }
  const paths = source.split('.');
  let value = stats;
  while (paths.length > 0 && value !== undefined) {
    const path = paths.shift();
    value = value[path];
  }
  return value;
};

export const parseSingleStatDefValue = (stats, statDef, dbVersion) => {
  if (!statDef.versions || statDef.versions.length <= 0) {
    // parse the value from default source
    return getDataFromSourcePath(stats, statDef.defaultSource);
  }
  // parse the value from version
  const matchedVersion = _.find(statDef.versions, (v) => checkVersion(dbVersion, v.versionMask));
  if (matchedVersion && matchedVersion.source) {
    return getDataFromSourcePath(stats, matchedVersion.source);
  }
  return null;
};

export const parseStatDefValue = (stats, statDef, dbVersion, prevStats) => {
  let currentValue = parseSingleStatDefValue(stats, statDef, dbVersion);
  if (statDef.type === 'rate' && prevStats) {
    const prevValue = parseSingleStatDefValue(prevStats, statDef, dbVersion);
    if (prevValue) {
      currentValue -= prevValue;
      if (currentValue < 0) {
        currentValue = 0;
      }
    }
  }
  return currentValue;
};

export const findAllVars = (expression) => {
  const vars = [];
  const searchNode = (ast) => {
    if (ast.node === 'name') {
      vars.push(ast.template);
    }
    ast.children.forEach(child => searchNode(child));
  };
  const ast = parse(expression);
  searchNode(ast);
  return vars;
};

export const parseCalculations = (calculations, statsValues) => {
  if (!calculations) {
    return statsValues;
  }
  return calculations.map((calculation) => {
    const expressionFunc = mkFunc(calculation.expression);
    const allVars = findAllVars(calculation.expression);
    allVars.forEach((variable) => {
      l.info(variable);
    });
    expressionFunc({writeLatencyRate:5, writeOpsRate: 0});
  });
};

export const parseDataByRules = (rules, stats, dbVersion, prevStats) => {
  const statsValues = {};
  rules.statisticDefinitions.forEach((statDef) => {
    const value = parseStatDefValue(stats, statDef, dbVersion, prevStats);
    statsValues[statDef.name] = value;
  });
  return parseCalculations(rules.calculations, statsValues);
};

export const parseData = (stats, prevStats, dbVersion) => {
  return parseDataByRules(rules, stats, dbVersion, prevStats);
};
