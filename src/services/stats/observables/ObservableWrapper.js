/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:50:05+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-04-24T16:24:23+10:00
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

import type { Observable } from 'rxjs';
import MongoConnection from '~/controllers/mongo-connection/connection';

export type ObservaleValue = {
  profileId: UUID,
  timestamp: number,
  stats?: { [string]: any },
  value: { [string]: any },
  ignoreStats?: boolean
};

export interface ObservableWrapper {
  /**---------------------
   * Managed by Controller
   *----------------------*/
  /**
   * Id of this observable wrapper instance
   */
  id: string;
  /**
   * Sampling rate, number of milliseconds between samples
   *
   * READ ONLY
   */
  samplingRate: number;
  /**
   * Profile Id this observable wrapper belongs to
   *
   * READ ONLY
   */
  profileId: UUID;
  /**
   * Whether to print out debug message
   *
   * READ ONLY
   */
  debug: boolean;
  /**
   * Emit error to user without finalising underlie RxJs Observable of this wrapper instance
   */
  emitError: (error: string, level: 'warn' | 'error') => void;

  /**--------------
   * Managed by You
   *---------------*/
  /**
   * Underlie RxJs Observable instance
   */
  rxObservable: ?Observable<ObservaleValue>;
  /**
   * Name of this observable wrapper instance for displaying purpose
   */
  displayName: string;
  /**
   * List of keys that this observable wrapper instance supports
   */
  items: string[];
  /* Initialise rxObservable for current observable wrapper instance. `rxObservable` should be set
   * after this
   */
  init(options: {
    mongoConnection: MongoConnection
  }): Promise<*>;
  /**
   * Destroy rxObservable for current observable wrapper instance. Any created resources should be
   * recyled. `rxObservable` should be set back to `null`
   */
  destroy(): Promise<*>;
}
