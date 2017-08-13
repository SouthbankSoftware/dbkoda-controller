/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T13:28:43+10:00
 */

// if unit test is run beforehand, we need to remove this Node module cache
const feathers = require('feathers-client');

delete require.cache[require.resolve('../../../src/app')];
const controller = require('../../../src/app');
const Primus = require('../../../public/dist/primus.js'); // eslint-disable-line import/no-unresolved

const PORT = Math.floor(Math.random() * 1000) + 2000;
const primus = new Primus('http://localhost:' + PORT);
const app = feathers().configure(feathers.hooks()).configure(feathers.primus(primus));
const SERVICE_TIMEOUT = 30000;
const connection = app.service('/mongo-connection');
connection.timeout = SERVICE_TIMEOUT;
const shell = app.service('/mongo-shells');
shell.timeout = SERVICE_TIMEOUT;
const inspector = app.service('/mongo-inspector');
inspector.timeout = SERVICE_TIMEOUT;
const autoComplete = app.service('/mongo-auto-complete');
autoComplete.timeout = SERVICE_TIMEOUT;
const syncExecution = app.service('/mongo-sync-execution');
syncExecution.timeout = SERVICE_TIMEOUT;

controller.listen(PORT);

module.exports = {
  app,
  TIMEOUT: 30000,
  WIN_TIMEOUT: 5000,
  shell,
  connection,
  inspector,
  autoComplete,
  syncExecution,
  events: {
    OUTPUT: 'shell-output',
  },
  controller,
  PORT,
  getRandomPort: () => {
    return Math.floor(Math.random() * 7000) + 6000;
  },
};
