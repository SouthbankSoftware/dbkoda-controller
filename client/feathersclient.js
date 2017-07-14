/**
 * @Author: joey
 * @Date:   2016-12-20T14:05:19+11:00
 * @Last modified by:   joey
 * @Last modified time: 2016-12-29T15:59:28+11:00
 */
const feathers = require('feathers-client');
const rest = require('feathers-rest/client');

// const socketio = require('feathers-socketio/client');
// const rest = require('feathers-rest/client');

// const hooks = require('feathers-hooks');
// const io = require('socket.io-client');
const Primus = require('../public/dist/primus.js');
let primus = new Primus('http://localhost:3030');
let app = feathers()
  .configure(feathers.hooks())
  .configure(feathers.primus(primus));

console.log('create mongo shell client');
let connect = app.service('/mongo-connection');
let shell = app.service('/mongo-shells');
let inspector = app.service('/mongo-inspector');
const syncShell = app.service('/mongo-sync-execution')
inspector.timeout = 3000;


connect.on('created', (msg) => {
  console.log('get response from creating connection ', msg);
    setTimeout(()=> {
      syncShell.update(msg.id, {'shellId': msg.shellId, 'commands': 'use m102;\nshow dbs\nshow collections;'})
        .then(v => console.log("get output ", v));
    },1000);
  // shell.create({id: msg.id})
  //   .then((value) => {
  //     console.log('create new shell ', value);
  //     shell.update(msg.id, {'shellId': value.shellId, 'commands': 'show dbs'})
  //       .then((vv) => {
  //         console.log('try to remove shell connection');
  //         shell.remove(msg.id, {query: {shellId: value.shellId}})
  //           .then(r => console.log('removed ', r));
  //       });
  //   });
  // inspector.get(msg.id)
  //   .then((value) => {
  //     console.log('get inspect result ', JSON.stringify(value));
  //   }).catch((err) => {
  //   console.error(err);
  // });
  // setTimeout(() => {
  //   shell.get(msg.id, {
  //     query: {
  //       shellId: msg.shellId,
  //       type: 'script',
  //       content: '/Users/joey/tmp/mongo.test'
  //     }
  //   });
  // }, 1000);
  setTimeout(() => {
    // shell.update(msg.id, {'shellId': msg.shellId, 'commands': 'show dbs'});
  }, 2000);

  // setTimeout(() => {
  //   connect.remove(msg.id);
  // }, 2000);
});

connect.create({}, {
  query: {
    url: 'mongodb://localhost',
    ssl: false,
    test: false,
    authorization: true
  }
})
  .then((r) => {
    console.log('get response in then ', r);
  })
  .catch((e) => {
    console.log('got error: ', e);
  });
