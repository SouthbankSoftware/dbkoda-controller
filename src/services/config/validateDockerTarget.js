/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-06-25T16:41:27+10:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-25T19:59:54+10:00
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

import { MongoConfigError } from '~/errors';
import { configDefaults } from './configSchema';

export default (
  dockerConfig: typeof configDefaults.mongo.docker
): { type: 'image' | 'container', target: string } => {
  const { createNew, imageName, containerId } = dockerConfig;

  if (createNew) {
    if (typeof imageName !== 'string' || imageName.length === 0) {
      throw new MongoConfigError('Failed to validate Docker target', {
        errors: {
          'config.mongo.docker.imageName':
            'must be provided when config.mongo.docker.createNew === true'
        }
      });
    } else {
      return { type: 'image', target: imageName };
    }
  } else if (typeof containerId !== 'string' || containerId.length === 0) {
    throw new MongoConfigError('Failed to validate Docker target', {
      errors: {
        'config.mongo.docker.containerId':
          'must be provided when config.mongo.docker.createNew === false'
      }
    });
  }

  return { type: 'container', target: containerId };
};
