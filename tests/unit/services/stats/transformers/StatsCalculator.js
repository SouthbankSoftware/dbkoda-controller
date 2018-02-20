/**
 * @Author: Guan Gui <guiguan>
 * @Date:   2018-02-20T11:50:41+11:00
 * @Email:  root@guiguan.net
 * @Last modified by:   guiguan
 * @Last modified time: 2018-02-20T13:32:05+11:00
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

import StatsCalculator from '~/services/stats/transformers/StatsCalculator';
import assert from 'assert';

describe('StatsCalculator', () => {
  let caculator;
  let values;
  const alpha = 0.2;

  before(() => {
    caculator = new StatsCalculator(alpha);
    values = [
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 1,
        value: {
          dummy1: 12,
          dummy2: [
            { SampleCollections: { dataSize: 103080500 } },
            { admin: { dataSize: 834 } },
            { local: { dataSize: 64384 } },
            { test: { dataSize: 0 } }
          ]
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 2,
        value: {
          dummy1: 15,
          dummy2: [
            { SampleCollections: { dataSize: 103070500 } },
            { admin: { dataSize: 123 } },
            { local: { dataSize: 54384 } },
            { test: { dataSize: 0 } }
          ]
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 3,
        value: {
          dummy1: 15,
          dummy2: [
            { SampleCollections: { dataSize: 3070500 } },
            { admin: { dataSize: 700 } },
            { test: { dataSize: 0 } }
          ]
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 4,
        value: {
          dummy1: 15,
          dummy2: [
            { SampleCollections: { dataSize: 103090500 } },
            { admin: { dataSize: -700 } },
            { test: { dataSize: 0 } }
          ]
        }
      },
      {
        profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
        timestamp: 5,
        value: {
          dummy1: 15,
          dummy2: [
            { SampleCollections: { dataSize: 103090500 } },
            { admin: { dataSize: -700 } },
            { test: { dataSize: 0 } }
          ]
        }
      }
    ];
  });

  it('should correctly initialise stats with first observed sample', () => {
    const [nextValue] = values;
    const transformedValue = caculator.transform(nextValue);

    assert.deepEqual(transformedValue, {
      profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
      timestamp: 1,
      value: {
        dummy1: 12,
        dummy2: [
          {
            SampleCollections: {
              dataSize: 103080500
            }
          },
          {
            admin: {
              dataSize: 834
            }
          },
          {
            local: {
              dataSize: 64384
            }
          },
          {
            test: {
              dataSize: 0
            }
          }
        ]
      },
      stats: {
        dummy1: {
          ema: 12,
          emv: 0,
          emsd: 0,
          count: 1
        },
        dummy2: [
          {
            SampleCollections: {
              dataSize: {
                ema: 103080500,
                emv: 0,
                emsd: 0,
                count: 1
              }
            }
          },
          {
            admin: {
              dataSize: {
                ema: 834,
                emv: 0,
                emsd: 0,
                count: 1
              }
            }
          },
          {
            local: {
              dataSize: {
                ema: 64384,
                emv: 0,
                emsd: 0,
                count: 1
              }
            }
          },
          {
            test: {
              dataSize: {
                ema: 0,
                emv: 0,
                emsd: 0,
                count: 1
              }
            }
          }
        ]
      }
    });
  });

  it('should be able to process second sample', () => {
    const [, nextValue] = values;
    const transformedValue = caculator.transform(nextValue);

    assert.deepEqual(transformedValue, {
      profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
      timestamp: 2,
      value: {
        dummy1: 15,
        dummy2: [
          {
            SampleCollections: {
              dataSize: 103070500
            }
          },
          {
            admin: {
              dataSize: 123
            }
          },
          {
            local: {
              dataSize: 54384
            }
          },
          {
            test: {
              dataSize: 0
            }
          }
        ]
      },
      stats: {
        dummy1: {
          ema: 12.6,
          emv: 1.4400000000000004,
          emsd: 1.2000000000000002,
          count: 2
        },
        dummy2: [
          {
            SampleCollections: {
              dataSize: {
                ema: 103078500,
                emv: 16000000,
                emsd: 4000,
                count: 2
              }
            }
          },
          {
            admin: {
              dataSize: {
                ema: 691.8,
                emv: 80883.36000000002,
                emsd: 284.40000000000003,
                count: 2
              }
            }
          },
          {
            local: {
              dataSize: {
                ema: 62384,
                emv: 16000000,
                emsd: 4000,
                count: 2
              }
            }
          },
          {
            test: {
              dataSize: {
                ema: 0,
                emv: 0,
                emsd: 0,
                count: 2
              }
            }
          }
        ]
      }
    });
  });

  it('can process more samples and potentially missing metrics', () => {
    let transformedValue;
    for (const nextValue of values.slice(2)) {
      transformedValue = caculator.transform(nextValue);
    }

    assert.deepEqual(transformedValue, {
      profileId: '8f65a890-1519-11e8-885b-d14c14dda128',
      timestamp: 5,
      value: {
        dummy1: 15,
        dummy2: [
          {
            SampleCollections: {
              dataSize: 103090500
            }
          },
          {
            admin: {
              dataSize: -700
            }
          },
          {
            test: {
              dataSize: 0
            }
          }
        ]
      },
      stats: {
        dummy1: {
          ema: 13.7712,
          emv: 2.17645056,
          emsd: 1.4752798243045284,
          count: 5
        },
        dummy2: [
          {
            SampleCollections: {
              dataSize: {
                ema: 90281796,
                emv: 1116449234960384,
                emsd: 33413309.248866446,
                count: 5
              }
            }
          },
          {
            admin: {
              dataSize: {
                ema: 191.8015999999999,
                emv: 488781.09343744017,
                emsd: 699.12881033286,
                count: 5
              }
            }
          },
          {
            local: {
              dataSize: {
                ema: 62384,
                emv: 16000000,
                emsd: 4000,
                count: 2
              }
            },
            test: {
              dataSize: {
                ema: 0,
                emv: 0,
                emsd: 0,
                count: 3
              }
            }
          },
          {
            test: {
              dataSize: {
                ema: 0,
                emv: 0,
                emsd: 0,
                count: 2
              }
            }
          }
        ]
      }
    });
  });
});
