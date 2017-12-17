/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:23:13+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-18T09:29:47+11:00
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
  rxObservable: ?Observable<ObservaleValue> = null;
  displayName = 'Dummy';
  samplingRate: number;
  items = [];

  _getRandomNumberInInterval = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  _simulateNextWaitingTime = () => {
    const min = -this.samplingRate * 0.2;
    const max = this.samplingRate * 0.2;

    return this.samplingRate + this._getRandomNumberInInterval(min, max);
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

  init(profileId: UUID, _options: { mongoConnection: MongoConnection }): Promise<*> {
    this.rxObservable = Observable.create((observer: Observer<ObservaleValue>) => {
      // whenever this observable is subscribed

      // allocate inexpensive resources
      let timerId;

      let counter = 0;
      const exec = () => {
        observer.next({
          profileId,
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

        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
        timerId = setTimeout(exec, this._simulateNextWaitingTime());
      };

      // start execution when someone is subscribed to this observable
      exec();

      return () => {
        // whenever this observable is unsubscribed

        // recycle any inexpensive resources allocated earlier
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
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
