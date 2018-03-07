/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-05T15:35:16+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-07T01:04:27+11:00
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
import _ from 'lodash';

export default () =>
  processItems(
    (context, item) => {
      const { path, content, debug } = item;
      const { loggers, consoleTransport } = context.service;
      const logger = loggers.get(path);

      if (!logger) {
        throw new errors.NotFound(`Logger ${path} doesn't exist`);
      }

      if (debug != null) {
        if (debug) {
          if (!_.includes(logger.transports, consoleTransport)) {
            logger.add(consoleTransport);
          }
        } else {
          logger.remove(consoleTransport);
        }
      }

      content && logger.log(content);
    },
    { idAlias: 'path' }
  );
