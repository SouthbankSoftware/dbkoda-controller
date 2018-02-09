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
 * Created by joey on 9/2/18.
 */

export const replica34 = {
  'host': 'b76f12ba2740',
  'version': '3.4.7',
  'process': 'mongod',
  'pid': 1,
  'uptime': 442731,
  'uptimeMillis': 442731075,
  'uptimeEstimate': 442731,
  'localTime': '2018-02-09T03:04:11.306Z',
  'asserts': {
    'regular': 0,
    'warning': 0,
    'msg': 0,
    'user': 11,
    'rollovers': 0
  },
  'connections': {
    'current': 1,
    'available': 838859,
    'totalCreated': 742
  },
  'extra_info': {
    'note': 'fields vary by platform',
    'page_faults': 321
  },
  'globalLock': {
    'totalTime': 442731041000,
    'currentQueue': {
      'total': 0,
      'readers': 0,
      'writers': 0
    },
    'activeClients': {
      'total': 19,
      'readers': 0,
      'writers': 0
    }
  },
  'locks': {
    'Global': {
      'acquireCount': {
        'r': 4171333,
        'w': 57531,
        'R': 1,
        'W': 11
      }
    },
    'Database': {
      'acquireCount': {
        'r': 2145212,
        'w': 38965,
        'R': 2417,
        'W': 241
      },
      'acquireWaitCount': {
        'r': 6,
        'w': 5,
        'W': 12
      },
      'timeAcquiringMicros': {
        'r': 80125,
        'w': 90259,
        'W': 197230
      }
    },
    'Collection': {
      'acquireCount': {
        'r': 1911195,
        'w': 10559,
        'W': 4
      }
    },
    'Metadata': {
      'acquireCount': {
        'w': 28479
      }
    },
    'oplog': {
      'acquireCount': {
        'r': 229199,
        'w': 28484
      }
    }
  },
  'network': {
    'bytesIn': 5018508,
    'bytesOut': 153522791,
    'physicalBytesIn': 5018508,
    'physicalBytesOut': 153522791,
    'numRequests': 109624
  },
  'opLatencies': {
    'reads': {
      'latency': 1195819,
      'ops': 497
    },
    'writes': {
      'latency': 1725470,
      'ops': 10054
    },
    'commands': {
      'latency': 16425422,
      'ops': 44263
    }
  },
  'opcounters': {
    'insert': 10059,
    'query': 450,
    'update': 38,
    'delete': 13,
    'getmore': 0,
    'command': 44307
  },
  'opcountersRepl': {
    'insert': 0,
    'query': 0,
    'update': 0,
    'delete': 0,
    'getmore': 0,
    'command': 0
  },
  'repl': {
    'hosts': [
      'localhost:27017'
    ],
    'setName': 'rs0',
    'setVersion': 3,
    'ismaster': true,
    'secondary': false,
    'primary': 'localhost:27017',
    'me': 'localhost:27017',
    'electionId': '7fffffff000000000000001c',
    'lastWrite': {
      'opTime': {
        'ts': '6520385058321203201',
        't': 28
      },
      'lastWriteDate': '2018-02-09T03:04:10.000Z'
    },
    'rbid': 1426154655
  },
  'storageEngine': {
    'name': 'wiredTiger',
    'supportsCommittedReads': true,
    'readOnly': false,
    'persistent': true
  },
  'tcmalloc': {
    'generic': {
      'current_allocated_bytes': 97544512,
      'heap_size': 180400128
    },
    'tcmalloc': {
      'pageheap_free_bytes': 9900032,
      'pageheap_unmapped_bytes': 63389696,
      'max_total_thread_cache_bytes': 261095424,
      'current_total_thread_cache_bytes': 983992,
      'total_free_bytes': 9565888,
      'central_cache_free_bytes': 3479912,
      'transfer_cache_free_bytes': 5101984,
      'thread_cache_free_bytes': 983992,
      'aggressive_memory_decommit': 0,
      'formattedString': '------------------------------------------------\nMALLOC:       97544512 (   93.0 MiB) Bytes in use by application\nMALLOC: +      9900032 (    9.4 MiB) Bytes in page heap freelist\nMALLOC: +      3479912 (    3.3 MiB) Bytes in central cache freelist\nMALLOC: +      5101984 (    4.9 MiB) Bytes in transfer cache freelist\nMALLOC: +       983992 (    0.9 MiB) Bytes in thread cache freelists\nMALLOC: +      1663168 (    1.6 MiB) Bytes in malloc metadata\nMALLOC:   ------------\nMALLOC: =    118673600 (  113.2 MiB) Actual memory used (physical + swap)\nMALLOC: +     63389696 (   60.5 MiB) Bytes released to OS (aka unmapped)\nMALLOC:   ------------\nMALLOC: =    182063296 (  173.6 MiB) Virtual address space used\nMALLOC:\nMALLOC:           3296              Spans in use\nMALLOC:             61              Thread heaps in use\nMALLOC:           4096              Tcmalloc page size\n------------------------------------------------\nCall ReleaseFreeMemory() to release freelist memory to the OS (via madvise()).\nBytes released to the OS take up virtual address space but no physical memory.\n'
    }
  },
  'wiredTiger': {
    'uri': 'statistics:',
    'LSM': {
      'application work units currently queued': 0,
      'merge work units currently queued': 0,
      'rows merged in an LSM tree': 0,
      'sleep for LSM checkpoint throttle': 0,
      'sleep for LSM merge throttle': 0,
      'switch work units currently queued': 0,
      'tree maintenance operations discarded': 0,
      'tree maintenance operations executed': 0,
      'tree maintenance operations scheduled': 0,
      'tree queue hit maximum': 0
    },
    'async': {
      'current work queue length': 0,
      'maximum work queue length': 0,
      'number of allocation state races': 0,
      'number of flush calls': 0,
      'number of operation slots viewed for allocation': 0,
      'number of times operation allocation failed': 0,
      'number of times worker found no work': 0,
      'total allocations': 0,
      'total compact calls': 0,
      'total insert calls': 0,
      'total remove calls': 0,
      'total search calls': 0,
      'total update calls': 0
    },
    'block-manager': {
      'blocks pre-loaded': 913,
      'blocks read': 10724,
      'blocks written': 46617,
      'bytes read': 50520064,
      'bytes written': 373174272,
      'bytes written for checkpoint': 372969472,
      'mapped blocks read': 0,
      'mapped bytes read': 0
    },
    'cache': {
      'application threads page read from disk to cache count': 1374,
      'application threads page read from disk to cache time (usecs)': 425489,
      'application threads page write from cache to disk count': 60,
      'application threads page write from cache to disk time (usecs)': 13710,
      'bytes belonging to page images in the cache': 10519869,
      'bytes currently in the cache': 18738185,
      'bytes not belonging to page images in the cache': 8218316,
      'bytes read into cache': 7026557733,
      'bytes written from cache': 288311008,
      'checkpoint blocked page eviction': 0,
      'eviction calls to get a page': 4927,
      'eviction calls to get a page found queue empty': 4928,
      'eviction calls to get a page found queue empty after locking': 0,
      'eviction currently operating in aggressive mode': 0,
      'eviction empty score': 0,
      'eviction server candidate queue empty when topping up': 0,
      'eviction server candidate queue not empty when topping up': 0,
      'eviction server evicting pages': 0,
      'eviction server slept, because we did not make progress with eviction': 0,
      'eviction server unable to reach eviction goal': 0,
      'eviction state': 16,
      'eviction walks abandoned': 0,
      'eviction worker thread active': 4,
      'eviction worker thread created': 0,
      'eviction worker thread evicting pages': 0,
      'eviction worker thread removed': 23468,
      'eviction worker thread stable number': 0,
      'failed eviction of pages that exceeded the in-memory maximum': 507,
      'files with active eviction walks': 0,
      'files with new eviction walks started': 0,
      'force re-tuning of eviction workers once in a while': 5867,
      'hazard pointer blocked page eviction': 0,
      'hazard pointer check calls': 1316,
      'hazard pointer check entries walked': 3945,
      'hazard pointer maximum array length': 3,
      'in-memory page passed criteria to be split': 0,
      'in-memory page splits': 0,
      'internal pages evicted': 294,
      'internal pages split during eviction': 0,
      'leaf pages split during eviction': 2,
      'lookaside table insert calls': 0,
      'lookaside table remove calls': 0,
      'maximum bytes configured': 510656512,
      'maximum page size at eviction': 0,
      'modified pages evicted': 65,
      'modified pages evicted by application threads': 0,
      'overflow pages read into cache': 0,
      'overflow values cached in memory': 0,
      'page split during eviction deepened the tree': 0,
      'page written requiring lookaside records': 0,
      'pages currently held in the cache': 619,
      'pages evicted because they exceeded the in-memory maximum': 0,
      'pages evicted because they had chains of deleted items': 809,
      'pages evicted by application threads': 0,
      'pages queued for eviction': 0,
      'pages queued for urgent eviction': 0,
      'pages queued for urgent eviction during walk': 0,
      'pages read into cache': 1453,
      'pages read into cache requiring lookaside entries': 0,
      'pages requested from the cache': 1751651,
      'pages seen by eviction walk': 0,
      'pages selected for eviction unable to be evicted': 507,
      'pages walked for eviction': 0,
      'pages written from cache': 28105,
      'pages written requiring in-memory restoration': 0,
      'percentage overhead': 8,
      'tracked bytes belonging to internal pages in the cache': 2207957,
      'tracked bytes belonging to leaf pages in the cache': 16530228,
      'tracked dirty bytes in the cache': 5950712,
      'tracked dirty pages in the cache': 4,
      'unmodified pages evicted': 808
    },
    'connection': {
      'auto adjusting condition resets': 27327,
      'auto adjusting condition wait calls': 1155186,
      'detected system time went backwards': 0,
      'files currently open': 61,
      'memory allocations': 15193998,
      'memory frees': 15103163,
      'memory re-allocations': 3285043,
      'pthread mutex condition wait calls': 2998659,
      'pthread mutex shared lock read-lock calls': 2182509,
      'pthread mutex shared lock write-lock calls': 223445,
      'total fsync I/Os': 40241,
      'total read I/Os': 17486,
      'total write I/Os': 74696
    },
    'cursor': {
      'cursor create calls': 1343,
      'cursor insert calls': 78504,
      'cursor next calls': 345123,
      'cursor prev calls': 99,
      'cursor remove calls': 331,
      'cursor reset calls': 1389216,
      'cursor restarted searches': 0,
      'cursor search calls': 1568477,
      'cursor search near calls': 2624,
      'cursor update calls': 0,
      'truncate calls': 0
    },
    'data-handle': {
      'connection data handles currently active': 85,
      'connection sweep candidate became referenced': 0,
      'connection sweep dhandles closed': 71,
      'connection sweep dhandles removed from hash list': 6234,
      'connection sweep time-of-death sets': 6333,
      'connection sweeps': 18326,
      'session dhandles swept': 44067,
      'session sweep attempts': 3347
    },
    'lock': {
      'checkpoint lock acquisitions': 3079,
      'checkpoint lock application thread wait time (usecs)': 1266,
      'checkpoint lock internal thread wait time (usecs)': 19974,
      'handle-list lock eviction thread wait time (usecs)': 4596131,
      'metadata lock acquisitions': 3071,
      'metadata lock application thread wait time (usecs)': 0,
      'metadata lock internal thread wait time (usecs)': 14838,
      'schema lock acquisitions': 3436,
      'schema lock application thread wait time (usecs)': 348079,
      'schema lock internal thread wait time (usecs)': 15894,
      'table lock acquisitions': 0,
      'table lock application thread time waiting for the table lock (usecs)': 0,
      'table lock internal thread time waiting for the table lock (usecs)': 0
    },
    'log': {
      'busy returns attempting to switch slots': 29,
      'consolidated slot closures': 24910,
      'consolidated slot join active slot closed': 0,
      'consolidated slot join races': 0,
      'consolidated slot join transitions': 24910,
      'consolidated slot joins': 38565,
      'consolidated slot transitions unable to find free slot': 0,
      'consolidated slot unbuffered writes': 0,
      'log bytes of payload data': 8249487,
      'log bytes written': 11487360,
      'log files manually zero-filled': 0,
      'log flush operations': 1812262,
      'log force write operations': 2018287,
      'log force write operations skipped': 1996647,
      'log records compressed': 13429,
      'log records not compressed': 18490,
      'log records too small to compress': 6646,
      'log release advances write LSN': 3269,
      'log scan operations': 3,
      'log scan records requiring two reads': 5,
      'log server thread advances write LSN': 21641,
      'log server thread write LSN walk skipped': 248196,
      'log sync operations': 24715,
      'log sync time duration (usecs)': 165346523,
      'log sync_dir operations': 1,
      'log sync_dir time duration (usecs)': 5,
      'log write operations': 38565,
      'logging bytes consolidated': 11486976,
      'maximum log file size': 104857600,
      'number of pre-allocated log files to create': 2,
      'pre-allocated log files not ready and missed': 1,
      'pre-allocated log files prepared': 2,
      'pre-allocated log files used': 0,
      'records processed by log scan': 11,
      'total in-memory size of compressed records': 9320661,
      'total log buffer size': 33554432,
      'total size of compressed records': 5411584,
      'written slots coalesced': 0,
      'yields waiting for previous log file close': 0
    },
    'reconciliation': {
      'fast-path pages deleted': 0,
      'page reconciliation calls': 27836,
      'page reconciliation calls for eviction': 41,
      'pages deleted': 12,
      'split bytes currently awaiting free': 0,
      'split objects currently awaiting free': 0
    },
    'session': {
      'open cursor count': 54,
      'open session count': 21,
      'table alter failed calls': 0,
      'table alter successful calls': 0,
      'table alter unchanged and skipped': 0,
      'table compact failed calls': 0,
      'table compact successful calls': 0,
      'table create failed calls': 0,
      'table create successful calls': 94,
      'table drop failed calls': 57,
      'table drop successful calls': 90,
      'table rebalance failed calls': 0,
      'table rebalance successful calls': 0,
      'table rename failed calls': 0,
      'table rename successful calls': 0,
      'table salvage failed calls': 0,
      'table salvage successful calls': 0,
      'table truncate failed calls': 0,
      'table truncate successful calls': 0,
      'table verify failed calls': 0,
      'table verify successful calls': 8
    },
    'thread-state': {
      'active filesystem fsync calls': 0,
      'active filesystem read calls': 0,
      'active filesystem write calls': 0
    },
    'thread-yield': {
      'application thread time evicting (usecs)': 0,
      'application thread time waiting for cache (usecs)': 0,
      'page acquire busy blocked': 0,
      'page acquire eviction blocked': 0,
      'page acquire locked blocked': 0,
      'page acquire read blocked': 0,
      'page acquire time sleeping (usecs)': 0
    },
    'transaction': {
      'number of named snapshots created': 0,
      'number of named snapshots dropped': 0,
      'transaction begins': 242459,
      'transaction checkpoint currently running': 0,
      'transaction checkpoint generation': 3071,
      'transaction checkpoint max time (msecs)': 1109,
      'transaction checkpoint min time (msecs)': 9,
      'transaction checkpoint most recent time (msecs)': 20,
      'transaction checkpoint scrub dirty target': 0,
      'transaction checkpoint scrub time (msecs)': 0,
      'transaction checkpoint total time (msecs)': 75317,
      'transaction checkpoints': 3071,
      'transaction checkpoints skipped because database was clean': 0,
      'transaction failures due to cache overflow': 0,
      'transaction fsync calls for checkpoint after allocating the transaction ID': 3071,
      'transaction fsync duration for checkpoint after allocating the transaction ID (usecs)': 5105,
      'transaction range of IDs currently pinned': 0,
      'transaction range of IDs currently pinned by a checkpoint': 0,
      'transaction range of IDs currently pinned by named snapshots': 0,
      'transaction sync calls': 0,
      'transactions committed': 31939,
      'transactions rolled back': 210455
    },
    'concurrentTransactions': {
      'write': {
        'out': 0,
        'available': 128,
        'totalTickets': 128
      },
      'read': {
        'out': 0,
        'available': 128,
        'totalTickets': 128
      }
    }
  },
  'mem': {
    'bits': 64,
    'resident': 90,
    'virtual': 1443,
    'supported': true,
    'mapped': 0,
    'mappedWithJournal': 0
  },
  'metrics': {
    'commands': {
      '<UNKNOWN>': 0,
      '_configsvrAddShard': {
        'failed': 0,
        'total': 0
      },
      '_configsvrAddShardToZone': {
        'failed': 0,
        'total': 0
      },
      '_configsvrBalancerStart': {
        'failed': 0,
        'total': 0
      },
      '_configsvrBalancerStatus': {
        'failed': 0,
        'total': 0
      },
      '_configsvrBalancerStop': {
        'failed': 0,
        'total': 0
      },
      '_configsvrCommitChunkMerge': {
        'failed': 0,
        'total': 0
      },
      '_configsvrCommitChunkMigration': {
        'failed': 0,
        'total': 0
      },
      '_configsvrCommitChunkSplit': {
        'failed': 0,
        'total': 0
      },
      '_configsvrMoveChunk': {
        'failed': 0,
        'total': 0
      },
      '_configsvrRemoveShardFromZone': {
        'failed': 0,
        'total': 0
      },
      '_configsvrSetFeatureCompatibilityVersion': {
        'failed': 0,
        'total': 0
      },
      '_configsvrUpdateZoneKeyRange': {
        'failed': 0,
        'total': 0
      },
      '_getUserCacheGeneration': {
        'failed': 0,
        'total': 0
      },
      '_isSelf': {
        'failed': 0,
        'total': 0
      },
      '_mergeAuthzCollections': {
        'failed': 0,
        'total': 0
      },
      '_migrateClone': {
        'failed': 0,
        'total': 0
      },
      '_recvChunkAbort': {
        'failed': 0,
        'total': 0
      },
      '_recvChunkCommit': {
        'failed': 0,
        'total': 0
      },
      '_recvChunkStart': {
        'failed': 0,
        'total': 0
      },
      '_recvChunkStatus': {
        'failed': 0,
        'total': 0
      },
      '_transferMods': {
        'failed': 0,
        'total': 0
      },
      'aggregate': {
        'failed': 0,
        'total': 44
      },
      'appendOplogNote': {
        'failed': 0,
        'total': 0
      },
      'applyOps': {
        'failed': 0,
        'total': 0
      },
      'authSchemaUpgrade': {
        'failed': 0,
        'total': 0
      },
      'authenticate': {
        'failed': 0,
        'total': 0
      },
      'availableQueryOptions': {
        'failed': 0,
        'total': 0
      },
      'buildInfo': {
        'failed': 0,
        'total': 523
      },
      'checkShardingIndex': {
        'failed': 0,
        'total': 0
      },
      'cleanupOrphaned': {
        'failed': 0,
        'total': 0
      },
      'clone': {
        'failed': 0,
        'total': 0
      },
      'cloneCollection': {
        'failed': 0,
        'total': 0
      },
      'cloneCollectionAsCapped': {
        'failed': 0,
        'total': 0
      },
      'collMod': {
        'failed': 0,
        'total': 0
      },
      'collStats': {
        'failed': 8,
        'total': 31
      },
      'compact': {
        'failed': 4,
        'total': 4
      },
      'connPoolStats': {
        'failed': 0,
        'total': 0
      },
      'connPoolSync': {
        'failed': 0,
        'total': 0
      },
      'connectionStatus': {
        'failed': 0,
        'total': 0
      },
      'convertToCapped': {
        'failed': 0,
        'total': 0
      },
      'copydb': {
        'failed': 0,
        'total': 0
      },
      'copydbgetnonce': {
        'failed': 0,
        'total': 0
      },
      'copydbsaslstart': {
        'failed': 0,
        'total': 0
      },
      'count': {
        'failed': 0,
        'total': 4
      },
      'create': {
        'failed': 0,
        'total': 4
      },
      'createIndexes': {
        'failed': 0,
        'total': 25
      },
      'createRole': {
        'failed': 0,
        'total': 0
      },
      'createUser': {
        'failed': 0,
        'total': 12
      },
      'currentOp': {
        'failed': 0,
        'total': 0
      },
      'currentOpCtx': {
        'failed': 0,
        'total': 0
      },
      'dataSize': {
        'failed': 0,
        'total': 0
      },
      'dbHash': {
        'failed': 0,
        'total': 0
      },
      'dbStats': {
        'failed': 0,
        'total': 8
      },
      'delete': {
        'failed': 0,
        'total': 13
      },
      'diagLogging': {
        'failed': 0,
        'total': 0
      },
      'distinct': {
        'failed': 0,
        'total': 0
      },
      'driverOIDTest': {
        'failed': 0,
        'total': 0
      },
      'drop': {
        'failed': 28,
        'total': 58
      },
      'dropAllRolesFromDatabase': {
        'failed': 0,
        'total': 0
      },
      'dropAllUsersFromDatabase': {
        'failed': 0,
        'total': 0
      },
      'dropDatabase': {
        'failed': 0,
        'total': 4
      },
      'dropIndexes': {
        'failed': 0,
        'total': 10
      },
      'dropRole': {
        'failed': 0,
        'total': 0
      },
      'dropUser': {
        'failed': 0,
        'total': 12
      },
      'eval': {
        'failed': 0,
        'total': 0
      },
      'explain': {
        'failed': 0,
        'total': 35
      },
      'features': {
        'failed': 0,
        'total': 0
      },
      'filemd5': {
        'failed': 0,
        'total': 0
      },
      'find': {
        'failed': 4,
        'total': 449
      },
      'findAndModify': {
        'failed': 0,
        'total': 0
      },
      'forceerror': {
        'failed': 0,
        'total': 0
      },
      'fsync': {
        'failed': 0,
        'total': 0
      },
      'fsyncUnlock': {
        'failed': 0,
        'total': 0
      },
      'geoNear': {
        'failed': 0,
        'total': 0
      },
      'geoSearch': {
        'failed': 0,
        'total': 0
      },
      'getCmdLineOpts': {
        'failed': 0,
        'total': 4
      },
      'getDiagnosticData': {
        'failed': 0,
        'total': 0
      },
      'getLastError': {
        'failed': 0,
        'total': 0
      },
      'getLog': {
        'failed': 0,
        'total': 136
      },
      'getMore': {
        'failed': 0,
        'total': 0
      },
      'getParameter': {
        'failed': 0,
        'total': 4
      },
      'getPrevError': {
        'failed': 0,
        'total': 0
      },
      'getShardMap': {
        'failed': 0,
        'total': 0
      },
      'getShardVersion': {
        'failed': 0,
        'total': 0
      },
      'getnonce': {
        'failed': 0,
        'total': 5
      },
      'grantPrivilegesToRole': {
        'failed': 0,
        'total': 0
      },
      'grantRolesToRole': {
        'failed': 0,
        'total': 0
      },
      'grantRolesToUser': {
        'failed': 0,
        'total': 0
      },
      'group': {
        'failed': 0,
        'total': 0
      },
      'handshake': {
        'failed': 0,
        'total': 0
      },
      'hostInfo': {
        'failed': 0,
        'total': 0
      },
      'insert': {
        'failed': 0,
        'total': 10059
      },
      'invalidateUserCache': {
        'failed': 0,
        'total': 0
      },
      'isMaster': {
        'failed': 0,
        'total': 13885
      },
      'killCursors': {
        'failed': 0,
        'total': 0
      },
      'killOp': {
        'failed': 0,
        'total': 0
      },
      'listCollections': {
        'failed': 0,
        'total': 2403
      },
      'listCommands': {
        'failed': 0,
        'total': 0
      },
      'listDatabases': {
        'failed': 0,
        'total': 796
      },
      'listIndexes': {
        'failed': 0,
        'total': 16532
      },
      'lockInfo': {
        'failed': 0,
        'total': 0
      },
      'logRotate': {
        'failed': 0,
        'total': 0
      },
      'logout': {
        'failed': 0,
        'total': 0
      },
      'mapReduce': {
        'failed': 0,
        'total': 0
      },
      'mapreduce': {
        'shardedfinish': {
          'failed': 0,
          'total': 0
        }
      },
      'mergeChunks': {
        'failed': 0,
        'total': 0
      },
      'moveChunk': {
        'failed': 0,
        'total': 0
      },
      'parallelCollectionScan': {
        'failed': 0,
        'total': 0
      },
      'ping': {
        'failed': 0,
        'total': 6
      },
      'planCacheClear': {
        'failed': 0,
        'total': 0
      },
      'planCacheClearFilters': {
        'failed': 0,
        'total': 0
      },
      'planCacheListFilters': {
        'failed': 0,
        'total': 0
      },
      'planCacheListPlans': {
        'failed': 0,
        'total': 0
      },
      'planCacheListQueryShapes': {
        'failed': 0,
        'total': 0
      },
      'planCacheSetFilter': {
        'failed': 0,
        'total': 0
      },
      'profile': {
        'failed': 0,
        'total': 0
      },
      'reIndex': {
        'failed': 0,
        'total': 0
      },
      'renameCollection': {
        'failed': 0,
        'total': 4
      },
      'repairCursor': {
        'failed': 0,
        'total': 0
      },
      'repairDatabase': {
        'failed': 0,
        'total': 0
      },
      'replSetAbortPrimaryCatchUp': {
        'failed': 0,
        'total': 0
      },
      'replSetElect': {
        'failed': 0,
        'total': 0
      },
      'replSetFreeze': {
        'failed': 0,
        'total': 0
      },
      'replSetFresh': {
        'failed': 0,
        'total': 0
      },
      'replSetGetConfig': {
        'failed': 0,
        'total': 0
      },
      'replSetGetRBID': {
        'failed': 0,
        'total': 0
      },
      'replSetGetStatus': {
        'failed': 0,
        'total': 1363
      },
      'replSetHeartbeat': {
        'failed': 0,
        'total': 0
      },
      'replSetInitiate': {
        'failed': 0,
        'total': 0
      },
      'replSetMaintenance': {
        'failed': 0,
        'total': 0
      },
      'replSetReconfig': {
        'failed': 0,
        'total': 0
      },
      'replSetRequestVotes': {
        'failed': 0,
        'total': 0
      },
      'replSetStepDown': {
        'failed': 0,
        'total': 0
      },
      'replSetStepUp': {
        'failed': 0,
        'total': 0
      },
      'replSetSyncFrom': {
        'failed': 0,
        'total': 0
      },
      'replSetUpdatePosition': {
        'failed': 0,
        'total': 0
      },
      'resetError': {
        'failed': 0,
        'total': 0
      },
      'resync': {
        'failed': 0,
        'total': 0
      },
      'revokePrivilegesFromRole': {
        'failed': 0,
        'total': 0
      },
      'revokeRolesFromRole': {
        'failed': 0,
        'total': 0
      },
      'revokeRolesFromUser': {
        'failed': 0,
        'total': 0
      },
      'rolesInfo': {
        'failed': 0,
        'total': 2346
      },
      'saslContinue': {
        'failed': 0,
        'total': 0
      },
      'saslStart': {
        'failed': 0,
        'total': 0
      },
      'serverStatus': {
        'failed': 0,
        'total': 5821
      },
      'setFeatureCompatibilityVersion': {
        'failed': 0,
        'total': 0
      },
      'setParameter': {
        'failed': 0,
        'total': 8
      },
      'setShardVersion': {
        'failed': 0,
        'total': 0
      },
      'shardConnPoolStats': {
        'failed': 0,
        'total': 0
      },
      'shardingState': {
        'failed': 0,
        'total': 0
      },
      'shutdown': {
        'failed': 0,
        'total': 0
      },
      'splitChunk': {
        'failed': 0,
        'total': 0
      },
      'splitVector': {
        'failed': 0,
        'total': 0
      },
      'top': {
        'failed': 0,
        'total': 4
      },
      'touch': {
        'failed': 0,
        'total': 0
      },
      'unsetSharding': {
        'failed': 0,
        'total': 0
      },
      'update': {
        'failed': 0,
        'total': 38
      },
      'updateRole': {
        'failed': 0,
        'total': 0
      },
      'updateUser': {
        'failed': 0,
        'total': 4
      },
      'usersInfo': {
        'failed': 0,
        'total': 0
      },
      'validate': {
        'failed': 0,
        'total': 4
      },
      'whatsmyuri': {
        'failed': 0,
        'total': 208
      }
    },
    'cursor': {
      'timedOut': 3,
      'open': {
        'noTimeout': 0,
        'pinned': 0,
        'total': 0
      }
    },
    'document': {
      'deleted': 13,
      'inserted': 10058,
      'returned': 2892,
      'updated': 36
    },
    'getLastError': {
      'wtime': {
        'num': 28,
        'totalMillis': 0
      },
      'wtimeouts': 0
    },
    'operation': {
      'scanAndOrder': 4,
      'writeConflicts': 0
    },
    'queryExecutor': {
      'scanned': 113731,
      'scannedObjects': 179916
    },
    'record': {
      'moves': 0
    },
    'repl': {
      'executor': {
        'counters': {
          'eventCreated': 6,
          'eventWait': 6,
          'cancels': 2,
          'waits': 0,
          'scheduledNetCmd': 0,
          'scheduledDBWork': 2,
          'scheduledXclWork': 0,
          'scheduledWorkAt': 2,
          'scheduledWork': 0,
          'schedulingFailures': 0
        },
        'queues': {
          'networkInProgress': 0,
          'dbWorkInProgress': 0,
          'exclusiveInProgress': 0,
          'sleepers': 0,
          'ready': 0,
          'free': 3
        },
        'unsignaledEvents': 0,
        'eventWaiters': 0,
        'shuttingDown': false,
        'networkInterface': "\nNetworkInterfaceASIO Operations' Diagnostic:\nOperation:    Count:   \nConnecting    0        \nIn Progress   0        \nSucceeded     0        \nCanceled      0        \nFailed        0        \nTimed Out     0        \n\n"
      },
      'apply': {
        'attemptsToBecomeSecondary': 1,
        'batches': {
          'num': 0,
          'totalMillis': 0
        },
        'ops': 0
      },
      'buffer': {
        'count': 0,
        'maxSizeBytes': 268435456,
        'sizeBytes': 0
      },
      'initialSync': {
        'completed': 0,
        'failedAttempts': 0,
        'failures': 0
      },
      'network': {
        'bytes': 0,
        'getmores': {
          'num': 0,
          'totalMillis': 0
        },
        'ops': 0,
        'readersCreated': 0
      },
      'preload': {
        'docs': {
          'num': 0,
          'totalMillis': 0
        },
        'indexes': {
          'num': 0,
          'totalMillis': 0
        }
      }
    },
    'storage': {
      'freelist': {
        'search': {
          'bucketExhausted': 0,
          'requests': 0,
          'scanned': 0
        }
      }
    },
    'ttl': {
      'deletedDocuments': 0,
      'passes': 3052
    }
  },
  'ok': 1
};
