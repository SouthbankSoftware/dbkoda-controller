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
    }
  ]
};
