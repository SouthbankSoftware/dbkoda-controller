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
            name: 'network_bytesInPs',
            type: 'rate',
            defaultSource: 'network.bytesIn'
        },
        {
            name: 'network_bytesOutPs',
            type: 'rate',
            defaultSource: 'network.bytesOut'
        },
        //
        // mongoDB panel statistics
        //
        // operations per second
        {
            name: 'operations_QueryPs',
            type: 'rate',
            defaultSource: 'opcounters.query'
        },
        {
            name: 'operations_CommandPs',
            type: 'rate',
            defaultSource: 'opcounters.command'
        },
        {
            name: 'operations_InsertPs',
            type: 'rate',
            defaultSource: 'opcounters.insert'
        },
        {
            name: 'operations_UpdatePs',
            type: 'rate',
            defaultSource: 'opcounters.update'
        },
        {
            name: 'operations_DeletePs',
            type: 'rate',
            defaultSource: 'opcounters.delete'
        },
        //
        // Connections
        //
        {
            name: 'connections_current',
            type: 'final',
            defaultSource: 'connections.current'
        },
        {
            name: 'connections_available',
            type: 'final',
            defaultSource: 'connections.available'
        },
        //
        // Read/Write queues
        //
        {
            name: 'queue_readersActive',
            type: 'final',
            defaultSource: 'globalLock.activeClients.readers'
        },
        {
            name: 'queue_readersQueued',
            type: 'final',
            defaultSource: 'globalLock.currentQueue.readers'
        },
        {
            name: 'queue_writersActive',
            type: 'final',
            defaultSource: 'globalLock.activeClients.writers'
        },
        {
            name: 'queue_writersQueued',
            type: 'final',
            defaultSource: 'globalLock.currentQueue.writers'
        },
        {
            name: 'queue_totalActive',
            type: 'final',
            defaultSource: 'globalLock.activeClients.total'
        },
        {
            name: 'queue_totalQueued',
            type: 'final',
            defaultSource: 'globalLock.currentQueue.total'
        },
        {
            name: 'latency_writeOpsPs',
            type: 'rate',
            defaultSource: 'opLatencies.writes.ops'
        },
        {
            name: 'latency_writeWaitUsPs',
            type: 'rate',
            defaultSource: 'opLatencies.writes.latency'
        },
        {
            name: 'latency_readOpsPs',
            type: 'rate',
            defaultSource: 'opLatencies.reads.ops'
        },
        {
            name: 'latency_readWaitUsPs',
            type: 'rate',
            defaultSource: 'opLatencies.reads.latency'
        },
        {
            name: 'latency_commandOpsPs',
            type: 'rate',
            defaultSource: 'opLatencies.commands.ops'
        },
        {
            name: 'latency_commandWaitUsPs',
            type: 'rate',
            defaultSource: 'opLatencies.commands.latency'
        },
        //
        // Blocks in/out wiredTiger cache
        //
        {
            name: 'wtCache_readRequestsPs',
            type: 'rate',
            defaultSource: 'wiredTiger.cache.pages requested from the cache'
        },
        {
            name: 'wtCache_readIntoCachePs',
            type: 'rate',
            defaultSource: 'wiredTiger.cache.pages read into cache'
        },
        {
            name: 'wtCache_maxBytes',
            type: 'final',
            defaultSource: 'wiredTiger.cache.maximum bytes configured'
        },
        {
            name: 'wtCache_currentBytes',
            type: 'final',
            defaultSource: 'wiredTiger.cache.bytes currently in the cache'
        },
        {
            name: 'wtCache_evictionsPs',
            type: 'rate',
            defaultSource: 'wiredTiger.cache.eviction worker thread evicting pages',
            ifZeroDivide: 0
        },
        //
        // Wired Tiger transaction tickets
        //
        {
            name: 'wtTransactions_readAvailable',
            type: 'final',
            defaultSource: 'wiredTiger.concurrentTransactions.read.available'
        },
        {
            name: 'wtTransactions_readOut',
            type: 'final',
            defaultSource: 'wiredTiger.concurrentTransactions.read.out'
        },
        {
            name: 'wtTransactions_writeAvailable',
            type: 'final',
            defaultSource: 'wiredTiger.concurrentTransactions.write.available'
        },
        {
            name: 'wtTransactions_writeOut',
            type: 'final',
            defaultSource: 'wiredTiger.concurrentTransactions.write.out'
        },
        //
        // WiredTiger IOs
        //
        {
            name: 'wtIO_writeIOps',
            type: 'rate',
            defaultSource: 'wiredTiger.connection.total write I/Os'
        },
        {
            name: 'wtIO_readIOps',
            type: 'rate',
            defaultSource: 'wiredTiger.connection.total read I/Os'
        },
        {
            name: 'wtIO_fsyncIOps',
            type: 'rate',
            defaultSource: 'wiredTiger.connection.total fsync I/Os'
        },
        //
        // WiredTiger readLatencyRate
        //
        {
            name: 'wtIO_diskToCachePs',
            type: 'rate',
            defaultSource: 'wiredTiger.cache.application threads page read from disk to cache count'
        },
        {
            name: 'wtIO_diskToCacheUsPs',
            type: 'rate',
            defaultSource: 'wiredTiger.cache.application threads page read from disk to cache time (usecs)'
        },
        {
            name: 'wtIO_cacheToDiskPs',
            type: 'rate',
            defaultSource: 'wiredTiger.cache.application threads page write from cache to disk count'
        },
        {
            name: 'wtIO_cacheToDiskUsPs',
            type: 'rate',
            defaultSource: 'wiredTiger.cache.application threads page write from cache to disk time (usecs)'
        },
        {
            name: 'wtIO_logSyncTimeUsPs',
            type: 'rate',
            defaultSource: 'wiredTiger.log.log sync time duration (usecs)'
        },
        {
            name: 'wtIO_logSyncPs',
            type: 'rate',
            defaultSource: 'wiredTiger.log.log sync operations'
        },
        //
        // wiredTiger log
        //
        {
            name: 'wtLog_maxLogSize',
            type: 'final',
            defaultSource: 'wiredTiger.log.maximum log file size'
        },
        {
            name: 'wtLog_currentLogSize',
            type: 'final',
            defaultSource: 'wiredTiger.log.total log buffer size'
        }
    ],
    calculations: [{
            name: 'latency_writeAvgLatencyMs',
            expression: '(latency_writeWaitUsPs/1000)/latency_writeOpsPs',
            ifZeroDivide: 0
        },
        {
            name: 'latency_readAvgLatencyMs',
            expression: '(latency_readWaitUsPs/1000)/latency_readOpsPs',
            ifZeroDivide: 0
        },

        {
            name: 'wtCache_MissPct',
            expression: 'wtCache_readIntoCachePs*100/wtCache_readRequestsPs',
            ifZeroDivide: 0
        },
        {
            name: 'wtIO_readLatencyMs',
            expression: '(wtIO_diskToCacheUsPs/1000)/wtIO_diskToCachePs',
            ifZeroDivide: 0
        },
        {
            name: 'wtIO_writeLatencyMs',
            expression: '(wtIO_cacheToDiskUsPs/1000)/wtIO_cacheToDiskPs',
            ifZeroDivide: 0
        },
        {
            name: 'wtTransactions_readPct',
            expression: 'wtTransactions_readOut*100/(wtTransactions_readOut+wtTransactions_readAvailable)',
            ifZeroDivide: 0
        },
        {
            name: 'wtTransactions_writePct',
            expression: 'wtTransactions_writeOut*100/(wtTransactions_writeOut+wtTransactions_writeAvailable)',
            ifZeroDivide: 0
        }
    ]
};
