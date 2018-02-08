/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-10-31T09:22:47+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-08T12:21:21+11:00
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

import app from './app';

const _port = parseInt(process.env.CONTROLLER_PORT, 10);
const port = !Number.isNaN(_port) ? _port : app.get('port');

const onUnhandledRejection = reason => {
  l.error('Unhandled rejection: ', reason);
};

const onUncaughtException = err => {
  l.error('Unhandled error: ', err);
};

const handleShutdown = err => {
  process.removeListener('unhandledRejection', onUnhandledRejection);
  process.removeListener('uncaughtException', onUncaughtException);

  // Exitpoint
  app.stop(err).then(() => {
    l.notice('Stopped dbkoda Controller');
    process.exit(err ? 1 : 0);
  });
};

app.once('ready', () => {
  // register shutting down events
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
  process.on('SIGHUP', handleShutdown);
  process.on('SIGQUIT', handleShutdown);

  process.on('unhandledRejection', onUnhandledRejection);
  process.on('uncaughtException', onUncaughtException);

  l.notice(`dbKoda Controller is ready at ${app.get('host')}:${port}`);
});
if (process.env.NODE_ENV !== 'production') {
  // in non-production mode, enable source map for stack tracing
  require('source-map-support/register');
  app.listen(port);
} else {
  app.listen(port, 'localhost');
}
