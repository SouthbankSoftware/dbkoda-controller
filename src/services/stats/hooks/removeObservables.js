/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-18T10:30:35+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-13T17:59:08+11:00
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

import processItems from '~/hooks/processItems';
// $FlowFixMe
import errors from 'feathers-errors';

export default () =>
  processItems(
    (context, item) => {
      const { profileId, items } = item;
      const { service } = context;
      const { observableManifests } = service;

      const observableManifest = observableManifests.get(profileId);

      if (!observableManifest) {
        throw new errors.NotFound(`Observable manifest for profile ${profileId} doesn't exist`);
      }

      const activeWrappers = service.findObservableWrappers(observableManifest, {
        items,
        active: true
      });

      let p;

      if (activeWrappers.length > 0) {
        service.stopObservableManifest(observableManifest);

        p = Promise.all(
          activeWrappers.map((wrapper) => {
            l.debug(`Removing observable ${wrapper.displayName} of profile ${profileId}...`);

            return service.destroyObservableWrapper(wrapper);
          })
        );
      } else {
        p = Promise.resolve();
      }

      return p.then(() => {
        if (service.countActiveObservableWrappers(observableManifest) === 0) {
          if (observableManifests.has(profileId)) {
            l.debug(`Removing observable manifest for profile ${profileId}...`);

            observableManifest._debouncedUpdate.cancel();

            observableManifests.delete(profileId);
          }
        } else {
          observableManifest._debouncedUpdate();
        }
      });
    },
    { idAlias: 'profileId' }
  );
