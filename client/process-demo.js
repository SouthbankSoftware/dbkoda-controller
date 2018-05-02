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
 * Created by joey on 14/8/17.
 */

const { spawn } = require('node-pty');

const handleShutdown = (e, n) => {
  console.log('exit', e, n);
  process.exit(e);
};
// process.on('exit', handleShutdown);
// process.on('SIGINT', handleShutdown);
// process.on('SIGHUP', handleShutdown);
const p = spawn('mongo', ['mongodb://localhost:27017/admin']);
p.on('data', d => console.log(d));
p.write('show dbs\n');
process.on('exit', handleShutdown);
process.on('SIGINT', handleShutdown);
process.on('SIGHUP', handleShutdown);

// process.on('SIGTERM', handleShutdown);
// process.on('SIGHUP', handleShutdown);
// process.on('SIGQUIT', handleShutdown);
// p.on('exit', () => {
//   console.log('exit from shell');
// });

// p.write('show dbs\n');
// p.on('data', d => console.log(d));
