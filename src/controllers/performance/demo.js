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
 * Created by joey on 8/12/17.
 */

/* eslint-disable */

global.log = {
  info: msg => console.log(msg),
  error: msg => console.error(msg),
  debug: msg => console.debug(msg),
};
global.l = global.log;

const SSHCounter = require('../../services/stats/observables/ssh/');

const sshTunnelOpts = {
  sshHost: '10.0.0.24', // ip address of the ssh server
  remoteUser: 'admin',
  srcAddr: '10.0.0.24',
  remoteHost: '10.0.0.25', // ip address of mongo db server
  remotePort: '22', // port of mongo db server
  localPort: 7000,
  localHost: '127.0.0.1',
  readyTimeout: 5000,
  forwardTimeout: 5000,
  remotePass: process.env.EC2_SHARD_CLUSTER_PASSWORD,
  sshTunnel: true,
  sshUser: 'core',
  sshPassword: process.env.EC2_SHARD_CLUSTER_PASSWORD,
};

const sshOpts = {
  sshOpts: {
    host: '10.0.0.25',
    port: 22,
    username: 'core',
    password: process.env.EC2_SHARD_CLUSTER_PASSWORD
  }
}

const counter = new SSHCounter();

counter.rxObservable.subscribe(
  x => console.log('get sub ', x),
  (e) => console.log('complete1',e)
)

counter
  .createConnection(sshOpts)
  .then((res) => {
  })
  .catch(err => {
    console.error(err);
  });

setTimeout(() => counter.samplingRate = 5, 3000);