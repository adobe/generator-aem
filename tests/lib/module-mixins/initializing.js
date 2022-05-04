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

import path from 'node:path';
import crypto from 'node:crypto';

import _ from 'lodash';
import tempDirectory from 'temp-dir';

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

test('requires moduleType', (t) => {
  t.plan(2);

  const generator = {};
  const error = t.throws(() => {
    ModuleMixins._initializing.call(generator);
  });
  t.regex(error.message, /`this\.moduleType` must be specified to use Module shared functions\./, 'Error message correct.');
});

test('requires parent', (t) => {
  t.plan(2);

  const generator = {
    moduleType: 'test',
    options: {},
    config: new Config(),
  };

  const error = t.throws(() => {
    ModuleMixins._initializing.call(generator);
  });
  t.regex(error.message, /Object Generator cannot be use outside existing project context\./, 'Error message correct.');
});

test('requires destination', (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));

  const generator = {
    moduleType: 'test',
    options: {
      parent,
    },
    config: new Config(),
    destinationRoot() {
      return temporaryDir;
    },
    contextRoot: temporaryDir,
  };

  const error = t.throws(() => {
    ModuleMixins._initializing.call(generator);
  });
  t.regex(error.message, /Generator must either specify a destination folder via/, 'Error message correct.');
});

test('moduleType must match config', (t) => {
  t.plan(2);

  const generator = {
    moduleType: 'test',
    options: {
      generateInto: 'nottest',
    },
    config: new Config(),
  };

  generator.config.set('nottest', { moduleType: 'nottest' });

  const error = t.throws(() => {
    ModuleMixins._initializing.call(generator);
  });
  t.regex(error.message, /Refusing to create Object module in a non Object module directory\./, 'Error message correct.');
});

test('destinationRoot != contextRoot', (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));

  class AEMTestGenerator {
    moduleType = 'test';

    options = {
      parent,
    };

    config = new Config();

    contextRoot = path.join(temporaryDir, 'test');
    destinationRoot = function () {
      return temporaryDir;
    };

    _loadProps = function () {
      return {};
    };
  }

  const configValues = {
    name: 'name',
    boolean: false,
    number: 1.233,
  };

  const expected = {
    moduleType: 'test',
    parent,
    ...configValues,
  };

  const generator = new AEMTestGenerator();
  generator.config.set('test', configValues);

  _.each(parent, (v, k) => {
    generator.config.set(k, v);
  });

  ModuleMixins._initializing.call(generator);
  t.is(generator.moduleName, 'Test', 'Sets module name');
  t.deepEqual(generator.props, expected, 'Properties set');
});

test('generateInto', (t) => {
  t.plan(2);

  class A3MTestGenrator {
    // Misspelled intentionally.
    moduleType = 'test';

    options = {
      generateInto: 'test',
      parent: {
        groupId: 'com.adobe.test',
      },
    };

    config = new Config();

    _loadProps = function () {
      return {
        artifactId: 'artifactId',
      };
    };
  }

  const configValues = {
    name: 'name',
    boolean: false,
    number: 1.233,
  };

  const expected = {
    moduleType: 'test',
    artifactId: 'artifactId',
    parent: {
      groupId: 'com.adobe.test',
      artifactId: 'parent',
      version: 'parent',
      aemVersion: 'parent',
    },
    ...configValues,
  };

  const generator = new A3MTestGenrator();
  generator.config.set('test', configValues);

  _.each(parent, (v, k) => {
    generator.config.set(k, v);
  });

  ModuleMixins._initializing.call(generator);
  t.is(generator.moduleName, 'A3MTestGenrator', 'Sets module name');
  t.deepEqual(generator.props, expected, 'Properties set');
});
