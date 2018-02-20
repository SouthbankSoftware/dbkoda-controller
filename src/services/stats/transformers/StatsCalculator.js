/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-02-20T10:47:17+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-20T11:48:40+11:00
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

type Stats = {
  /* Exponential moving average */
  ema: number,
  /* Exponential moving variance */
  emv: number,
  /* Exponential moving standard deviation */
  emsd: number,
  /* Number of samples this stats represent */
  count: number
};

type StatsManifest =
  | {
      [string]: Stats | StatsManifest
    }
  | (Stats | StatsManifest)[];

/**
 * Calculate and attach `stats` to ObservaleValue. Please avoid mutating ObservaleValue.stats
 */
export default class StatsCalculator extends Transformer {
  alpha: number;
  /* _statsManifest has the same shape as ObservaleValue.value, and will be attached to
   ObservaleValue.stats after each transform */
  _statsManifest: StatsManifest;

  constructor(alpha: number) {
    super();

    this.alpha = alpha;
    this._statsManifest = {};
  }

  _calculateNextDelta = (prevEma: number, nextSample: number): number => {
    return nextSample - prevEma;
  };

  _calculateNextEma = (prevEma: number, nextDelta: number): number => {
    return prevEma + this.alpha * nextDelta;
  };

  _calculateNextEmv = (prevEmv: number, nextDelta: number): number => {
    return (1 - this.alpha) * (prevEmv + this.alpha * nextDelta * nextDelta);
  };

  _calculateNextEmsd = (nextEmv: number) => {
    return Math.sqrt(nextEmv);
  };

  _calculateNextStats = (statsManifest: StatsManifest, nextValue: { [string]: any }) => {
    _.forEach(nextValue, (v, k) => {
      if (v == null) return;

      if (typeof v === 'number') {
        let stats: Stats = statsManifest[k];

        if (!stats) {
          stats = {
            ema: v,
            emv: 0,
            emsd: 0,
            count: 1
          };
          statsManifest[k] = stats;
        } else {
          const { ema: prevEma, emv: prevEmv } = stats;

          const nextDelta = this._calculateNextDelta(prevEma, v);
          stats.ema = this._calculateNextEma(prevEma, nextDelta);
          stats.emv = this._calculateNextEmv(prevEmv, nextDelta);
          stats.emsd = this._calculateNextEmsd(stats.emv);
          stats.count += 1;
        }
      } else {
        let childStatsManifest: StatsManifest = statsManifest[k];

        if (!childStatsManifest) {
          childStatsManifest = _.isArray(v) ? [] : {};
          statsManifest[k] = childStatsManifest;
        }

        this._calculateNextStats(childStatsManifest, v);
      }
    });
  };

  transform = (value: ObservaleValue): ObservaleValue => {
    this._calculateNextStats(this._statsManifest, value.value);

    // $FlowFixMe
    value.stats = this._statsManifest;

    return value;
  };
}
