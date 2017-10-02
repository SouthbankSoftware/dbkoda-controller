import { loadCommands } from '../../config';

const configObj = loadCommands();
const JDBC = require('jdbc');
const jinst = require('jdbc/lib/jinst');

if (!jinst.isJvmCreated()) {
  const drillJdbcClassPath = configObj.drillCmd +
    '/jars/jdbc-driver/drill-jdbc-all-1.11.0.jar';
  jinst.addOption('-Xrs');
  jinst.setupClasspath([drillJdbcClassPath]);
}

exports.getJdbcInstance = function(conf, callback) {
  const drill = new JDBC(conf);
  drill.initialize((err) => {
    if (err) {
      return callback(err);
    }
    return callback(null, drill);
  });
};
