/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-12-18T10:30:13+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-16T09:42:31+11:00
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
import type { ObservableManifest } from '../';

/**
 * @return whether observableManifest should be updated
 */
export const patchSamplingRate = (
  observableManifest: ObservableManifest,
  samplingRate: number
): boolean => {
  const { profileId, debug } = observableManifest;

  if (samplingRate && samplingRate !== observableManifest.samplingRate) {
    debug &&
      l.debug(`Updating sampling rate to ${samplingRate / 1000}s for profile ${profileId}...`);
    observableManifest.samplingRate = samplingRate;

    return true;
  }

  return false;
};

export default () =>
  processItems(
    (context, item) => {
      const { profileId, samplingRate, debug } = item;
      const { service } = context;
      const { observableManifests } = service;

      const observableManifest: ObservableManifest = observableManifests.get(profileId);

      if (!observableManifest) {
        throw new errors.NotFound(`Observable manifest for profile ${profileId} doesn't exist`);
      }

      patchSamplingRate(observableManifest, samplingRate) && observableManifest._debouncedUpdate();

      if (debug !== undefined) {
        observableManifest.debug = debug;
      }
    },
    { idAlias: 'profileId' }
  );
