/*
 Copyright 2022 Adobe Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

          http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import _ from 'lodash';
import test from 'ava';

import ModuleMixins from '../../../lib/module-mixins.js';

class Config {
  constructor() {
    this.map = new Map();
  }

  get = function (key) {
    return this.map.get(key);
  };

  set = function (key, value) {
    if (typeof key === 'object') {
      this.map = new Map(_.toPairs(key));
    } else {
      this.map.set(key, value);
    }
  };

  getAll = function () {
    return Object.fromEntries(this.map);
  };
}

test('no existing config - no parent', (t) => {
  const generator = {
    config: new Config(),
    props: {
      module: 'test',
    },
  };

  ModuleMixins._configuring.call(generator);
  t.deepEqual(generator.config.getAll(), { module: 'test' }, 'Saved Config');
});

test('existing config - parent data', (t) => {
  const generator = {
    config: new Config(),
    props: {
      module: 'test',
    },
  };

  generator.config.set({ module: 'not test' });
  ModuleMixins._configuring.call(generator);
  t.deepEqual(generator.config.getAll(), { module: 'test' }, 'Saved Config');
});
