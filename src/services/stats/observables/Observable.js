/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:50:05+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2017-12-13T10:28:38+11:00
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

/* eslint-disable */

import MongoConnection from '~/controllers/mongo-connection/connection';

export type ObservaleValue = {
  profileId: UUID,
  timestamp: number,
  value: { [string]: any },
};

export interface Observable {
  /**
   * Underlie RxJs Observable instance
   *
   * You should manage it
   */
  rxObservable: rxjs$Observable<ObservaleValue>;
  /**
   * Name of this observable type for displaying purpose
   *
   * You should manage it
   */
  displayName: string;
  /**
   * Sampling rate, number of milliseconds between samples
   *
   * You can define your own ES6 setter if you want to execute extra logic whenever sampling rate
   * is changed:
   * ```
   *   set samplingRate(rate: number) {
   *     ...
   *   }
   * ```
   *
   * Controller will provide and manage it
   */
  samplingRate: number;
  /**
   * List of keys that this observable type supports
   *
   * You should manage it
   */
  items: string[];
  /* Initialise current observable. `rxObservable` should be created after this */
  init(profileId: UUID, options: { mongoConnection: MongoConnection }): void;
  /**
   * Destroy current observable. Any created resources should be recyled. `rxObservable` should be
   * set back to `null`
   */
  destroy(): void;
}
