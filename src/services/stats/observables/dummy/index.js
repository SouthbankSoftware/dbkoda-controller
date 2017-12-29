/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:23:13+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-28T18:18:51+11:00
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

import { Observable, Observer } from 'rxjs';
import MongoConnection from '~/controllers/mongo-connection/connection';
import _ from 'lodash';
import type { ObservableWrapper, ObservaleValue } from '../ObservableWrapper';

export default class Dummy implements ObservableWrapper {
  id: *;
  samplingRate: *;
  profileId: *;
  emitError: *;
  debug: *;

  rxObservable: ?Observable<ObservaleValue> = null;
  displayName = 'Dummy';
  items = [];

  simulateErrorAt = null;
  simulateWarnAt = null;
  simulateFatalErrorAt = null;
  simulateCompletionAt = null;

  _getRandomNumberInInterval = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  _simulateSamplingDelay = () => {
    const min = 0;
    const max = this.samplingRate * 0.15;

    return this._getRandomNumberInInterval(min, max);
  };

  _simulateInitTime = () => {
    const min = 0;
    const max = this.samplingRate * 0.5;

    return this._getRandomNumberInInterval(min, max);
  };

  _simulateDestroyTime = () => {
    const min = 0;
    const max = this.samplingRate * 0.1;

    return this._getRandomNumberInInterval(min, max);
  };

  init(_options: { mongoConnection: MongoConnection }): Promise<*> {
    this.rxObservable = Observable.create((observer: Observer<ObservaleValue>) => {
      // whenever this observable is subscribed

      // allocate inexpensive resources
      let intervalId;
      let errorTimeoutId;
      let warnTimeoutId;
      let fatalErrorTimeoutId;
      let completionTimeoutId;

      let counter = 0;
      const exec = () => {
        const _exec = () =>
          setTimeout(() => {
            observer.next({
              profileId: this.profileId,
              timestamp: Date.now(),
              // values to be observed
              value: _.reduce(
                this.items,
                (acc, v, i) => {
                  acc[v] = counter + i;
                  return acc;
                },
                {},
              ),
            });
            counter += 1;
          }, this._simulateSamplingDelay());

        _exec();

        // $FlowFixMe
        clearInterval(intervalId);
        intervalId = setInterval(_exec, this.samplingRate);
      };

      if (this.simulateErrorAt) {
        errorTimeoutId = setTimeout(() => {
          const err = new Error('Test error');
          this.debug && l.error(`Observable ${this.displayName} error`, err);
          this.emitError(err.message, 'error'); // or simply `this.emitError(err.message)`
        }, this.simulateErrorAt);
      }

      if (this.simulateWarnAt) {
        warnTimeoutId = setTimeout(() => {
          const err = new Error('Test warn');
          this.debug && l.warn(`Observable ${this.displayName} warn`, err);
          this.emitError(err.message, 'warn');
        }, this.simulateWarnAt);
      }

      if (this.simulateFatalErrorAt) {
        fatalErrorTimeoutId = setTimeout(() => {
          observer.error(new Error('Test fatal error'));
        }, this.simulateFatalErrorAt);
      }

      if (this.simulateCompletionAt) {
        completionTimeoutId = setTimeout(() => {
          observer.complete();
        }, this.simulateCompletionAt);
      }

      // start execution when someone is subscribed to this observable
      exec();

      return () => {
        // whenever this observable is unsubscribed

        // recycle any inexpensive resources allocated earlier
        // $FlowFixMe
        clearInterval(intervalId);
        intervalId = null;
        clearTimeout(errorTimeoutId);
        errorTimeoutId = null;
        clearTimeout(warnTimeoutId);
        warnTimeoutId = null;
        clearTimeout(fatalErrorTimeoutId);
        fatalErrorTimeoutId = null;
        clearTimeout(completionTimeoutId);
        completionTimeoutId = null;
      };
    });

    return new Promise((resolve) => {
      // init any expensive resources here
      setTimeout(resolve, this._simulateInitTime());
    });
  }

  destroy(): Promise<*> {
    // IMPORTANT
    this.rxObservable = null;

    return new Promise((resolve) => {
      // destroy any expensive resources allocated in init
      setTimeout(resolve, this._simulateDestroyTime());
    });
  }
}
