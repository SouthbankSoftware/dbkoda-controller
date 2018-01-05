/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-12T14:21:24+11:00
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

import {Observable, Observer} from 'rxjs';

import type {ObservaleValue} from '../ObservableWrapper';
import {ObservableWrapper} from '../ObservableWrapper';
import {getKnowledgeBaseRules} from '../../knowledgeBase/driver';


export default class MongoNativeDriver implements ObservableWrapper {
  rxObservable: ?Observable<ObservaleValue> = null;
  type: string = 'Unknown';
  observer: Observer<ObservaleValue>;
  profileId: string;
  mongoConnection: Object;
  db: Object;
  samplingRate: number;
  items: string[] = ['serverStatus'];
  displayName: string = 'Server Status';
  knowledgeBase: Object;
  previousData: Object;
  intervalId: number;

  init(options: Object): Promise<*> {
    this.mongoConnection = options.mongoConnection;
    this.db = this.mongoConnection.driver;
    this.rxObservable = Observable.create((observer: Observer<ObservaleValue>) => {
      this.observer = observer;
      this.intervalId = setInterval(() => this.start(this.db), this.samplingRate);
      return () => {
        clearInterval(this.intervalId);
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
    log.info('start getting stats.');
    db.admin().command({serverStatus: 1}, {}, (err, data) => {
      if (!err) {
        this.knowledgeBase = getKnowledgeBaseRules({version: data.version, release: data.process});
        if (!this.knowledgeBase) {
          return Promise.reject('Cant find knowledge base');
        }
        this.postProcess(data);
      } else {
        log.info('cant run serverStatus command through driver.');
        this.emitError('this is not mongodb replicaset connection.');
      }
    });
  }

  postProcess(data: Object): void {
    l.debug('get driver status:', data);
    const value = this.knowledgeBase.parse(this.previousData, data);
    l.debug('parsed value', value);
    this.previousData = value.finals;
    if (!value.data) {
      // the first time is not parsing
      return;
    }
    this.observer.next({
      profileId: this.profileId,
      timestamp: (new Date()).getTime(),
      value: {'serverStatus': value.data}
    });
  }

  destroy(): Promise<*> {
    if (this.db.topology) {
      this.db.topology.close();
    }
    this.rxObservable = null;
    return Promise.resolve();
  }
}
