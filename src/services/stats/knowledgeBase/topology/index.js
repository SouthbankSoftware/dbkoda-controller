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
 * Created by joey on 20/12/17.
 */
import _ from 'lodash';

export const items = ['topology'];

const rules = [
  {
    serverVersion: 'all',
    parse: db => {
      return new Promise((resolve, reject) => {
        db.admin().command({ replSetGetStatus: 1 }, (err, result) => {
          if (!result || err) {
            reject(err);
            return;
          }
          resolve(result.members);
        });
      }).catch(err => {
        log.error('failed to get replica set ', err);
        this.observer.error(err);
      });
    }
  }
];

export const getKnowledgeBaseRules = serverVersion => {
  const matched = _.find(rules, { serverVersion });
  if (!matched && rules.length > 0) {
    return rules[0];
  }
  return matched;
};
