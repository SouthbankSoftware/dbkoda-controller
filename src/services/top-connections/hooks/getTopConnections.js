/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-26T10:52:34+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-26T13:40:00+11:00
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

// $FlowFixMe
import errors from 'feathers-errors';
import processItems from '~/hooks/processItems';
// $FlowFixMe
import decache from 'decache';

export default () =>
  processItems(
    (context, item) => {
      const { profileId, n, samplingTime, samplingRate, dev } = item;
      const { service, app } = context;
      const connection = app.service('mongo/connection/controller').connections[profileId];

      if (!connection) {
        throw new errors.NotFound(`Connection for profile ${profileId} doesn't exist`);
      }

      // during dev, remove cached `sampleConnections.js` so it can be hot-reloaded :)
      if (dev) decache('../sampleConnections.js');

      const sampleConnections = require('../sampleConnections.js');
      // $FlowFixMe
      return sampleConnections({
        profileId,
        n,
        samplingTime,
        samplingRate,
        dev,
        service,
        connection
      });
    },
    { idAlias: 'profileId' }
  );
