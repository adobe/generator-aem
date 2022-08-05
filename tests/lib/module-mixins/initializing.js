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

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import _ from 'lodash';
import tempDirectory from 'temp-dir';

import test from 'ava';
import ModuleMixins from '../../../lib/module-mixins.js';
import { fixturePath } from '../../fixtures/helpers.js';

class Mock {
  constructor(configData, ...fixturePaths) {
    this.config = new Config();

    _.each(configData, (v, k) => {
      this.config.set(k, v);
    });

    this.fs = {
      exists(path) {
        return fs.existsSync(path);
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      }
    };
    this.destinationPath = (...partials) => {
      return fixturePath(...fixturePaths, ...partials);
    };

    this.destinationRoot = () => {
    };
  }
}

class Config {
  constructor() {
    this.map = new Map();
  }

  get = function(key) {
    return this.map.get(key);
  };

  set = function(key, value) {
    return this.map.set(key, value);
  };

  getAll = function() {
    return Object.fromEntries(this.map);
  };
}

test('yo-rc.json exists - is parent - no generateInto provided - errors', (t) => {
  t.plan(2);

  const generator = new Mock({}, 'yo-rc', 'tree');
  generator.options = {};
  const error = t.throws(() => {
    ModuleMixins._initializing.call(generator);
  });
  t.regex(error.message, /Running Sub-Generator requires a destination path, when running from project root./, 'Error message correct.');
});

test('no parent option data - no parent yo-rc - errors', (t) => {
  t.plan(2);
  const generator = new Mock({}, 'yo-rc', 'empty', 'empty');
  generator.options = {};

  const error = t.throws(() => {
    ModuleMixins._initializing.call(generator);
  });
  t.regex(error.message, /You are trying to use the .+ Generator without the context of a parent project/, 'Error message correct.');
});

test('loaded from options', (t) => {
  t.plan(3);

  class A3MTestGenrator extends Mock {
    // Misspelled intentionally.
    options = {
      appId: 'test',
      artifactId: 'module',
      generateInto: 'empty',
      parent: {
        groupId: 'com.adobe.test',
        artifactId: 'parent',
        version: 'parent-version',
      },
    };
  }

  const expectedProps = {
    appId: 'test',
    artifactId: 'module',
  };

  const expectedParent = {
    groupId: 'com.adobe.test',
    artifactId: 'parent',
    version: 'parent-version',
  };

  const generator = new A3MTestGenrator({}, 'yo-rc', 'empty', 'empty');
  ModuleMixins._initializing.call(generator);
  t.is(generator.moduleName, 'A3MTestGenrator', 'Sets module name');
  t.deepEqual(generator.props, expectedProps, 'Properties set');
  t.deepEqual(generator.parentProps, expectedParent, 'Parent set');
});

test('loaded from yo-rc', (t) => {
  t.plan(2);

  const expectedProps = {
    appId: 'test',
    artifactId: 'module',
  };

  const generator = new Mock(expectedProps, 'yo-rc', 'tree', 'existing');
  generator.options = {
    generateInto: 'empty',
  };

  const expectedParent = {
    examples: true,
    name: 'Local Yo',
    appId: 'localyo',
    groupId: 'com.test.localyo',
    artifactId: 'localyo',
    version: '1.0-LOCALYO',
    javaVersion: '8',
    aemVersion: 'localyo',
    nodeVersion: 'localyo',
    npmVersion: 'localyo',
  };

  ModuleMixins._initializing.call(generator);
  t.deepEqual(generator.props, expectedProps, 'Properties set');
  t.deepEqual(generator.parentProps, expectedParent, 'Parent set');
});

test('loaded from pom', (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));

  const generator = {
    options: {
      generateInto: 'test',
    },
    config: new Config(),
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      }
    },
    destinationPath(...partials) {
      return path.join(temporaryDir, 'test', ...partials);
    },
    destinationRoot() {
    },
  };

  fs.mkdirSync(path.join(temporaryDir));
  fs.copyFileSync(fixturePath('yo-rc', 'full', '.yo-rc.json'), path.join(temporaryDir, '.yo-rc.json'));
  fs.mkdirSync(path.join(temporaryDir, 'test'));
  fs.copyFileSync(fixturePath('pom', 'partial', 'pom.xml'), path.join(temporaryDir, 'test', 'pom.xml'));

  const expectedProps = {
    artifactId: 'pom.artifactid',
  };

  const expectedParent = {
    examples: true,
    name: 'Local Yo',
    appId: 'localyo',
    groupId: 'com.test.localyo',
    artifactId: 'localyo',
    version: '1.0-LOCALYO',
    javaVersion: '8',
    aemVersion: 'localyo',
    nodeVersion: 'localyo',
    npmVersion: 'localyo',
  };

  ModuleMixins._initializing.call(generator);
  t.deepEqual(generator.props, expectedProps, 'Properties set');
  t.deepEqual(generator.parentProps, expectedParent, 'Parent set');
});

test('merged', (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));

  const generator = {
    options: {
      generateInto: 'test',
    },
    config: new Config(),
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      }
    },
    destinationPath(...partials) {
      return path.join(temporaryDir, 'test', ...partials);
    },
    destinationRoot() {
    },
  };

  generator.config.set('name', 'Local Yo');

  fs.mkdirSync(path.join(temporaryDir));
  fs.copyFileSync(fixturePath('yo-rc', 'full', '.yo-rc.json'), path.join(temporaryDir, '.yo-rc.json'));
  fs.mkdirSync(path.join(temporaryDir, 'test'));
  fs.copyFileSync(fixturePath('yo-rc', 'tree', 'existing', '.yo-rc.json'), path.join(temporaryDir, 'test', '.yo-rc.json'));
  fs.copyFileSync(fixturePath('pom', 'partial', 'pom.xml'), path.join(temporaryDir, 'test', 'pom.xml'));

  const expectedProps = {
    artifactId: 'pom.artifactid',
    name: 'Local Yo',
  };

  const expectedParent = {
    examples: true,
    name: 'Local Yo',
    appId: 'localyo',
    groupId: 'com.test.localyo',
    artifactId: 'localyo',
    version: '1.0-LOCALYO',
    javaVersion: '8',
    aemVersion: 'localyo',
    nodeVersion: 'localyo',
    npmVersion: 'localyo',
  };

  ModuleMixins._initializing.call(generator);
  t.deepEqual(generator.props, expectedProps, 'Properties set');
  t.deepEqual(generator.parentProps, expectedParent, 'Parent set');
});
