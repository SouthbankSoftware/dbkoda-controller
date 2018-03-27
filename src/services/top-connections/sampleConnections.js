/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-26T11:22:44+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-27T10:22:59+11:00
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
import util from 'util';
import moment from 'moment';

export default (options: {
  profileId: UUID,
  n: number,
  samplingTime: number,
  samplingRate: number,
  dev: boolean,
  service: *,
  connection: *
}) => {
  const { profileId, n, samplingTime, samplingRate, dev, service, connection } = options;
  const { driver } = connection;
  const adminDb = driver.admin();
  let startTime;
  let intervalId;
  let timeoutId;
  const connections = {};

  const cleanup = () => {
    clearInterval(intervalId);
    clearTimeout(timeoutId);
  };

  const handleError = err => {
    cleanup();
    l.error(err);
    service.emitError(profileId, err);
  };

  const handleStart = resolve => {
    if (startTime) return;

    startTime = Date.now();
    resolve({
      startTime
    });

    timeoutId = setTimeout(() => {
      // ending condition has met. Post-process results
      cleanup();

      _.forEach(connections, v => {
        const { ops } = v;
        let us = 0;
        let opCount = 0;

        _.forEach(ops, v => {
          const { us: opUs } = v;

          opCount += 1;
          us += opUs;
        });

        v.us = us;
        v.opCount = opCount;
      });

      let connectionIdsSortedByUs = _.keys(connections).sort(
        (a, b) => connections[b].us - connections[a].us
      );

      if (n) {
        connectionIdsSortedByUs = _.take(connectionIdsSortedByUs, n);
      }

      const result = _.map(connectionIdsSortedByUs, v => connections[v]);

      dev &&
        l.debug(
          `Top ${n ? `${n} ` : ''}connections since ${moment(
            startTime
          ).format()} (${startTime}): ${util.inspect(result)}`
        );
      service.emitData(profileId, result);
    }, samplingTime);
  };

  // $FlowFixMe
  return new Promise(resolve => {
    // immediately invoked interval
    intervalId = setInterval(
      (function interval() {
        (async () => {
          handleStart(resolve);

          const { inprog } = await adminDb.command({ currentOp: 1 });

          _.forEach(inprog, v => {
            const {
              connectionId = null,
              host = null,
              appName = null,
              client = null,
              op,
              // query
            } = v;

            if (!connectionId) {
              // skip `none` operation
              return;
            }

            // uncomment this if we don't want our `command({ currentOp: 1 })`s themselves in the
            // results
            // if (op === 'command' && _.isEqual(query, { currentOp: 1 })) {
            //   // skip `command({ currentOp: 1 })` (self) operation
            //   return;
            // }

            if (!_.has(connections, connectionId)) {
              connections[connectionId] = {
                connectionId,
                host,
                appName,
                client,
                lastCommand: null,
                lastNs: null,
                lastOp: null,
                planSummary: null,
                us: 0,
                opCount: 0,
                ops: {}
              };
            }

            const connection = connections[connectionId];
            const { ops } = connection;
            const {
              opid,
              ns,
              // eslint-disable-next-line camelcase
              microsecs_running = 0,
              command = null,
              planSummary = null,
              currentOpTime = null
            } = v;

            if (!_.has(ops, opid)) {
              // add as new operation
              ops[opid] = {
                ns,
                op,
                us: microsecs_running,
                command,
                planSummary,
                currentOpTime
              };
            } else {
              // update time elapsed
              const op = ops[opid];
              const { us } = op;

              // eslint-disable-next-line camelcase
              if (us < microsecs_running) {
                // eslint-disable-next-line camelcase
                op.us = microsecs_running;
                op.currentOpTime = currentOpTime;
              }
            }

            // update last op
            _.assign(connection, {
              lastCommand: command,
              lastNs: ns,
              lastOp: op,
              planSummary
            });
          });
        })()
          // catch all potential errors from async/await
          .catch(handleError);

        return interval;
      }()),
      samplingRate
    );
  });
};
