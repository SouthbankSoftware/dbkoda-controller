/**
 * Created by joey on 23/6/17.
 */

const shelljs = require('shelljs');
const os = require('os');
const rimraf = require('rimraf');
const strip = require('strip-comments');
const path = require('path');
const fs = require('fs');

rimraf('lib/all-in-one.js', [], () => {
  let command;
  if (os.platform() === 'win32') {
    command = 'for /R %f in (src\\mongoScripts\\*.js) do type "%f" >> lib\\all-in-one.js';
  } else {
    command = 'cat src/mongoScripts/*.js >> lib/all-in-one.js';
  }
  shelljs.exec(command);

  const scriptPath = path.resolve(__dirname, '../lib/all-in-one.js');
  const script = fs.readFileSync(scriptPath, { encoding: 'utf8' });
  const strippedScript = strip(script);
  fs.writeFileSync(scriptPath, strippedScript);
});
