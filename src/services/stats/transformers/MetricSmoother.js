/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-02-19T13:42:03+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-21T12:02:48+11:00
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

const EXHALE_VALUE_PRECISION = 6;

type ValueWrapper = { avg: number, htWindow: (?number)[], inhaledNextValue: boolean, nullCount: 0 };

type ValueManifest =
  | {
      [string]: ValueWrapper | ValueManifest
    }
  | (ValueWrapper | ValueManifest)[];

/**
 * Apply simple moving average (SMA) transformation on each metric
 */
export default class MetricSmoother extends Transformer {
  windowSize: number;
  /* _valueManifest has the same shape as ObservaleValue.value */
  _valueManifest: ValueManifest;

  constructor(windowSize: number) {
    super();

    this.windowSize = windowSize;
    this._valueManifest = {};
  }

  _isValueWrapper = (valueManifest: ValueManifest): boolean => {
    return valueManifest && 'inhaledNextValue' in valueManifest;
  };

  _inhaleNextValue = (valueManifest: ValueManifest, nextValue: { [string]: any }) => {
    _.forEach(nextValue, (v, k) => {
      // skip all null/undefined values
      if (v == null) return;

      const vType = typeof v;

      if (vType === 'number') {
        if (_.isNaN(v)) return;

        let valueWrapper: ValueWrapper = valueManifest[k];

        if (!valueWrapper) {
          valueWrapper = {
            avg: 0,
            htWindow: [],
            inhaledNextValue: false,
            nullCount: 0
          };
          valueManifest[k] = valueWrapper;
        }

        const { htWindow, avg, nullCount } = valueWrapper;

        htWindow.push(v);
        valueWrapper.inhaledNextValue = true;
        valueWrapper.avg += (v - avg) / (htWindow.length - nullCount);
      } else if (vType === 'object') {
        let childValueManifest: ValueManifest = valueManifest[k];

        if (!childValueManifest) {
          childValueManifest = _.isArray(v) ? [] : {};
          valueManifest[k] = childValueManifest;
        }

        this._inhaleNextValue(childValueManifest, v);
      } else {
        // retain value in other types
        valueManifest[k] = v;
      }
    });
  };

  _exhaleSmaValue = (valueManifest: ValueManifest, result: { [string]: any } | any[]): boolean => {
    let isEmpty = true;

    // $FlowFixMe
    _.forEach(valueManifest, (v, k, col) => {
      const vType = typeof v;

      if (vType === 'object') {
        if (this._isValueWrapper(v)) {
          const { htWindow, avg, inhaledNextValue } = v;

          if (!inhaledNextValue) {
            htWindow.push(null);
            v.nullCount += 1;
          }

          v.inhaledNextValue = false;

          if (htWindow.length > this.windowSize) {
            const numToDrop = htWindow.length - this.windowSize;
            const droppingEls = htWindow.splice(0, numToDrop);
            let droppingSum = 0;
            let droppingCount = 0;

            for (const el of droppingEls) {
              if (el == null) {
                v.nullCount -= 1;
              } else {
                droppingSum += el;
                droppingCount += 1;
              }
            }

            if (v.nullCount === htWindow.length) {
              // now the value is all missing in its time window
              delete col[k];
              return;
            }

            v.avg -= (droppingSum - avg * droppingCount) / (htWindow.length - v.nullCount);
          }

          isEmpty = false;
          result[k] = _.round(v.avg, EXHALE_VALUE_PRECISION);
        } else {
          const childResult = _.isArray(v) ? [] : {};
          if (this._exhaleSmaValue(v, childResult)) {
            // empty childResult
            delete col[k];
          } else {
            isEmpty = false;
            result[k] = childResult;
          }
        }
      } else {
        result[k] = v;
      }
    });

    return isEmpty;
  };

  transform = (value: ObservaleValue): ObservaleValue => {
    this._inhaleNextValue(this._valueManifest, value.value);
    const result = {};
    this._exhaleSmaValue(this._valueManifest, result);
    value.value = result;
    return value;
  };
}
