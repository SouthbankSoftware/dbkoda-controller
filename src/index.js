/*
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

/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-06-08T18:41:03+10:00
 */

import app from './app';

const port = app.get('port');
let server = null;

if (process.env.NODE_ENV !== 'production') {
  // in non-production mode, enable source map for stack tracing
  require('source-map-support/register');
  server = app.listen(port);
} else {
  server = app.listen(port, 'localhost');
}

server.on('listening', () =>
  l.notice(`dbKoda Controller is ready at ${app.get('host')}:${port}`)
);
