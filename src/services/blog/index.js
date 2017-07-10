/*
 * dbKoda - a modern, open source code editor, for MongoDB.
 * Copyright (C) 2017-2018 Southbank Software
 *
 * This file is part of dbKoda.
 *
 * dbKoda is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * dbKoda is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with dbKoda.  If not, see <http://www.gnu.org/licenses/>.
 */

const hooks = require('./hooks');
const rp = require('request-promise');
const parser = require('rss-parser');

class BlogService {
  constructor(options) {
    this.options = options || {};
    this.docs = {
      description: 'A service to get blog posts',
      get: {
        description: 'Get blog posts',
        parameters: [
          { in: 'path',
            required: false,
            name: 'number',
            type: 'integer'
          }
        ]
      }
    };
  }

  async get() {
    let resp = await rp('http://52.65.193.242/rss/');
    resp = await this.parse(resp);
    return Promise.resolve(resp);
  }

  parse(resp) { //eslint-disable-line
    return new Promise((resolve) => {
      parser.parseString(resp, (err, parsed) => {
        resolve(parsed);
      });
    });
  }
}

module.exports = function () {
  const app = this;

  // Initialize our service with any options it requires
  const service = new BlogService();
  app.use('/blog', service);

  // Get our initialize service to that we can bind hooks
  const blogService = app.service('/blog');

  // Set up our before hooks
  blogService.before(hooks.before);

  // Set up our after hooks
  blogService.after(hooks.after);
  return service;
};

module.exports.Service = BlogService;
