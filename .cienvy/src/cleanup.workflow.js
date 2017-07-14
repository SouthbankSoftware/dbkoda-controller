/**
 * @Author: guiguan
 * @Date:   2017-05-16T17:40:46+10:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-06-14T16:16:23+10:00
 */

import path from 'path';

export default (
  app,
  cwd,
  { exec }
) => {
  l.notice('Cleaning up...');
  return exec('rm -rf data');
};
