export default {
    statisticDefinitions: [
      // Remove the next one when its "demo" function is over
      {
            name: 'activeReadSample',
            type: 'final',
            defaultSource: 'globalLock.activeClients.readers',
            versions: [{
                versionMask: '3.2.*',
                source: 'globalLock.active.readers'
            }]
        },
        //
        // Network in-out
        //
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
        //
        // mongoDB panel statistics
        //
        // operations per second
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
        //
        // Connections
        //
        {
            name: 'currentConnections',
            type: 'final',
            defaultSource: 'connections.current'
        },
        {
            name: 'availableConnections',
            type: 'final',
            defaultSource: 'connections.available'
        },
        //
        // Read/Write queues
        //
        {
            name: 'activeReaders',
            type: 'final',
            defaultSource: 'globalLock.activeClients.readers'
        },
        {
            name: 'queuedReaders',
            type: 'final',
            defaultSource: 'globalLock.activeClients.readers'
        },
        {
            name: 'activeWriters',
            type: 'final',
            defaultSource: 'globalLock.activeClients.writers'
        },
        {
            name: 'queuedWriters',
            type: 'final',
            defaultSource: 'globalLock.activeClients.writers'
        },
        {
            name: 'activeTotal',
            type: 'final',
            defaultSource: 'globalLock.activeClients.total'
        },
        {
            name: 'queuedTotal',
            type: 'final',
            defaultSource: 'globalLock.activeClients.total'
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
            name: 'readOpsRate',
            type: 'rate',
            defaultSource: 'opLatencies.reads.ops'
        },
        {
            name: 'readLatencyRate',
            type: 'rate',
            defaultSource: 'opLatencies.reads.latency'
        },
        //
        // Blocks in/out wiredTiger cache
        //
        {
            name: 'wtCacheRequestsRate',
            type: 'rate',
            defaultSource: 'wiredTiger.cache.pages requested from the cache'
        },
        {
            name: 'wtReadintoCacheRate',
            type: 'rate',
            defaultSource: 'wiredTiger.cache.pages read into cache'
        }
        //
        // Wired Tiger transaction tickets
        //
        // wiredTiger.concurrentTransactions.read.available
        // wiredTiger.concurrentTransactions.read.out
        // wiredTiger.concurrentTransactions.read.totalTickets
        // wiredTiger.concurrentTransactions.write.available
        // wiredTiger.concurrentTransactions.write.out
        // wiredTiger.concurrentTransactions.write.totalTickets

        //
        // WiredTiger IOs
        //
        // wiredTiger.connection.total fsync I/Os
        // wiredTiger.connection.total read I/Os
        // wiredTiger.connection.total write I/Os
        //

        //
        // WiredTiger readLatencyRate
        //
        // wiredTiger.cache.application threads page read from disk to cache count
        // wiredTiger.cache.application threads page read from disk to cache time (usecs)
        // wiredTiger.cache.application threads page write from cache to disk count
        // wiredTiger.cache.application threads page write from cache to disk time (usecs)
    ],
    calculations: [{
            name: 'writeAvgLatency',
            expression: 'writeLatencyRate/writeOpsRate',
            ifZeroDivide: 0
        },
        {
                name: 'readAvgLatency',
                expression: 'readLatencyRate/readOpsRate',
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
