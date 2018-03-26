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
 * Created by joey on 30/6/17.
 */


const errors = require('feathers-errors');

export const Errors = {
  ConnectSlaveOk: (e) => {
    return new errors.FeathersError(e.errmsg, 'SlaveOk', e.code, 'slave-ok');
  }
};

export const ErrorCodes = {
  PERFORMANCE_LIMIT_MONGOS: 'PERFORMANCE_LIMIT_MONGOS',
  PERFORMANCE_LIMIT_ENGINE: 'PERFORMANCE_LIMIT_ENGINE',
  MONGO_CONNECTION_CLOSED: 'MONGO_CONNECTION_CLOSED',
  MONGO_RECONNECTING: 'MONGO_RECONNECTING',
  SSH_CONNECTION_CLOSED: 'SSH_CONNECTION_CLOSED',
  SSH_RECONNECTING: 'SSH_RECONNECTING',
  SSH_NOT_ENABLED: 'SSH_NOT_ENABLED',
};

