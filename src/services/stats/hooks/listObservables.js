/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-18T10:31:05+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-01-03T17:04:32+11:00
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
// $FlowFixMe
import errors from 'feathers-errors';
import processItems from '~/hooks/processItems';

const listObservableWrapper = observableWrapper => {
  const result = _.pick(observableWrapper, ['id', 'rxObservable', 'displayName', 'items']);

  result.rxObservable = result.rxObservable ? 'active' : null;

  return result;
};

const listObservableManifest = (observableManifest, context, item) => {
  const { items, active } = item;
  const { service } = context;
  const result = _.omit(observableManifest, ['index', '_debouncedUpdate']);

  const wrappers = service.findObservableWrappers(observableManifest, { items, active });

  result.wrappers = wrappers.map(listObservableWrapper);
  result.subscription = result.subscription ? 'active' : null;

  return result;
};

export default () =>
  processItems(
    (context, item) => {
      const { profileId } = item;

      if (profileId) {
        const observableManifest = context.service.observableManifests.get(profileId);

        if (!observableManifest) {
          throw new errors.NotFound(`Observable manifest for profile ${profileId} doesn't exist`);
        }

        return listObservableManifest(observableManifest, context, item);
      }

      const result = [];

      for (const observableManifest of context.service.observableManifests.values()) {
        result.push(listObservableManifest(observableManifest, context, item));
      }

      return result;
    },
    { idAlias: 'profileId' },
  );
