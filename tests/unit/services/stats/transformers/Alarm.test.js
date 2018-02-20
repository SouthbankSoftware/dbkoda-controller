/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-02-20T15:13:41+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-20T21:05:26+11:00
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
import StatsCalculator from '~/services/stats/transformers/StatsCalculator';
import Alarm from '~/services/stats/transformers/Alarm';
import assert from 'assert';

describe('Alarm', () => {
  let calculator;
  let alarm;
  let transformPipeline;
  let values;

  before(() => {
    calculator = new StatsCalculator();
    alarm = new Alarm();
    transformPipeline = nextValue => alarm.transform(calculator.transform(nextValue));
    values = [
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 1,
        value: {
          network_bytesOutPs: 100
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 2,
        value: {
          network_bytesOutPs: 101
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 3,
        value: {
          network_bytesOutPs: 100
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 4,
        value: {
          network_bytesOutPs: 101
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 5,
        value: {
          network_bytesOutPs: 99
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 6,
        value: {
          network_bytesOutPs: 98
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 7,
        value: {
          network_bytesOutPs: 102
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 8,
        value: {
          network_bytesOutPs: 101
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 9,
        value: {
          network_bytesOutPs: 102
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 10,
        value: {
          network_bytesOutPs: 101
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 11,
        value: {
          network_bytesOutPs: 102
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 12,
        value: {
          network_bytesOutPs: 5000
        }
      }
    ];
  });

  it('can detect network uplink anomaly', () => {
    let transformedValue;

    for (const value of values) {
      transformedValue = transformPipeline(value);
    }

    // TODO: remove log after dev
    console.log(JSON.stringify(transformedValue, null, 2));
    assert.notEqual(_.get(transformedValue, 'value.alarm.networkUplinkAnomaly'), null);
  });
});
