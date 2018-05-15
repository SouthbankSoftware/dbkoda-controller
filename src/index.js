/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2017-10-31T09:22:47+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-05-07T18:03:51+10:00
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
import app from './app';
import { toggleRaygun, setUser, setExitOnUnhandledError } from './helpers/raygun';

const _port = parseInt(process.env.CONTROLLER_PORT, 10);
const port = !Number.isNaN(_port) ? _port : app.get('port');

const closeConnections = () => {
  l.info('remove connections.');
  const ctr = app.service('mongo/connection/controller');
  const { connections } = ctr;
  if (connections) {
    _.keys(connections).forEach(conn => ctr.remove(conn));
  }
};

const handleShutdown = err => {
  l.info('controller exit');
  // crash controller if unhandled error happens during shutting down phase
  setExitOnUnhandledError(true);
  closeConnections();

  // Exitpoint
  app
    .stop(err)
    .catch(stopErr => {
      l.error(stopErr);

      if (!err) {
        err = stopErr;
      }
    })
    .then(() => {
      l.notice('Stopped dbkoda Controller');
      process.exit(err ? 1 : 0);
    });
};

const addShutdownHander = () => {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'];
  signals.forEach(s => process.removeAllListeners(s));
  signals.forEach(s => process.on(s, handleShutdown));
};

global.addShutdownHander = addShutdownHander;

app.once('ready', () => {
  // don't crash controller if unhandled error happens during runtime
  setExitOnUnhandledError(false);

  setUser(_.get(global.config, 'user'));
  toggleRaygun(_.get(global.config, 'telemetryEnabled'));

  app.service('config').on('changed', changed => {
    if (_.has(changed, 'user.id')) {
      setUser(_.get(global.config, 'user'));
    }

    if (_.has(changed, 'telemetryEnabled')) {
      toggleRaygun(_.get(global.config, 'telemetryEnabled'));
    }
  });

  addShutdownHander();
  l.notice(`dbKoda Controller is ready at ${app.get('host')}:${port}`);
});

if (process.env.NODE_ENV !== 'production') {
  // in non-production mode, enable source map for stack tracing
  require('source-map-support/register');
  app.listen(port);
} else {
  app.listen(port, 'localhost');
}
