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
import _ from 'lodash';
import { findRules } from '../utils';
import { getAllItemKeys, parseData } from './rule_parser';

export const driverItems = [...getAllItemKeys(), 'db_storage', 'db_profile'];

/**
 * define the mongo stats knowledgebase rules.
 *
 * @type {{all}}  mongo server should be same for all os types
 */
export const rules = {
  // all match all os types
  all: [
    {
      release: 'mongos',
      version: 'all',
      parse: (newData, previous, dbVersion, samplingRate, key) => {
        // define the parse command output logic
        if (key === 'db_storage') {
          return {
            db_storage: newData.map(dbStats => {
              if (!_.isEmpty(dbStats.raw)) {
                const db = _.values(dbStats.raw)[0].db;
                return { dbName: db, dataSize: dbStats.dataSize };
              }
            })
          };
        }
        return parseData(newData, previous, dbVersion, samplingRate);
      }
    },
    {
      release: 'all', // mongod, mongos, etc.
      version: 'all', // 3.2, 3.0, etc.
      parse: (newData, previous, dbVersion, samplingRate, key) => {
        // define the parse command output logic
        if (key === 'db_storage') {
          return {
            db_storage: newData.map(stat => {
              return { dbName: stat.db, dataSize: stat.dataSize };
            })
          };
        }
        return parseData(newData, previous, dbVersion, samplingRate);
      }
    }
  ]
};

/**
 * find the knowledge base rules
 *
 * @param release could be mongod, mongos etc.
 * @param version   the mongo server version
 * @returns {*}
 */
export const getKnowledgeBaseRules = ({ release, version }) => {
  const rule = findRules({ osType: 'all', release, version }, rules);
  return { ...rule };
};
