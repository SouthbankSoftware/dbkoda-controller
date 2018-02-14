/**
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

/* List of indentifiers/keys for items to be observed */

import {findRules} from '../utils';
import {getAllItemKeys, parseData} from './rule_parser';

export const driverItems = [...getAllItemKeys(), 'db_storage'];

export const parsers = {
  'db_storage': (dbStats) => {
    return {db_storage: dbStats};
  },
  'others': (previous, newData, dbVersion, samplingRate) => {
    return parseData(newData, previous, dbVersion, samplingRate);
  }
};

/**
 * define the mongo stats knowledgebase rules.
 *
 * @type {{all}}  mongo server should be same for all os types
 */
export const rules = {
  // all match all os types
  'all': [{
    release: 'all', // mongod, mongos, etc.
    version: 'all', // 3.2, 3.0, etc.
    parse: (previous, newData, dbVersion, samplingRate, key) => { // define the parse command output logic
      let parseKey = key;
      if (!parsers[parseKey]) {
        parseKey = 'others';
      }
      return parsers[parseKey](newData, previous, dbVersion, samplingRate);
    }
  }]
};

/**
 * find the knowledge base rules
 *
 * @param release could be mongod, mongos etc.
 * @param version   the mongo server version
 * @returns {*}
 */
export const getKnowledgeBaseRules = ({release, version}) => {
  const rule = findRules({osType: 'all', release, version}, rules);
  return {...rule};
};
