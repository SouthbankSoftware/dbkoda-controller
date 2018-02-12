export default {
  statisticDefinitions: [
    {
      name: 'activeRead',
      type: 'final',
      defaultSource: 'globalLock.activeClients.readers',
      versions: [
        {
          versionMask: '3.2.*',
          source: 'globalLock.active.readers'
        }
      ]
    },
    {
      name: 'bytesIn',
      type: 'rate',
      defaultSource: 'network.bytesIn'
    },
    {
      name: 'bytesOut',
      type: 'rate',
      defaultSource: 'network.bytesOut'
    },
    {
      name: 'opCounterQuery',
      type: 'rate',
      defaultSource: 'opcounters.query'
    },
    {
      name: 'opCounterCommand',
      type: 'rate',
      defaultSource: 'opcounters.command'
    },
    {
      name: 'opCounterInsert',
      type: 'rate',
      defaultSource: 'opcounters.insert'
    },
    {
      name: 'opCounterUpdate',
      type: 'rate',
      defaultSource: 'opcounters.update'
    },
    {
      name: 'opCounterDelete',
      type: 'rate',
      defaultSource: 'opcounters.delete'
    },
    {
      name: 'writeOpsRate',
      type: 'rate',
      defaultSource: 'opLatencies.writes.ops'
    },
    {
      name: 'writeLatencyRate',
      type: 'rate',
      defaultSource: 'opLatencies.writes.latency'
    },
    {
      name: 'wtReadintoCacheRate',
      type: 'rate',
      defaultSource: 'wiredTiger.cache.pages read into cache'
    },
    {
      name: 'wtCacheRequestsRate',
      type: 'rate',
      defaultSource: 'wiredTiger.cache.pages requested from the cache'
    }
  ],
  calculations: [
    {
      name: 'writeLatency',
      expression: 'writeLatencyRate/writeOpsRate',
      ifZeroDivide: 0
    },
    {
      name: 'networkLoad',
      expression: 'writeOpsRate'
    },
    {
      name: 'wiredTigerCacheMissPct',
      expression: 'wtReadintoCacheRate*100/wtCacheRequestsRate',
      ifZeroDivide: 0
    }
  ]
};
