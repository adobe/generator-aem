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

import tempDirectory from 'temp-dir';

import sinon from 'sinon/pkg/sinon-esm.js';
import test from 'ava';

import ModuleMixins from '../../../lib/module-mixins.js';
import PomUtils from '../../../lib/pom-utils.js';
import { fixturePath } from '../../fixtures/helpers.js';

test('no modules in parent', (t) => {
  t.plan(1);

  sinon.restore();
  const fake = sinon.fake.returns([]);
  sinon.replace(PomUtils, 'listParentPomModules', fake);
  const generator = {
    destinationPath() {
      return fixturePath('projects', 'cloud', 'module');
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path));
      },
    },
  };
  t.deepEqual(ModuleMixins._findModules.call(generator, 'unknown'), [], 'Empty list found');
  sinon.restore();
});

test('none of type', (t) => {
  t.plan(1);

  sinon.restore();
  const fake = sinon.fake.returns(['other']);
  sinon.replace(PomUtils, 'listParentPomModules', fake);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'module');
  fs.mkdirSync(temporaryDir, { recursive: true });
  fs.mkdirSync(fullPath);
  fs.mkdirSync(path.join(temporaryDir, 'other'));
  fs.writeFileSync(path.join(temporaryDir, 'other', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': {} }));

  const generator = {
    destinationPath() {
      return fullPath;
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path));
      },
    },
  };
  t.deepEqual(ModuleMixins._findModules.call(generator, 'unknown'), [], 'Empty list found');
  sinon.restore();
});

test('one of type', (t) => {
  t.plan(1);

  sinon.restore();
  const fake = sinon.fake.returns(['found', 'other']);
  sinon.replace(PomUtils, 'listParentPomModules', fake);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'module');
  fs.mkdirSync(temporaryDir, { recursive: true });
  fs.mkdirSync(fullPath);
  fs.mkdirSync(path.join(temporaryDir, 'other'));
  fs.writeFileSync(path.join(temporaryDir, 'other', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': {} }));

  fs.mkdirSync(path.join(temporaryDir, 'found'));
  fs.writeFileSync(path.join(temporaryDir, 'found', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:wanted': { artifactId: 'test.found' } }));

  const generator = {
    destinationPath() {
      return fullPath;
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path));
      },
    },
  };
  const expected = [{ path: 'found', artifactId: 'test.found' }];
  t.deepEqual(ModuleMixins._findModules.call(generator, '@adobe/generator-aem:wanted'), expected, 'List found');
  sinon.restore();
});

test('multiple of type', (t) => {
  t.plan(1);

  sinon.restore();
  const fake = sinon.fake.returns(['alsofound', 'other', 'found']);
  sinon.replace(PomUtils, 'listParentPomModules', fake);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'module');
  fs.mkdirSync(temporaryDir, { recursive: true });
  fs.mkdirSync(fullPath);
  fs.mkdirSync(path.join(temporaryDir, 'other'));
  fs.writeFileSync(path.join(temporaryDir, 'other', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': {} }));

  fs.mkdirSync(path.join(temporaryDir, 'found'));
  fs.writeFileSync(path.join(temporaryDir, 'found', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:wanted': { artifactId: 'test.found' } }));
  fs.mkdirSync(path.join(temporaryDir, 'alsofound'));
  fs.writeFileSync(path.join(temporaryDir, 'alsofound', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:wanted': { artifactId: 'test.alsofound' } }));

  const generator = {
    destinationPath() {
      return fullPath;
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path));
      },
    },
  };
  const expected = [
    { path: 'alsofound', artifactId: 'test.alsofound' },
    { path: 'found', artifactId: 'test.found' },
  ];
  t.deepEqual(ModuleMixins._findModules.call(generator, '@adobe/generator-aem:wanted'), expected, 'Empty list found');
  sinon.restore();
});

test('generator is in parent project (mixin)', (t) => {
  t.plan(1);
  sinon.restore();
  const fake = sinon.fake.returns(['alsofound', 'other', 'found']);
  sinon.replace(PomUtils, 'listParentPomModules', fake);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  fs.mkdirSync(temporaryDir, { recursive: true });
  fs.writeFileSync(path.join(temporaryDir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));

  fs.mkdirSync(path.join(temporaryDir, 'other'));
  fs.writeFileSync(path.join(temporaryDir, 'other', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': {} }));

  fs.mkdirSync(path.join(temporaryDir, 'found'));
  fs.writeFileSync(path.join(temporaryDir, 'found', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:wanted': { artifactId: 'test.found' } }));
  fs.mkdirSync(path.join(temporaryDir, 'alsofound'));
  fs.writeFileSync(path.join(temporaryDir, 'alsofound', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:wanted': { artifactId: 'test.alsofound' } }));

  const generator = {
    destinationPath() {
      return temporaryDir;
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path));
      },
    },
  };
  const expected = [
    { path: 'alsofound', artifactId: 'test.alsofound' },
    { path: 'found', artifactId: 'test.found' },
  ];
  t.deepEqual(ModuleMixins._findModules.call(generator, '@adobe/generator-aem:wanted'), expected, 'Empty list found');
  sinon.restore();
});
