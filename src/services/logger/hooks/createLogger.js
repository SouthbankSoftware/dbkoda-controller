/**
 * @flow
 *
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-03-05T15:35:16+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-03-07T10:38:41+11:00
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

import processItems from '~/hooks/processItems';
// $FlowFixMe
import { createLogger, format, transports } from 'winston';
import path from 'path';
import { levelConfig, commonFormatter, printfFormatter } from '~/helpers/winston';
// $FlowFixMe
import 'winston-daily-rotate-file';

export default () =>
  processItems(
    (context, item) => {
      const { path: logPath, debug } = item;
      const { service } = context;
      const { loggers, consoleTransport } = service;

      if (loggers.has(logPath)) {
        l.debug(`Logger ${logPath} already exists`);
        return { new: false };
      }

      // Lazy init
      if (!consoleTransport) {
        service.consoleTransport = new transports.Console();
      }

      const logger = createLogger({
        format: format.combine(format.splat(), commonFormatter, printfFormatter),
        level: 'debug',
        levels: levelConfig.levels,
        transports: [
          new transports.DailyRotateFile({
            filename: path.isAbsolute(logPath)
              ? logPath
              : // $FlowFixMe
                path.resolve(process.env.LOG_PATH, logPath),
            datePattern: 'YYYY-MM-DD',
            maxSize: '1m',
            maxFiles: IS_PRODUCTION ? '30d' : '3d'
          })
        ]
      });

      debug && logger.add(service.consoleTransport);

      loggers.set(logPath, logger);

      return { new: true };
    },
    { idAlias: 'path' }
  );
