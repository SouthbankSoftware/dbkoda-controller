/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:17:22+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-12T16:42:10+11:00
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

/* eslint-disable class-methods-use-this */

// $FlowFixMe
import errors from 'feathers-errors';
import { Observable } from 'rxjs';
import type { Subscription } from 'rxjs';
import _ from 'lodash';
import path from 'path';
import type { ObservaleValue, ObservableWrapper } from './observables/ObservableWrapper';
import Transformer from './transformers/Transformer';
import hooks from './hooks';

export type ObservableManifest = {
  profileId: UUID,
  profileAlias: string,
  wrappers: ObservableWrapper[],
  // key: item
  index: Map<string, ObservableWrapper>,
  samplingRate: number,
  subscription: ?Subscription,
  transformers: Transformer[],
  debug: boolean,
  _debouncedUpdate: () => void
};

const SAMPLING_RATE_TOLERANCE = 0.5; // wait maximally 50% of sampling rate in each time window
const LOG_PATH = 'performance_%DATE%.log';
const ALARM_THRESHOLDS_PATH = path.resolve(global.DBKODA_HOME, 'alarmThresholds.json');

const handleError = err => l.error(err, err.errors);
const replacer = (key, value) => (key === 'debugData' ? undefined : value);
const stringifyAlarm = alarm => JSON.stringify(alarm, replacer, 2);

export class Stats {
  // key: profileId
  observableManifests: Map<UUID, ObservableManifest>;
  events: string[];
  loggerService: *;
  fileService: *;
  _fileServiceDisposer: *;
  alarmConfig: * = {};

  constructor(_options: *) {
    this.events = ['data', 'error'];
  }

  setup(app: *) {
    this.observableManifests = new Map();
    this.loggerService = app.service('/loggers');
    this.loggerService
      .create({
        path: LOG_PATH,
        debug: false
      })
      .catch(handleError);

    this.fileService = app.service('/files');
    const loadAlarmThresholds = (watching = false, handle404 = false) => {
      this.fileService
        .get(ALARM_THRESHOLDS_PATH, {
          query: {
            watching: 'true' // this should always to be true
          }
        })
        .then(({ content }) => {
          _.assign(this.alarmConfig, JSON.parse(content));
          l.debug(`Loaded alarm thresholds from ${ALARM_THRESHOLDS_PATH}`);

          if (watching) {
            this._fileServiceDisposer && this._fileServiceDisposer();

            const handleChanged = () => loadAlarmThresholds(false, false);

            this.fileService.on('changed', handleChanged);

            this._fileServiceDisposer = () => {
              this.fileService.removeListener('changed', handleChanged);
              // unwatch
              return this.fileService
                .patch(ALARM_THRESHOLDS_PATH, {
                  watching: false
                })
                .catch(handleError);
            };
          }
        })
        .catch(err => {
          if (handle404 && err.code === 404) {
            return this.fileService
              .get(path.resolve(__dirname, 'transformers/defaultAlarmThresholds.json'), {
                query: {
                  copyTo: ALARM_THRESHOLDS_PATH,
                  watching: 'false'
                }
              })
              .then(() => {
                loadAlarmThresholds(true, false);
              })
              .catch(handleError);
          }

          handleError(err);
        });
    };
    loadAlarmThresholds(true, true);
  }

  destroy() {
    const ps = [];

    ps.push(this.loggerService.remove(LOG_PATH).catch(handleError));
    if (this._fileServiceDisposer) {
      ps.push(this._fileServiceDisposer());
      this._fileServiceDisposer = null;
    }

    return Promise.all(ps);
  }

  emitError(profileId: string, error: Error | string, level: 'warn' | 'error' = 'error') {
    // $FlowFixMe
    this.emit('error', {
      profileId,
      payload: { error: error instanceof Error ? error.message : error, level }
    });
  }

  countActiveObservableWrappers(observableManifest: ObservableManifest): number {
    const { wrappers } = observableManifest;

    let count = 0;

    for (const wrapper of wrappers) {
      if (wrapper.rxObservable) {
        count += 1;
      }
    }

    return count;
  }

  areActiveObservableWrappersReady(observableManifest: ObservableManifest): boolean {
    const { wrappers } = observableManifest;

    for (const wrapper of wrappers) {
      const { rxObservable } = wrapper;

      if (rxObservable && !(rxObservable instanceof Observable)) {
        return false;
      }
    }

    return true;
  }

