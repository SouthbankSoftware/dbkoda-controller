/**
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-15T15:20:58+11:00
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
import _ from 'lodash';

import type {ObservaleValue} from '../ObservableWrapper';
import {ObservableWrapper} from '../ObservableWrapper';
import {driverItems, getKnowledgeBaseRules} from '../../knowledgeBase/driver';
import {ErrorCodes} from '../../../../errors/Errors';
import ConnectionListener, {
  EVENT_NAME,
} from '../../../../controllers/mongo-connection/connection-listener';
import Status from '../../../../controllers/mongo-connection/status';

const MAX_HISTORY_SIZE = 720;

export default class MongoNativeDriver implements ObservableWrapper {
  rxObservable: ?Observable<ObservaleValue> = null;
  type: string = 'Unknown';
  observer: Observer<ObservaleValue>;
  profileId: string;
  mongoConnection: Object;
  db: Object;
  samplingRate: number;
  items: string[] = driverItems;
  displayName: string = 'Server Status';
  knowledgeBase: Object;
  previousData: Object = {};
  statsIntervalId: number;
  storageIntervalId: number;
  historyData: Object = {};
  commandStatus: Object = {db_storage: true, others: true};
  linstene: Object;

  init(options: Object): Promise<*> {
    this.mongoConnection = options.mongoConnection;

    // pre-check
    const {connectionParameters: {mongoType}, driver} = this.mongoConnection;
    this.db = driver;

    this.listener = new ConnectionListener(this.profileId);
    this.listener.addListeners(this.db);
    this.listener.on(EVENT_NAME, this.stateChanged.bind(this));

    if (mongoType === 'Mongos') {
      this.emitError(
        // 'Creating Performance Panel on mongos and only minimal statistics is available',
        {code: ErrorCodes.PERFORMANCE_LIMIT_MONGOS},
        'warn'
      );
    } else {
      const adminDb = this.db.admin();

      adminDb &&
        adminDb
          .serverStatus()
          .then(res => {
            const storageEngine = _.get(res, 'storageEngine.name');

            if (storageEngine !== 'wiredTiger') {
              this.emitError(
                {
                  code: ErrorCodes.PERFORMANCE_LIMIT_ENGINE,
                  message: storageEngine,
                },
                // `Creating Performance Panel on storage engine \`${storageEngine}\`. At the moment, only diagnostics on \`wiredTiger\` is supported`,
                'warn'
              );
            }
          })
          .catch(err => {
            l.error(err);
          });
    }

    this.rxObservable = Observable.create(
      (observer: Observer<ObservaleValue>) => {
        this.observer = observer;
        this.commandStatus.others = true;
        this.commandStatus.db_storage = true;
        this.start(this.db);
        return () => {
          this.pause();
        };
      }
    );
    return Promise.resolve();
  }

  stateChanged(e) {
    l.debug(e);
    switch (e.status) {
      case Status.OPEN:
        // reconnect
        this.start(this.db);
        break;
      case Status.CLOSED:
        this.pause();
        break;
      default:
    }
  }

  /**
   * start listening on topology change
   */
  start(db: Object) {
    if (!db) {
      this.emitError('failed to find mongodb driver.');
      return;
    }
    this.startServerStatus(db);
    this.startDBStorage(db);
    this.statsIntervalId = setInterval(
      () => this.startServerStatus(db),
      this.samplingRate
    );
    this.storageIntervalId = setInterval(
      () => this.startDBStorage(db),
      this.samplingRate * 3
    );
  }

  startServerStatus(db) {
    if (this.commandStatus.others) {
      db.command({serverStatus: 1}, {}, (err, data) => {
        if (!err) {
          this.knowledgeBase = getKnowledgeBaseRules({
            version: data.version,
            release: data.process,
          });
          if (!this.knowledgeBase) {
            return Promise.reject('Cant find knowledge base');
          }
          this.postProcess(data, 'others');
        } else {
          log.error('cant run serverStatus command through driver.', err);
          this.emitError('cant run serverStatus command through driver.');
          this.commandStatus.others = false;
        }
      });
    }
  }

  startDBStorage(db) {
    if (this.commandStatus.db_storage) {
      db
        .admin()
        .listDatabases()
        .then(dbList => {
          return Promise.all(
            dbList.databases.map(database => {
              return db.db(database.name).stats();
            })
          );
        })
        .then(dbStats => {
          l.debug('db stats', dbStats);
          this.postProcess(dbStats, 'db_storage');
        })
        .catch(err => {
          l.error(err);
          this.emitError(err);
          this.commandStatus.db_storage = false;
        });
    }
  }

  postProcess(data: Object, key: string): void {
    if (!this.knowledgeBase) {
      return;
    }
    const value = this.knowledgeBase.parse(
      data,
      this.previousData[key],
      data.version,
      this.samplingRate,
      key
    );
    // l.debug('get driver stats from knowledge:', value);
    this.previousData[key] = data;
    if (_.isEmpty(value)) {
      // the first time is not parsing
      return;
    }
    if (!this.historyData[key]) {
      this.historyData[key] = [];
    }
    this.historyData[key].push(value);
    if (this.historyData[key].length > MAX_HISTORY_SIZE) {
      this.historyData[key].splice(
        0,
        MAX_HISTORY_SIZE - this.historyData[key].length + 1
      );
    }
    this.observer.next({
      profileId: this.profileId,
      timestamp: new Date().getTime(),
      value,
    });
  }

  pause() {
    clearInterval(this.storageIntervalId);
    clearInterval(this.statsIntervalId);
  }

  destroy(): Promise<*> {
    this.pause();
    this.rxObservable = null;
    this.previousData = {};
    this.historyData = {};
    this.listener.removeListeners();
    return Promise.resolve();
  }
}
