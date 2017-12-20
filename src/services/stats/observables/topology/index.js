/**
 * @flow
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
import {getKnowledgeBaseRules} from '../../knowledgeBase/topology';

export default class TopologyMonitor implements ObservableWrapper {
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
    this.knowledgeBase = getKnowledgeBaseRules(this.mongoConnection.dbVersion);
    if (!this.knowledgeBase) {
      return Promise.reject('Cant find knowledge base');
    }
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
    if (!db || !db.topology) {
      this.observer.error('failed to find mongodb driver.');
      return;
    }
    db.admin().command({replSetGetStatus: 1}, (err) => {
      if (!err) {
        log.info('start monitoring topology');
        db.topology.on('serverDescriptionChanged', this.topologyListener.bind(this));
      } else {
        log.info('cant monitor single/shard cluster');
        this.observer.error('this is not mongodb replicaset connection.');
      }
    });
  }

  topologyListener(event: Object) {
    console.log('received serverDescriptionChanged,', event);
    if (event && event.newDescription && event.newDescription.type !== 'Unknown') {
      log.info('replicaset topology was changed');
      this.knowledgeBase.parse(this.db).then((members) => {
        log.info('new members:', members);
        this.observer.next({
          profileId: this.profileId,
          timestamp: (new Date()).getTime(),
          value: {topology: members}
        });
      }).catch(err => this.observer.error(err));
    }
  }

  destroy(): Promise<*> {
    if (this.db.topology) {
      this.db.topology.close();
    }
    return Promise.resolve();
  }
}