  findObservableWrappers(
    observableManifest: ObservableManifest,
    options?: {
      items?: *,
      onMatchingItem?: (item: *, wrapper: *) => void,
      onInvalidItem?: (item: *) => void,
      active?: boolean
    }
  ): ObservableWrapper[] {
    const { wrappers, index } = observableManifest;
    const { items, onMatchingItem, onInvalidItem, active } = options || {};

    if (items) {
      const resultWrappers = new Set();

      for (const queryItem of items) {
        const wrapper = index.get(queryItem);

        if (wrapper) {
          if (active !== undefined) {
            if ((active && !wrapper.rxObservable) || (!active && wrapper.rxObservable)) {
              continue;
            }
          }

          if (!resultWrappers.has(wrapper)) {
            typeof onMatchingItem === 'function' && onMatchingItem(queryItem, wrapper);
            resultWrappers.add(wrapper);
          }
        } else {
          typeof onInvalidItem === 'function' && onInvalidItem(queryItem);
        }
      }

      return [...resultWrappers.values()];
    }

    return active === undefined
      ? wrappers
      : wrappers.filter(
          wrapper => (active && wrapper.rxObservable) || (!active && !wrapper.rxObservable)
        );
  }

  destroyObservableWrapper(wrapper: ObservableWrapper): Promise<*> {
    return wrapper.rxObservable
      ? wrapper
          .destroy()
          .then(() => {
            wrapper.rxObservable = null;
          })
          .catch(err => {
            l.error(
              `Error happened when trying to destroy observable ${wrapper.displayName} of profile ${
                wrapper.profileId
              }`,
              err
            );
            this.emitError(wrapper.profileId, err.message);

            wrapper.rxObservable = null;
          })
      : Promise.resolve();
  }

  stopObservableManifest(observableManifest: ObservableManifest) {
    if (observableManifest.subscription) {
      observableManifest.subscription.unsubscribe();
      observableManifest.subscription = null;
    }
  }

  updateObservableManifest(observableManifest: ObservableManifest) {
    if (!this.areActiveObservableWrappersReady(observableManifest)) return;

    const { profileId, profileAlias, wrappers, samplingRate } = observableManifest;

    l.debug(`Updating observable manifest for profile ${profileId}...`);

    this.stopObservableManifest(observableManifest);

    // $FlowFixMe
    const rxObservables: Observable<ObservaleValue>[] = wrappers.reduce((acc, v) => {
      const { rxObservable } = v;

      if (rxObservable) {
        // $FlowFixMe
        acc.push(rxObservable);
      }

      return acc;
    }, []);

    const tolerance = samplingRate * SAMPLING_RATE_TOLERANCE;

    observableManifest.subscription = Observable.merge(...rxObservables)
      .buffer(Observable.timer(tolerance, samplingRate))
      .map((values: ObservaleValue[]) =>
        values.reduce(
          (acc, v) => {
            _.assign(acc.value, v.value);
            return acc;
          },
          {
            profileId,
            timestamp: Date.now() - tolerance,
            value: {}
          }
        )
      )
      .map((value: ObservaleValue) =>
        _.reduce(observableManifest.transformers, (acc, v) => v.transform(acc), value)
      )
      .subscribe({
        next: v => {
          if (observableManifest.debug) {
            l.debug(`Stats: ${JSON.stringify(v)}`);
          }

          // log alarms
          const { value: { alarm }, timestamp } = v;
          alarm &&
            this.loggerService
              .patch(LOG_PATH, {
                content: {
                  message: `Alarm for profile ${profileAlias} (${profileId}): ${stringifyAlarm(
                    alarm
                  )}`,
                  timestamp
                }
              })
              .catch(handleError);

          // $FlowFixMe
          this.emit('data', {
            profileId,
            payload: _.pick(v, ['timestamp', 'value', 'stats'])
          });
        },
        error: err => {
          for (const wrapper of wrappers) {
            this.destroyObservableWrapper(wrapper);
          }

          observableManifest.subscription = null;

          l.error(`Fatal error happened during observable execution of profile ${profileId}`, err);
          this.emitError(profileId, err.message);
        },
        complete: () => {
          for (const wrapper of wrappers) {
            this.destroyObservableWrapper(wrapper);
          }

          observableManifest.subscription = null;

          const message = `Observable execution of profile ${profileId} reached a completion state`;
          l.warn(message);
          this.emitError(profileId, message, 'warn');
        }
      });
  }

  find(_params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  get(_id: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  create(_data: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  update(_id: *, _data: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  patch(_id: *, _data: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }

  remove(_id: *, _params: *) {
    throw new errors.NotImplemented('Request should have been processed by hooks');
  }
}

/** @ignore */
export default function() {
  const app = this;

  // Initialize our service with any options it requires
  app.use('/stats', new Stats());

  // Get our initialize service to that we can bind hooks
  const service = app.service('/stats');

  // Set up our before hooks
  service.before(hooks.before);

  // Set up our after hooks
  service.after(hooks.after);
}
