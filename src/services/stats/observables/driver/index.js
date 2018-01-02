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
  items: string[] = ['topology'];
  displayName: string = 'Topology Monitor';
  knowledgeBase: Object;

  init(profileId: string, options: Object): Promise<*> {
    this.profileId = profileId;
    this.mongoConnection = options.mongoConnection;
    this.db = this.mongoConnection.driver;
    this.rxObservable = Observable.create((observer: Observer<ObservaleValue>) => {
      this.observer = observer;
      this.start(this.db);
      return () => {
        this.db.topology.removeListener('serverDescriptionChanged', this.knowledgeBase);
      };
    });
    return Promise.resolve();
  }

  /**
   * start listening on topology change
   */
  start(db: Object) {
    if (!db) {
      this.observer.error('failed to find mongodb driver.');
      return;
    }
    db.admin().command({serverStatus: 1}, (err, data) => {
      if (!err) {
        this.knowledgeBase = getKnowledgeBaseRules({version: data.version, release: data.process});
        l.info(this.knowledgeBase);
        if (!this.knowledgeBase) {
          return Promise.reject('Cant find knowledge base');
        }
        this.knowledgeBase.parse(data);
      } else {
        log.info('cant run serverStatus command through driver.');
        this.observer.error('this is not mongodb replicaset connection.');
      }
    });
  }

  destroy(): Promise<*> {
    if (this.db.topology) {
      this.db.topology.close();
    }
    return Promise.resolve();
  }
}
