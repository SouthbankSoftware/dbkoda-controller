/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-09-22T10:56:04+10:00
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

import mongoStopExecution from './mongo-stop-execution';
import mongoConnectionController from '../controllers/mongo-connection';
import mongoInspectorController from '../controllers/inspector';
import mongoAutoCompleteController from '../controllers/auto-complete';
import lintingController from '../controllers/linter';
import syncExecutionController from '../controllers/sync-execution';
import mongoShell from './mongo-shell';
import mongoConnection from './mongo-connection';
import mongoInspector from './mongo-inspector';
import mongoReconnect from './mongo-reconnect';
import autoComplete from './mongo-auto-complete';
import linter from './linter';
import syncExecution from './mongo-sync-execution';
import file from './file';
import aggregator from './aggregator';
import blog from './blog';
import treeAction from './tree-actions';
import osCommandsService from './os-commands';
import supportBundleService from './support-bundle';
import driverService from './driver';

module.exports = function() {
  const app = this;

  app.configure(mongoInspectorController);
  app.configure(mongoConnectionController);
  app.configure(mongoAutoCompleteController);
  app.configure(lintingController);
  app.configure(syncExecutionController);


  app.configure(mongoShell);
  app.configure(mongoConnection);
  app.configure(mongoInspector);
  app.configure(mongoReconnect);
  app.configure(autoComplete);
  app.configure(linter);
  app.configure(mongoStopExecution);
  app.configure(syncExecution);
  app.configure(file);
  app.configure(aggregator);
  app.configure(blog);
  app.configure(treeAction);
  app.configure(osCommandsService);
  app.configure(supportBundleService);
  app.configure(driverService);


  // console.log('IS_JAVA', global.IS_JAVA);
  // if (global.IS_JAVA) {
  //   const drill = require('./drill');
  //   app.configure(drill);
  // }

  if (process.env.NODE_ENV !== 'production') {
    const monitor = require('./monitor');
    app.configure(monitor);
  }
};
