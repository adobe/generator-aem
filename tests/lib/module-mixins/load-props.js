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

import test from 'ava';

import ModuleMixins from '../../../lib/module-mixins.js';

const parent = Object.freeze({
  groupId: 'parent',
  artifactId: 'parent',
  version: 'parent',
  aemVersion: 'parent',
});

class Config {
  constructor() {
    this.map = new Map();
  }

  get = function (key) {
    return this.map.get(key);
  };

  set = function (key, value) {
    return this.map.set(key, value);
  };

  getAll = function () {
    return Object.fromEntries(this.map);
  };
}

test('requires relativePath', (t) => {
  t.plan(4);

  const generator = {};
  let error = t.throws(() => {
    ModuleMixins._loadProps.call(generator);
  });
  t.regex(error.message, /Config\/pom relative path must be specified\./, 'Error message correct.');

  error = t.throws(() => {
    ModuleMixins._loadProps.call(generator, '');
  });
  t.regex(error.message, /Config\/pom relative path must be specified\./, 'Error message correct.');
});

test('no defaults, merges correctly', (t) => {
  t.plan(1);

  const relativePath = 'test';

  const generator = {
    options: {
      examples: true,
    },
    config: new Config(),
    destinationPath(portion) {
      return portion;
    },
    _readPom(path) {
      if (path && path.length > 0) {
        return { artifactId: 'test.artifactId' };
      }

      return parent;
    },
  };

  const configValues = {
    examples: false,
    name: 'TestModule',
    appId: 'test',
  };

  generator.config.set(relativePath, configValues);
  generator.config.set('groupId', 'com.adobe.test');

  const loaded = ModuleMixins._loadProps.call(generator, relativePath);

  t.deepEqual(
    loaded,
    {
      examples: true,
      name: 'TestModule',
      appId: 'test',
      artifactId: 'test.artifactId',
      parent: {
        groupId: 'com.adobe.test',
        artifactId: 'parent',
        version: 'parent',
        aemVersion: 'parent',
      },
    },
    'Properties merged correctly.'
  );
});

test('defaults, merges correctly', (t) => {
  t.plan(1);

  const relativePath = 'test';

  const generator = {
    options: {
      defaults: true,
    },
    config: new Config(),
    destinationPath(portion) {
      return portion;
    },
    _readPom(path) {
      if (path && path.length > 0) {
        return {};
      }

      return parent;
    },
  };

  const configValues = {
    name: 'TestModule',
    appId: 'test',
  };

  generator.config.set(relativePath, configValues);
  generator.config.set('groupId', 'com.adobe.test');

  const loaded = ModuleMixins._loadProps.call(generator, relativePath);

  t.deepEqual(
    loaded,
    {
      defaults: true,
      examples: false,
      name: 'TestModule',
      appId: 'test',
      artifactId: 'test',
      parent: {
        groupId: 'com.adobe.test',
        artifactId: 'parent',
        version: 'parent',
        aemVersion: 'parent',
      },
    },
    'Properties merged correctly.'
  );
});
