/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-18T10:29:50+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-01-03T17:02:57+11:00
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
import processItems from '~/hooks/processItems';
import config from '~/config';
import { constructors } from '../observableTypes';

const DEBOUNCE_DELAY = 500;

export default () =>
  processItems(
    (context, item) => {
      const { profileId, items, debug } = item;
      const { service } = context;
      const { observableManifests } = service;

      let observableManifest = observableManifests.get(profileId);

      if (!observableManifest) {
        l.debug(`Constructing observable manifest for profile ${profileId}...`);

        const index = new Map();
        const samplingRate = config.performancePanelSamplingRate;

        observableManifest = {
          profileId,
          wrappers: _.map(constructors, ({ path, constructor }, k) => {
            // $FlowFixMe
            const Wrapper = require(`../observables/${path}`); // eslint-disable-line import/no-dynamic-require
            const wrapper = new Wrapper();

            wrapper.id = k;
            // $FlowFixMe
            Object.defineProperty(wrapper, 'samplingRate', {
              get: () => observableManifest.samplingRate,
            });
            // $FlowFixMe
            Object.defineProperty(wrapper, 'profileId', {
              get: () => observableManifest.profileId,
            });
            // $FlowFixMe
            Object.defineProperty(wrapper, 'debug', { get: () => observableManifest.debug });
            wrapper.emitError = service.emitError.bind(service, profileId);

            if (typeof constructor === 'function') {
              constructor(wrapper);
            }

            for (const wrapperItem of wrapper.items) {
              index.set(wrapperItem, wrapper);
            }

            return wrapper;
          }),
          index,
          samplingRate,
          subscription: null,
        };
        observableManifests.set(profileId, observableManifest);
      }

      // $FlowFixMe
      observableManifest.debug = debug;
      // $FlowFixMe
      observableManifest._debouncedUpdate = _.debounce(
        service.updateObservableManifest.bind(service, observableManifest),
        DEBOUNCE_DELAY,
      );

      const ps = [];

      service.findObservableWrappers(observableManifest, {
        items,
        onMatchingItem: (item, wrapper) => {
          if (wrapper.rxObservable) {
            debug && l.debug(`Item \`${item}\` is already being observed for profile ${profileId}`);
          } else {
            l.debug(
              `Initialising observable ${
                wrapper.displayName
              } of profile ${profileId} for item \`${item}\`...`,
            );

            const { connections } = context.app.service('mongo/connection/controller');

            ps.push(wrapper.init({ mongoConnection: connections[profileId] }));
          }
        },
        onInvalidItem: item => {
          throw new Error(`No observable supports observing item \`${item}\``);
        },
      });

      return Promise.all(ps).then(result => {
        if (result.length > 0) {
          // $FlowFixMe
          observableManifest._debouncedUpdate();
        }
      });
    },
    { idAlias: 'profileId' },
  );
