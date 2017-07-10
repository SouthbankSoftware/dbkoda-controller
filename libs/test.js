// var os = require('os');
var pty = require('node-pty').spawn;

// path to mongo shell on os
var ptyProcess = pty('mongo', undefined, {
  name: 'xterm-color',
  cols: 100,
  rows: 10000,
  cwd: process.env.HOME,
  env: process.env
});
const stripAnsi = require('strip-ansi');
const Streamify = require('./stream');

var LineStream = require('./byline').LineStream;
var lineStream = new LineStream();
ptyProcess.pipe(lineStream);
lineStream.on('readable', function() {
  var line;
  while (null !== (line = lineStream.read())) {
    console.log(line);
  }
  lineStream._flush(() => {});
});
lineStream.on('endOfOutput', function() {
  console.log('---------END--------');
});


ptyProcess.write('show collections{ \n');
// ptyProcess.write('}\r');
// ptyProcess.write('db.\t\t')