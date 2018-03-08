/**
 * @flow
 *
 * @Author: Guy Harrison <gharriso>
 * @Date:   2018-02-20T14:01:28+11:00
 * @Email:  guy@southbanksoftware.com
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-07T02:13:31+11:00
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
// $FlowFixMe
import { sprintf } from 'sprintf-js';
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
  config: *;

  constructor(config: *) {
    super();

    this.config = config;
  }

  /* we don't want to send stats back to ui yet */
  _detachStats = (nextValue: ObservaleValue) => {
    delete nextValue.stats;
  };

  _simpleThresholds = (nextValue: ObservaleValue) => {
    const { stats, value } = nextValue;
    this.config.simpleThresholds.forEach(st => {
      const path = [st.metric];
      const valueStats = _.get(stats, path);
      // const { mean, sd, count } = _.get(stats, path);
      const currentValue = _.get(value, path);
      const debugData = {
        path,
        valueStats,
        currentValue
      };

      if (currentValue > st.l1) {
        let level = 1;
        if (currentValue > st.l2) {
          level = 2;
        }
        const message = sprintf(st.warningMessage, currentValue);
        _.set(value, st.alarmPath, {
          level,
          message,
          debugData
        });
      }
    });
  };

  _standardDeviations = (nextValue: ObservaleValue) => {
    const { stats, value } = nextValue;
    this.config.standardDeviationThresholds.thresholds.forEach(st => {
      const path = [st.metric];
      const valueStats = _.get(stats, path);
      if (valueStats) {
        const { mean, sd, count } = _.get(stats, path);
        const currentValue = _.get(value, path);
        const debugData = {
          path,
          valueStats,
          currentValue
        };
        if (count >= this.config.standardDeviationThresholds.minimumSamples) {
          if (currentValue > mean + sd * st.l1) {
            let level = 1;
            if (currentValue > mean + sd * st.l2) {
              level = 2;
            }
            const message = sprintf(st.warningMessage, mean, sd, currentValue);
            _.set(value, st.alarmPath, {
              level,
              message,
              debugData
            });
          }
        }
      }
    });
  };

  transform = (nextValue: ObservaleValue): ObservaleValue => {
    this._simpleThresholds(nextValue);
    this._standardDeviations(nextValue);

    // TODO: filter unnecessary stats that don't need to be sent back to ui
    // this._detachStats(nextValue);

    return nextValue;
  };
}
