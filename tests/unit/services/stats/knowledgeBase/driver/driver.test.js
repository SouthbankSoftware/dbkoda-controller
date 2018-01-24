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
/**
 * Created by joey on 2/1/18.
 */

const {getKnowledgeBaseRules} = require('../../../../../../src/services/stats/knowledgeBase/driver');

const assert = require('assert');

describe('test knowledge base rules', () => {
  it('test loading kb rules', () => {
    const rules = getKnowledgeBaseRules({release: 'mongod', version: '3.4.4'});
    assert.equal('all', rules.release);
  });
});
