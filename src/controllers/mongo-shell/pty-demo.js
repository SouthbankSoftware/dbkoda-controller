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

import winston from 'winston';

const commonOptions = {
  colorize: 'all',
};

const transports = [new winston.transports.Console(commonOptions)];
global.l = new winston.Logger({
  level: global.IS_PROD ? 'info' : 'debug',
  padLevels: true,
  levels: {
    error: 0,
    warn: 1,
    notice: 2,
    info: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    notice: 'green',
    info: 'black',
    debug: 'blue'
  },
  transports
});
global.log = global.l;
log.debug('create shell');
const MongoShell = require('./index').MongoShell;

const shell = new MongoShell({url:'mongodb://localhost'});
shell.getShellVersion();
shell.createShell();

shell.on(MongoShell.INITIALIZED, () => {
  // shell.write('show dbs');
});

shell.on(MongoShell.OUTPUT_EVENT, (data) => {
  process.stdout.write(data, 'utf8');
});

shell.on(MongoShell.AUTO_COMPLETE_END, (data) => {
  process.stdout.write('AUTO_COMPLETE_END:' + data);
});

shell.on(MongoShell.EXECUTE_END, () => {
  process.stdout.write('command execution ended.');
});

setTimeout(() => {
  // shell.writeAutoComplete('shellAutocomplete(\'db.\');__autocomplete__\n');
  shell.write('db.getSiblingDB("city").inspections.find(');
}, 2000);

// const shell = spawn('mongo');
// const parser = new Parser();
// shell.on('data', parser.onRead);
//
// shell.write('show dbs\r');
