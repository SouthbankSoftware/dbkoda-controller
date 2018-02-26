/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-02-20T10:47:17+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-20T20:59:06+11:00
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
  ema?: number,
  /* Exponential moving variance */
  emv?: number,
  /* Exponential moving standard deviation */
  emsd?: number,
  /* Mean */
  mean: number,
  /* Sum of squares of differences from mean. This is necessary for Knuth's algorithm */
  s: number,
  /* Standard deviation */
  sd: number,
  /* Number of samples this stats represent */
  count: number,
  /* high water mark */
  hwm: number,
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
  _enabledEmStats: boolean;

  constructor(enabledEmStats: boolean = false, alpha: number = 0.2) {
    super();

    this.alpha = alpha;
    this._statsManifest = {};
    this._enabledEmStats = enabledEmStats;
  }

  _calculateNextDelta = (prevMean: number, nextSample: number): number => {
    return nextSample - prevMean;
  };

  /**
   * Exponential moving algorithms
   * https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
   */
  _calculateNextEma = (prevEma: number, nextDelta: number): number => {
    return prevEma + this.alpha * nextDelta;
  };

  _calculateNextEmv = (prevEmv: number, nextDelta: number): number => {
    return (1 - this.alpha) * (prevEmv + this.alpha * nextDelta * nextDelta);
  };

  _calculateNextEmsd = (nextEmv: number) => {
    return Math.sqrt(nextEmv);
  };

  /**
   * calculate high water mark
   */
  _calculateHWM = (sd: number, mean: number) => {
    return 3 * sd + mean;
  };

  /**
   * Algorithms presented in Donald Knuth’s Art of Computer Programming, Vol 2, page 232, 3rd
   * edition
   * https://www.johndcook.com/blog/standard_deviation/
   */
  _calculateNextMean = (prevMean: number, nextDelta: number, count: number) => {
    return prevMean + nextDelta / count;
  };

  _calculateNextS = (prevS: number, nextDelta: number, nextSample: number, nextMean: number) => {
    return prevS + nextDelta * (nextSample - nextMean);
  };

  _calculateNextSd = (nextS: number, count: number) => {
    return Math.sqrt(nextS / (count - 1));
  };

  _calculateNextStats = (statsManifest: StatsManifest, nextValue: { [string]: any }) => {
    _.forEach(nextValue, (v, k) => {
      if (v == null) return;

      const vType = typeof v;

      if (vType === 'number') {
        let stats: Stats = statsManifest[k];

        if (!stats) {
          stats = {
            ...(this._enabledEmStats
              ? {
                  ema: v,
                  emv: 0,
                  emsd: 0
                }
              : undefined),
            mean: v,
            s: 0,
            sd: 0,
            count: 1,
            hwm: 0,
          };
          statsManifest[k] = stats;
        } else {
          stats.count += 1;

          if (this._enabledEmStats) {
            const { ema: prevEma, emv: prevEmv } = stats;
            // $FlowFixMe
            const nextDelta = this._calculateNextDelta(prevEma, v);
            // $FlowFixMe
            stats.ema = this._calculateNextEma(prevEma, nextDelta);
            // $FlowFixMe
            stats.emv = this._calculateNextEmv(prevEmv, nextDelta);
            stats.emsd = this._calculateNextEmsd(stats.emv);
          }

          const { mean: prevMean, s: prevS, count } = stats;
          const nextDelta = this._calculateNextDelta(prevMean, v);
          stats.mean = this._calculateNextMean(prevMean, nextDelta, count);
          stats.s = this._calculateNextS(prevS, nextDelta, v, stats.mean);
          stats.sd = this._calculateNextSd(stats.s, count);
          stats.hwm = this._calculateHWM(stats.sd, stats.mean);
        }
      } else if (vType === 'object') {
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
