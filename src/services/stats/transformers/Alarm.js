/**
 * @flow
 *
 * @Author: Guy Harrison <gharriso>
 * @Date:   2018-02-20T14:01:28+11:00
 * @Email:  guy@southbanksoftware.com
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-21T11:43:06+11:00
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
import type { ObservaleValue } from '../observables/ObservableWrapper';
import Transformer from './Transformer';

/**
 * Detect anomalies and raise alarms
 *
 * @gharriso you can hot-reloading the corresponding unit test as:
 *
 *    yarn test:unit --grep Alarm --watch
 */
export default class Alarm extends Transformer {
  /* we don't want to send stats back to ui yet */
  _detachStats = (nextValue: ObservaleValue) => {
    delete nextValue.stats;
  };

  _detectNetworkUplinkAnomaly = (nextValue: ObservaleValue) => {
    const { stats, value } = nextValue;
    const path = ['network_bytesOutPs'];
    const valueStats = _.get(stats, path);

    if (!valueStats) return;

    const { mean, sd, count } = _.get(stats, path);
    const currentValue = _.get(value, path);

    if (count > 3 && (currentValue < mean - 3 * sd || currentValue > mean + 3 * sd)) {
      _.set(value, 'alarm.mongo.networkUplinkAnomaly', {
        level: 1, // 0 for green, 1 for yellow, 2 for reduce
        message: 'unusual high uplink bandwidth usage is detected'
      });
    }
  };

  transform = (nextValue: ObservaleValue): ObservaleValue => {
    this._detectNetworkUplinkAnomaly(nextValue);

    this._detachStats(nextValue);

    nextValue.value.alarm && l.debug(`Alarm: ${JSON.stringify(nextValue.value.alarm, null, 2)}`);

    return nextValue;
  };
}
