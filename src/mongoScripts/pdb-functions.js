// Helper functions for provendb

/* eslint no-var: 0 */
/* eslint no-unused-vars: 0 */
/* eslint no-prototype-builtins: 0  */
/* eslint camelcase: 0 */
/* eslint prefer-arrow-callback: 0 */
/* eslint object-shorthand: 0 */
/* eslint vars-on-top: 0 */
/* eslint prefer-destructuring: 0 */
/* eslint no-loop-func: 0 */
/* eslint no-undef: 0 */
/* eslint no-plusplus: 0 */

const provendb = {};

provendb.help = () => {
  print('Look around and think!');
};
provendb.version = () => {
  const rc = db.runCommand({ getVersion: 1 });
  if ('version' in rc) {
    return rc.version + 0;
  }
  return rc;
};

provendb.lastProof = () => {
  const lp = db
    .getCollection('_provendb_versionProofs')
    .find(
      {
        status: 'valid'
      },
      {
        'details.collections': 0,
        proof: 0
      }
    )
    .sort({ version: -1 })
    .limit(1)
    .pretty();
  return lp;
};

provendb.setVersion = version => {
  return db.runCommand({ setVersion: version }).version + 0;
};

provendb.setCurrent = () => {
  return db.runCommand({ setVersion: 'current' }).version + 0;
};

provendb.prove = version => {
  return db.runCommand({ submitProof: version, proofType: 'full' });
};

provendb.proveProxy = version => {
  return db.runCommand({ submitProof: version, proofType: 'full', useTreeService: true });
};

provendb.proveCurrent = () => {
  const version = provendb.version();
  return db.runCommand({ submitProof: version, proofType: 'full' });
};

provendb.collectionVersion = (collection, version) => {
  return db.getCollection(collection).find({
    $and: [
      {
        '_provendb_metadata.minVersion': {
          $lte: version
        }
      },
      {
        '_provendb_metadata.maxVersion': {
          $gte: version
        }
      }
    ]
  });
};

provendb.versionContents = version => {
  db.getCollectionNames().forEach(col => {
    if (!col.match(/^_provendb/)) {
      let count = 0;
      db
        .getCollection(col)
        .find({
          $and: [
            {
              '_provendb_metadata.minVersion': {
                $lte: version
              }
            },
            {
              '_provendb_metadata.maxVersion': {
                $gte: version
              }
            }
          ]
        })
        .forEach(() => {
          count += 1;
        });
      print(col + ' Document count=' + count);
    }
  });
};

provendb.validate = version => {
  return db.runCommand({ verifyProof: version });
};

provendb.versionHistogram = collection => {
  provendb.metadata(true);
  const histogram = {};
  db
    .getCollection(collection)
    .find({}, { '_provendb_metadata.minVersion': 1 })
    .forEach(d => {
      // printjson(d);
      const minVersion = d._provendb_metadata.minVersion;
      if (minVersion in histogram) {
        histogram[minVersion]++;
      } else {
        histogram[minVersion] = 1;
      }
    });
  return histogram;
};

provendb.metadata = metadata => {
  db.runCommand({ showMetadata: metadata });
};

provendb.logLevel = level => {
  return db.runCommand({ setLogLevel: level });
};
provendb.bulkLoad = bulkInsertMode => {
  return db.runCommand({ bulkLoad: bulkInsertMode });
};

provendb.proofStatus = () => {
  const output = {};
  db
    .getCollection('_provendb_versionProofs')
    .find({}, {})
    .forEach(p => {
      // print(p.status);
      if (!(p.status in output)) {
        output[p.status] = 1;
      } else {
        output[p.status] += 1;
      }
    });
  return output;
};

provendb.getCompactableGap = () => {
  var noGap = true;
  var lastProofVersion = -1;
  var compactableGap = {};
  var proofCsr = db
    .getCollection('_provendb_versionProofs')
    .find()
    .sort({ version: 1 });
  while (noGap && proofCsr.hasNext()) {
    var proof = proofCsr.next();
    // printjson(proof);
    var thisProofVersion = proof.version + 0;

    if (lastProofVersion > 0 && thisProofVersion > lastProofVersion) {
      var unPurgedCount = db
        .getCollection('_provendb_versions')
        .find({
          $and: [
            {
              version: {
                $gt: lastProofVersion
              }
            },
            {
              version: {
                $lt: thisProofVersion
              }
            },
            {
              status: {
                $ne: 'purged'
              }
            }
          ]
        })
        .count();
      if (unPurgedCount > 0) {
        noGap = false;
        compactableGap = {
          startVersion: lastProofVersion + 1,
          endVersion: thisProofVersion - 1
        };
      }
    }
    lastProofVersion = thisProofVersion;
  }
  return compactableGap;
};

provendb.proveLoop = sleepTime => {
  while (true) {
    const rc = provendb.proveCurrent();
    printjson(rc);
    sleep(sleepTime);
  }
};

provendb.currentVersion = () => {
  var cv = db.getCollection('_provendb_currentVersion').findOne();
  var now = new Date();
  printjson(cv);
  if (cv.started) {
    var started = new Date(cv.started.t * 1000);
    print('started time', started, (now - started) / 1000, 'sec ago');
  }
  if (cv.valid) {
    var valid = new Date(cv.valid.t * 1000);
    print('valid time', valid, (now - valid) / 1000, 'sec ago');
  }
};

provendb.rollback = () => {
  db.runCommand({ rollback: 1 });
  provendb.currentVersion();
};

provendb.compact = (startVersion, endVersion) => {
  return db.runCommand({
    compact: {
      startVersion,
      endVersion
    }
  });
};

provendb.docHistory = (collection, filter) => {
  return db.runCommand({
    docHistory: {
      collection,
      filter
    }
  });
};

provendb.getDocProof = (collection, filter) => {
  return db.runCommand({
    getDocumentProof: {
      collection,
      filter,
      version: provendb.version()
    }
  });
};

provendb.listVersions = listVersionArgs => {
  // arguments contains the following attributes
  // startDate: ISODate start of date range endDate: ISODate end of date range
  // limit: No of versions to retur sort order: 1 for ascending ended date, -1 for
  // descending ended Date NB: Only versions with an ended status will be
  // returned.
  let startDate = new Date() - 24 * 3600 * 1000; // Default to 1 day ago
  let endDate = new Date(); // Default to now
  let limit = 10;
  let sortDirection = -1;

  if ('startDate' in listVersionArgs) startDate = listVersionArgs.startDate;
  if ('endDate' in listVersionArgs) endDate = listVersionArgs.endDate;
  if ('limit' in listVersionArgs) limit = listVersionArgs.limit;
  if ('sortDirection' in listVersionArgs) sortDirection = listVersionArgs.sortDirection;

  assert(sortDirection === 1 || sortDirection === -1, 'Sort direction must be 1 or -1');

  const startTs = new Timestamp(startDate / 1000, 0);
  const endTs = new Timestamp(endDate / 1000, 0);

  const returnedVersions = [];
  db
    .getCollection('_provendb_versions')
    .find({
      $and: [
        {
          valid: {
            $gte: startTs
          }
        },
        {
          valid: {
            $lte: endTs
          }
        }
      ]
    })
    .sort({ ended: sortDirection })
    .limit(limit)
    .forEach(ver => {
      effectiveTime = new Date(ver.valid.t * 1000);
      returnedVersions.push({ version: ver.version, status: ver.status, effectiveTime });
    });
  return returnedVersions;
};
