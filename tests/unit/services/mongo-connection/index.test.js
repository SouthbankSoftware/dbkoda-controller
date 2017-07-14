/**
 * @Last modified by:   guiguan
 * @Last modified time: 2017-04-18T11:29:10+10:00
 */

const assert = require('assert');
const app = require('../../../../src/app');

describe('mongo-connection service', () => {
  it('registered the mongo-connection service', () => {
    const connect = app.service('mongo-connection');
    assert.ok(connect);
  });

  it('escape special characters in password from url', () => {
    const connect = app.service('mongo/connection/controller');
    let uri = 'mongodb://admin:123456@mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017/admin?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin';
    let output = connect.parseMongoConnectionURI({ url: uri });
    assert.equal(
      output.url,
      'mongodb://mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017/admin?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin',
    );
    assert.equal('admin', output.username);
    assert.equal('123456', output.password);
    assert.equal('mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017', output.hosts);
    assert.equal('true', output.options.ssl);
    assert.equal('Cluster0-shard-0', output.options.replicaSet);

    uri = 'mongodb://admin:123@456@mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017/admin?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin';
    output = connect.parseMongoConnectionURI({ url: uri });
    assert.equal(
      output.url,
      'mongodb://mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017/admin?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin',
    );
    assert.equal(output.username, 'admin');
    assert.equal(output.password, '123@456');

    uri = 'mongodb://localhost:27017';
    output = connect.parseMongoConnectionURI({ url: uri });
    assert.equal(output.url, 'mongodb://localhost:27017/test');
    assert.equal(output.username, undefined);
    assert.equal(output.password, undefined);

    uri = 'mongodb://username:$#@*^&@www.google.com:123456';
    output = connect.parseMongoConnectionURI({ url: uri });
    assert.equal(output.url, 'mongodb://www.google.com:123456/test');
    assert.equal(output.username, 'username');
    assert.equal(output.password, '$#@*^&');

    uri = 'mongodb://username:$#@*^%&@www.google.com:123456';
    output = connect.parseMongoConnectionURI({ url: uri });
    assert.equal(output.url, 'mongodb://www.google.com:123456/test');
    assert.equal(output.username, 'username');
    assert.equal(output.password, '$#@*^%&');
  });

  it('test database name on url', () => {
    const connect = app.service('mongo/connection/controller');
    const uri = 'mongodb://admin:123456@mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017/admin?ssl=true&replicaSet=Cluster0-shard-0';
    const output = connect.parseMongoConnectionURI({ url: uri });
    assert.equal(output.database, 'admin');
    assert.equal(output.username, 'admin');
    assert.equal(output.password, '123456');
  });

  it('test database defined in field have higher priority than url', () => {
    const connect = app.service('mongo/connection/controller');
    const uri = 'mongodb://admin:123456@mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017/admin?ssl=true&replicaSet=Cluster0-shard-0';
    const output = connect.parseMongoConnectionURI({ url: uri, database: 'test' });
    assert.equal(output.database, 'test');
  });

  it('test default database', () => {
    const connect = app.service('mongo/connection/controller');
    const uri = 'mongodb://admin:123456@mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017?ssl=true&replicaSet=Cluster0-shard-0';
    const output = connect.parseMongoConnectionURI({ url: uri, database: 'test' });
    assert.equal(output.database, 'test');
    assert.equal(
      output.url,
      'mongodb://mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0',
    );
  });

  it('test username and password in field have higher priority than that in uri', () => {
    const connect = app.service('mongo/connection/controller');
    const uri = 'mongodb://admin:123456@mongodb.net:27017,mongodb.net:27017,00-02-xxxxxxxxxxx.mongodb.net:27017/admin?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin';
    const output = connect.parseMongoConnectionURI({
      url: uri,
      username: 'aaaa',
      password: 'bbbb',
    });
    assert.equal(output.username, 'aaaa');
    assert.equal(output.password, 'bbbb');
    assert.equal(output.database, 'admin');
  });

  it('test connection on altas server url', () => {
    const connect = app.service('mongo/connection/controller');
    const uri = 'mongodb://cluster0-shard-00-00-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-01-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-02-xxxxxxxxxxx.mongodb.net:27017/admin?replicaSet=Cluster0-shard-0';
    const output = connect.parseMongoConnectionURI({
      url: uri,
      username: 'dbKoda',
      password: '123456',
    });
    assert.equal(output.username, 'dbKoda');
    assert.equal(output.password, '123456');
    assert.equal(output.database, 'admin');
    assert.equal(output.url, uri);
    assert.equal(output.hosts, 'cluster0-shard-00-00-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-01-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-02-xxxxxxxxxxx.mongodb.net:27017');
  });

  it('test connection on altas server url database', () => {
    const connect = app.service('mongo/connection/controller');
    let uri = 'mongodb://cluster0-shard-00-00-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-01-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-02-xxxxxxxxxxx.mongodb.net:27017/admin?replicaSet=Cluster0-shard-0';
    let output = connect.parseMongoConnectionURI({
      url: uri,
      username: 'dbKoda',
      password: '123456',
      database: 'test',
    });
    assert.equal(output.username, 'dbKoda');
    assert.equal(output.password, '123456');
    assert.equal(output.database, 'test');
    assert.equal(
      output.url,
      'mongodb://cluster0-shard-00-00-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-01-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-02-xxxxxxxxxxx.mongodb.net:27017/test?replicaSet=Cluster0-shard-0',
    );

    uri = 'mongodb://admin:pwd@2016@cluster0-shard-00-00-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-01-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-02-xxxxxxxxxxx.mongodb.net:27017/admin?replicaSet=Cluster0-shard-0';
    output = connect.parseMongoConnectionURI({ url: uri, database: 'test' });
    assert.equal(output.username, 'admin');
    assert.equal(output.password, 'pwd@2016');
    assert.equal(output.database, 'test');
    assert.equal(
      output.url,
      'mongodb://cluster0-shard-00-00-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-01-xxxxxxxxxxx.mongodb.net:27017,cluster0-shard-00-02-xxxxxxxxxxx.mongodb.net:27017/test?replicaSet=Cluster0-shard-0',
    );
  });

  it('test parse username and password', () => {
    const connect = app.service('mongo/connection/controller');
    let uri = 'mongodb://ec2-xxxxxxxxxxx.ap-southeast-2.compute.amazonaws.com';
    let output = connect.parseMongoConnectionURI({
      url: uri,
      username: 'ssssss',
      password: 'ddddd',
      database: 'admin',
      authorization: true,
      ssl: '',
      test: false,
    });
    assert.equal(output.url, uri + '/admin');
    assert.equal(output.username, 'ssssss');
    assert.equal(output.password, 'ddddd');

    uri = 'mongodb://aaaa:bbbb@ec2-xxxxxxxxxxx.ap-southeast-2.compute.amazonaws.com';
    output = connect.parseMongoConnectionURI({
      url: uri,
      username: 'ssssss',
      password: 'ddddd',
      database: 'admin',
      authorization: true,
      ssl: '',
      test: false,
    });
    assert.equal(
      output.url,
      'mongodb://ec2-xxxxxxxxxxx.ap-southeast-2.compute.amazonaws.com/admin',
    );
    assert.equal(output.username, 'ssssss');
    assert.equal(output.password, 'ddddd');
  });

  it('test connection to localhost with different port number', () => {
    const connect = app.service('mongo/connection/controller');
    const uri = 'mongodb://localhost:27018';
    const output = connect.parseMongoConnectionURI({ url: uri });
    assert.equal(output.url, 'mongodb://localhost:27018/test');
  });

  it('test connection url without port', () => {
    const connect = app.service('mongo/connection/controller');
    const uri = 'mongodb://localhost';
    const output = connect.parseMongoConnectionURI({ url: uri });
    assert.equal(output.hosts, 'localhost:27017');
    assert.equal(output.database, 'test');
  });
});
