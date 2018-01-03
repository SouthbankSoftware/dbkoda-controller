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
import flat from 'flat';

const serverStatistics = (stats) => {
  const serverStats = flat(stats);
  const uptime = serverStats.uptime;
  const output = {statistics: []};
  _.forOwn(serverStats, (value, key) => {
    let rate = 0;
    if (typeof value === 'number') { // eslint-disable-line
      // eslint-disable-line
      rate = (value / uptime).toFixed(4);
    }
    if (!key.match(/_mongo/)) {
      output.statistics.push({
        statistic: key,
        value,
        ratePs: rate
      });
    }
  });
  return output;
};

const simpleStats = (stats) => {
  const serverStats = serverStatistics(stats);
  const returnStat = {};
  serverStats.statistics.forEach((stat) => {
    returnStat[stat.statistic] = stat.value;
  });
  return returnStat;
};

const common = {
  release: 'all', // mongod, mongos, etc.
  version: 'all', // 3.2, 3.0, etc.
  samplingRate: 5, // define the sampling rate in seconds
  parse: (data) => { // define the parse command output logic
    return simpleStats(serverStatistics(data));
  }
};

export default [common];
