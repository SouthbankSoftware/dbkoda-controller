/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:23:13+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-01-04T12:04:16+11:00
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
  errorTimeoutId: ?number;
  warnTimeoutId: ?number;
  fatalErrorTimeoutId: ?number;
  completionTimeoutId: ?number;

  _getRandomNumberInInterval = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  _simulateSamplingDelay = () => {
    const min = 0;
    const max = this.samplingRate * 0.1;

    return this._getRandomNumberInInterval(min, max);
  };

  _simulateInitTime = () => {
    const min = 0;
    const max = this.samplingRate * 0.3;

    return this._getRandomNumberInInterval(min, max);
  };

  _simulateDestroyTime = () => {
    const min = 0;
    const max = this.samplingRate * 0.1;

    return this._getRandomNumberInInterval(min, max);
  };

  init(_options: { mongoConnection: MongoConnection }): Promise<*> {
    let counter = 0;
    let _observer = null;

    if (this.simulateErrorAt) {
      this.errorTimeoutId = setTimeout(() => {
        const err = new Error('Test error');
        this.debug && l.error(`Observable ${this.displayName} error`, err);
        this.emitError(err.message, 'error'); // or simply `this.emitError(err.message)`
      }, this.simulateErrorAt);
    }

    if (this.simulateWarnAt) {
      this.warnTimeoutId = setTimeout(() => {
        const err = new Error('Test warn');
        this.debug && l.warn(`Observable ${this.displayName} warn`, err);
        this.emitError(err.message, 'warn');
      }, this.simulateWarnAt);
    }

    if (this.simulateFatalErrorAt) {
      this.fatalErrorTimeoutId = setTimeout(() => {
        if (_observer) {
          _observer.error(new Error('Test fatal error'));
        }
      }, this.simulateFatalErrorAt);
    }

    if (this.simulateCompletionAt) {
      this.completionTimeoutId = setTimeout(() => {
        if (_observer) {
          _observer.complete();
        }
      }, this.simulateCompletionAt);
    }

    this.rxObservable = Observable.create((observer: Observer<ObservaleValue>) => {
      // whenever this observable is subscribed

      // allocate inexpensive resources
      let intervalId;
      _observer = observer;

      const exec = () => {
        const _exec = () =>
          setTimeout(() => {
            observer.next({
              profileId: this.profileId,
              timestamp: Date.now(),
              // values to be observed
              value: _.reduce(
                this.items,
                (acc, v) => {
                  const seq = Number(v.substring(5));

                  acc[v] = counter + seq;
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

      // start execution when someone is subscribed to this observable
      exec();

      return () => {
        // whenever this observable is unsubscribed

        // recycle any inexpensive resources allocated earlier
        _observer = null;
        // $FlowFixMe
        clearInterval(intervalId);
        intervalId = null;
      };
    });

    return new Promise(resolve => {
      // init any expensive resources here
      setTimeout(resolve, this._simulateInitTime());
    });
  }

  destroy(): Promise<*> {
    // IMPORTANT
    this.rxObservable = null;

    clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = null;
    clearTimeout(this.warnTimeoutId);
    this.warnTimeoutId = null;
    clearTimeout(this.fatalErrorTimeoutId);
    this.fatalErrorTimeoutId = null;
    clearTimeout(this.completionTimeoutId);
    this.completionTimeoutId = null;

    return new Promise(resolve => {
      // destroy any expensive resources allocated in init
      setTimeout(resolve, this._simulateDestroyTime());
    });
  }
}
