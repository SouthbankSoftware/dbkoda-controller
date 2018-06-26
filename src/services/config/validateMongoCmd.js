/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-06-21T16:18:05+10:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-06-26T17:01:51+10:00
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
import compareVersions from 'compare-versions';
import { MongoConfigError } from '~/errors';
import { configDefaults } from './configSchema';
import getMongoShellVersion, { UNKNOWN } from './getMongoShellVersion';
import doesDockerTargetExist from './doesDockerTargetExist';
import validateDockerTarget from './validateDockerTarget';

const MIN_SUPPORTED_VERSION = '3.0';

export default async (mongoConfig: typeof configDefaults.mongo): Promise<string> => {
  const { dockerized, docker } = mongoConfig;

  if (dockerized) {
    const { cmd } = docker;

    if (!cmd) {
      throw new MongoConfigError('Failed to validate Mongo cmd', {
        errors: {
          'config.mongo.docker.cmd': 'must be provided'
        }
      });
    }

    const { type, target } = validateDockerTarget(docker);
    let isOkay = false;

    try {
      isOkay = await doesDockerTargetExist(cmd, type, target);
    } catch (err) {
      l.error('Cannot check Docker target', err);

      throw new MongoConfigError('Failed to validate Mongo cmd', {
        errors: {
          'config.mongo.docker.cmd': `cannot check Docker target: ${err.message}`
        }
      });
    }

    if (!isOkay) {
      if (type === 'image') {
        throw new MongoConfigError('Failed to validate Mongo cmd', {
          errors: {
            'config.mongo.docker.imageName':
              "the Docker image doesn't exist. Please make sure it is pulled"
          }
        });
      } else {
        throw new MongoConfigError('Failed to validate Mongo cmd', {
          errors: {
            'config.mongo.docker.containerId':
              'please make sure the Docker container exists and is running'
          }
        });
      }
    }
  }

  const { cmd, versionCmd } = mongoConfig;

  if (!cmd || !versionCmd) {
    throw new MongoConfigError('Failed to validate Mongo cmd', {
      errors: {
        'config.mongo.cmd': 'must be provided'
      }
    });
  }

  let version;

  try {
    version = getMongoShellVersion(versionCmd);
  } catch (err) {
    l.error('Cannot detect Mongo shell version', err);

    throw new MongoConfigError('Failed to validate Mongo cmd', {
      errors: {
        'config.mongo.cmd': `cannot detect Mongo shell version: ${err.message}`
      }
    });
  }

  if (version === UNKNOWN) {
    throw new MongoConfigError('Failed to validate Mongo cmd', {
      errors: {
        'config.mongo.cmd': 'cannot detect Mongo shell version. Please check related configs'
      }
    });
  }

  if (compareVersions(version, MIN_SUPPORTED_VERSION) < 0) {
    throw new MongoConfigError('Failed to validate Mongo cmd', {
      errors: {
        'config.mongo.cmd': `Mongo shell version must be >= ${MIN_SUPPORTED_VERSION}`
      }
    });
  }

  return version;
};
