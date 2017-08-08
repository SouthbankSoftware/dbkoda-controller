// const shelljs = require('shelljs');
const os = require('os');
const child_process = require('child_process');

// const TMP_DIR = os.platform() !== 'win32' ? 'data' : '/tmp/data';

// const MLAUNCH = os.platform() !== 'win32' ? 'mlaunch' : 'bash -c "mlaunch ';
// const MGENERATE = os.platform() !== 'win32' ? 'mgenerate' : 'bash -c ^"mgenerate ';
const TMP_DIR = 'data';
const MLAUNCH = 'mlaunch';
const MGENERATE = 'mgenerate';
/**
 * generate random port number between 6000 and 7000
 * @returns {number}
 */
const getRandomPort = () => {
  return Math.floor(Math.random() * 7000) + 6000;
};

/**
 * launch mongodb instance
 *
 * @param  type [description]
 */
const launchMongoInstance = (type, port, parameters) => {
  let command = MLAUNCH +
    ' init ' +
    type +
    ' --dir ' +
    TMP_DIR +
    '/' +
    port +
    ' --port ' +
    port +
    ' ' + '  --hostname localhost ' +
    parameters;
  if (os.platform() === 'win32') {
    command += '"';
  }
  console.log('launch command ', command);
  child_process.exec(command);
};
// const output = child_process.exec('start /b mongod --dbpath data')
// console.log('launched')
/**
 * launch a single mongodb instance
 *
 */
const launchSingleInstance = (port, parameters = '') => {
  launchMongoInstance('--single', port, parameters);
};

/**
 * launch replica set
 *
 */
const launchReplicaSet = (port, nodenumber, parameters) => {
  console.log('launch replica set ', port);
  launchMongoInstance('--replicaset', port, '--nodes ' + nodenumber + ' ' + parameters);
};

/**
 * launch a mongos clusters
 * @param port
 * @param nodenumber
 * @param parameters
 */
const launchMongos = (port, nodenumber, parameters) => {
  launchMongoInstance('--mongos ' + nodenumber, port, parameters);
};


let templateJson = '{    \"user\": {        \"name\": {            \"first\": {\"$choose\": [\"Liam\", \"Noah\", \"Ethan\", \"Mason\", \"Logan\", \"Jacob\", \"Lucas\", \"Jackson\", \"Aiden\", \"Jack\", \"James\", \"Elijah\", \"Luke\", \"William\", \"Michael\", \"Alexander\", \"Oliver\", \"Owen\", \"Daniel\", \"Gabriel\", \"Henry\", \"Matthew\", \"Carter\", \"Ryan\", \"Wyatt\", \"Andrew\", \"Connor\", \"Caleb\", \"Jayden\", \"Nathan\", \"Dylan\", \"Isaac\", \"Hunter\", \"Joshua\", \"Landon\", \"Samuel\", \"David\", \"Sebastian\", \"Olivia\", \"Emma\", \"Sophia\", \"Ava\", \"Isabella\", \"Mia\", \"Charlotte\", \"Emily\", \"Abigail\", \"Avery\", \"Harper\", \"Ella\", \"Madison\", \"Amelie\", \"Lily\", \"Chloe\", \"Sofia\", \"Evelyn\", \"Hannah\", \"Addison\", \"Grace\", \"Aubrey\", \"Zoey\", \"Aria\", \"Ellie\", \"Natalie\", \"Zoe\", \"Audrey\", \"Elizabeth\", \"Scarlett\", \"Layla\", \"Victoria\", \"Brooklyn\", \"Lucy\", \"Lillian\", \"Claire\", \"Nora\", \"Riley\", \"Leah\"] },            \"last\": {\"$choose\": [\"Smith\", \"Jones\", \"Williams\", \"Brown\", \"Taylor\", \"Davies\", \"Wilson\", \"Evans\", \"Thomas\", \"Johnson\", \"Roberts\", \"Walker\", \"Wright\", \"Robinson\", \"Thompson\", \"White\", \"Hughes\", \"Edwards\", \"Green\", \"Hall\", \"Wood\", \"Harris\", \"Lewis\", \"Martin\", \"Jackson\", \"Clarke\", \"Clark\", \"Turner\", \"Hill\", \"Scott\", \"Cooper\", \"Morris\", \"Ward\", \"Moore\", \"King\", \"Watson\", \"Baker\" , \"Harrison\", \"Morgan\", \"Patel\", \"Young\", \"Allen\", \"Mitchell\", \"James\", \"Anderson\", \"Phillips\", \"Lee\", \"Bell\", \"Parker\", \"Davis\"] }        },        \"gender\": {\"$choose\": [\"female\", \"male\"]},        \"age\": \"$number\",        \"address\": {            \"street\": {\"$string\": {\"length\": 10}},            \"house_no\": \"$number\",            \"zip_code\": {\"$number\": [10000, 99999]},            \"city\": {\"$choose\": [\"Manhattan\", \"Brooklyn\", \"New Jersey\", \"Queens\", \"Bronx\"]}        },        \"phone_no\": { \"$missing\" : { \"percent\" : 30, \"ifnot\" : {\"$number\": [1000000000, 9999999999]} } },        \"created_at\": {\"$date\": [\"2010-01-01\", \"2014-07-24\"] },        \"is_active\": {\"$choose\": [true, false]}    },    \"tags\": {\"$array\": {\"of\": {\"label\": \"$string\", \"id\": \"$oid\", \"subtags\":        {\"$missing\": {\"percent\": 80, \"ifnot\": {\"$array\": [\"$string\", {\"$number\": [2, 5]}]}}}}, \"number\": {\"$number\": [0, 10] }}}}';
if (os.platform() === 'win32') {
  templateJson = templateJson.replace(/\"/g, '\\"');;
}

/**
 * generate mongo dump data on the collection
 *
 * @param port
 * @param dbName
 * @param colName
 * @param parameters
 */
const generateMongoData = (port, dbName = 'test', colName = 'test', parameters = '') => {
  let command = MGENERATE + ' \'' + templateJson + '\' --num 1 --port ' +
    port +
    ' --database ' +
    dbName +
    ' --collection ' +
    colName +
    ' ' +
    parameters;
  if (os.platform() === 'win32') {
    command += '"';
  }
  child_process.execSync(command);
  console.log('finish generating data:' + command);
};

/**
 * shutdown mongo instance based on port number
 *
 * @param port
 */
const killMongoInstance = (port) => {
  const command = MLAUNCH + ' kill --dir ' + TMP_DIR + '/' + port;
  child_process.execSync(command);
  os.platform() !== 'win32' ? child_process.execSync('rm -fr ' + TMP_DIR + '/' + port) : child_process.execSync('bash -c "rm -fr ' + TMP_DIR + '/' + port + '"');
};

module.exports = {
  launchSingleInstance,
  killMongoInstance,
  launchMongoInstance,
  launchReplicaSet,
  launchMongos,
  getRandomPort,
  generateMongoData,
};
