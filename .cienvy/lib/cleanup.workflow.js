'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (app, cwd, _ref) {
  var exec = _ref.exec;

  l.notice('Cleaning up...');
  return exec('rm -rf data');
}; /**
    * @Author: guiguan
    * @Date:   2017-05-16T17:40:46+10:00
    * @Last modified by:   guiguan
    * @Last modified time: 2017-06-14T16:16:23+10:00
    */

module.exports = exports['default'];
//# sourceMappingURL=cleanup.workflow.js.map