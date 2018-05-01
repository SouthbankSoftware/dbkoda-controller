/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-04-27T11:01:11+10:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-05-01T19:36:40+10:00
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
import raygun from 'raygun';
import path from 'path';
// $FlowFixMe
import sh from 'shelljs';
// $FlowFixMe
import Transport from 'winston-transport';
// $FlowFixMe
import { version, apiKey } from './pkginfo';

const cachePath = path.resolve(global.DBKODA_HOME, 'raygunCache/dbkoda-controller/');
sh.mkdir('-p', cachePath);

export const raygunClient = new raygun.Client().init({
  apiKey,
  isOffline: false,
  offlineStorageOptions: {
    cachePath,
    cacheLimit: 1000
  }
});

const tags = ['dbkoda-controller', IS_PRODUCTION ? 'prod' : 'dev'];

global.UAT && tags.push('uat');

raygunClient.setVersion(version);
raygunClient.setTags(tags);

export const setUser = (user: { id: string }) => {
  raygunClient.user = () => ({
    identifier: user.id,
    isAnonymous: true
  });
};

setUser({ id: 'beforeConfigLoaded' });

export const toggleRaygun = (enabled: boolean) => {
  if (enabled) {
    raygunClient.online();
  } else {
    raygunClient.offline();
  }
};

export const sendError = (
  error: Error,
  options: { customData?: *, callback?: *, request?: *, tags?: * }
) => {
  const { customData, callback, request, tags } = options || {};

  raygunClient.send(error, customData, callback, request, tags);
};

const raygunErrorMessages = {
  '5XX': 'Internal server error',
  '403': 'Over subscription plan limits',
  '401': 'Invalid API key'
};

// $FlowFixMe
console._error = console.error;

export class RaygunTransport extends Transport {
  log(info: *, callback: *) {
    const { error, customData, callback: cb, request, tags } = info;

    if (!error || process.env.NODE_ENV === 'test') {
      callback && callback();
      cb && cb();
      return;
    }

    sendError(error, {
      customData,
      callback: (res: *) => {
        const code = res.statusCode > 499 ? '5XX' : res.statusCode;
        const errMsg = raygunErrorMessages[code];

        if (errMsg) {
          // $FlowFixMe
          console._error(new Error(`RaygunTransport: [${code}] ${errMsg}`));
          callback && callback();
          cb && cb(res);
          return;
        }

        this.emit('logged');
        callback && callback();
        cb && cb(res);
      },
      request,
      tags
    });
  }
}

// by default crash process
let exitOnUnhandledError = process.env.NODE_ENV !== 'test';

const onUnhandledRejection = reason => {
  l.error('Unhandled rejection: ', reason instanceof Error ? reason : new Error(String(reason)), {
    // $FlowFixMe
    [Symbol.for('info')]: {
      tags: ['unhandled rejection'],
      callback: exitOnUnhandledError ? () => process.exit(1) : null
    }
  });
};

const onUncaughtException = err => {
  l.error('Unhandled exception: ', err, {
    // $FlowFixMe
    [Symbol.for('info')]: {
      tags: ['unhandled exception'],
      callback: exitOnUnhandledError ? () => process.exit(1) : null
    }
  });
};

process.on('unhandledRejection', onUnhandledRejection);
process.on('uncaughtException', onUncaughtException);

export const setExitOnUnhandledError = (value: boolean) => {
  exitOnUnhandledError = value;
};
