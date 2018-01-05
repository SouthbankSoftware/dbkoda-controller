/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-12T11:44:18+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-01-04T12:13:58+11:00
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

import _ from 'lodash';
import { ObservableWrapper } from './observables/ObservableWrapper';

/**
 * Customised constructors for ObservableWrappers defined in `observables`
 *
 * [TYPE_NAME]: {
 *   path: TYPE_DEFINITION_PATH, // related to `observables` directory
 *   constructor: (wrapper: ObservableWrapper): void | null // Customised constructor to override
 *                                                          // default settings
 * }
 */
export const constructors = {
  ssh: {
    path: 'ssh',
  },
  topology: {
    path: 'topology',
  },
  driver: {
    path: 'driver',
  },
  dummy1: {
    path: 'dummy',
    // can be null
    constructor: (wrapper: ObservableWrapper) => {
      wrapper.displayName = 'Dummy 1';
      wrapper.items = ['item-1', 'item-2', 'item-3'];
    },
  },
  dummy2: {
    path: 'dummy',
    constructor: (wrapper: ObservableWrapper) => {
      wrapper.displayName = 'Dummy 2';
      wrapper.items = ['item-4', 'item-5'];
    },
  },
  dummy3: {
    path: 'dummy',
    constructor: (wrapper: ObservableWrapper) => {
      wrapper.displayName = 'Dummy 3';
      // $FlowFixMe
      wrapper.simulateWarnAt = 10000;
      // $FlowFixMe
      wrapper.simulateErrorAt = 30000;
      // $FlowFixMe
      // wrapper.simulateFatalErrorAt = 60000;
      wrapper.items = ['item-6'];
    },
  },
  dummy4: {
    path: 'dummy',
    constructor: (wrapper: ObservableWrapper) => {
      wrapper.displayName = 'Dummy 4';
      wrapper.items = ['item-7', 'item-8', 'item-9', 'item-10'];
    },
  },
  dummy5: {
    path: 'dummy',
    constructor: (wrapper: ObservableWrapper) => {
      wrapper.displayName = 'Dummy 5';
      // $FlowFixMe
      wrapper.simulateCompletionAt = 40000;
      wrapper.items = ['item-10'];
    },
  },
};

export default _.reduce(
  constructors,
  (acc, _v, k) => {
    acc[k] = k;
    return acc;
  },
  {},
);
