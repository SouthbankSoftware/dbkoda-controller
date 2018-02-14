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
 * Created by joey on 14/2/18.
 */


import {Observable, Observer} from 'rxjs';
import _ from 'lodash';

import type {ObservaleValue} from '../ObservableWrapper';
import {ObservableWrapper} from '../ObservableWrapper';

export default class MongoNativeDriver implements ObservableWrapper {
  rxObservable: ?Observable<ObservaleValue> = null;
  type: string = 'Unknown';
  observer: Observer<ObservaleValue>;
  profileId: string;
  mongoConnection: Object;
  db: Object;
  samplingRate: number;
  items: string[] = ['db_storage'];
  displayName: string = 'Database Storages';
  knowledgeBase: Object;
  previousData: Object;
  intervalId: number;
  historyData: Object[] = [];

  init(options: Object): Promise<*> {
    this.mongoConnection = options.mongoConnection;
    this.db = this.mongoConnection.driver;
    this.rxObservable = Observable.create((observer: Observer<ObservaleValue>) => {
      this.observer = observer;
      this.start(this.db);
      this.intervalId = setInterval(() => this.start(this.db), this.samplingRate);
      return () => {
        this.pause();
      };
    });
    return Promise.resolve();
  }

  /**
   * start listening on topology change
   */
  start(db: Object) {
    if (!db) {
      this.emitError('failed to find mongodb driver.');
      return;
    }
    db.command({serverStatus: 1}, {}, (err, data) => {
      if (!err) {
        this.knowledgeBase = getKnowledgeBaseRules({version: data.version, release: data.process});
        if (!this.knowledgeBase) {
          return Promise.reject('Cant find knowledge base');
        }
        this.postProcess(data);
      } else {
        log.error('cant run serverStatus command through driver.', err);
        this.emitError('cant run serverStatus command through driver.');
      }
    });
  }

  postProcess(data: Object): void {
    const value = this.knowledgeBase.parse(this.previousData, data, data.version, this.samplingRate);

    this.previousData = data;
    if (_.isEmpty(value)) {
      // the first time is not parsing
      return;
    }
    this.historyData.push(value);
    if (this.historyData.length > MAX_HISTORY_SIZE) {
      this.historyData.splice(0, MAX_HISTORY_SIZE - this.historyData.length + 1);
    }
    this.observer.next({
      profileId: this.profileId,
      timestamp: (new Date()).getTime(),
      value
    });
  }

  pause() {
    clearInterval(this.intervalId);
  }

  destroy(): Promise<*> {
    this.pause();
    this.rxObservable = null;
    this.historyData = [];
    return Promise.resolve();
  }
}
