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

import test from 'ava';

import { addModulesToPom, fixturePath } from '../../fixtures/helpers.js';
import ModuleMixins from '../../../lib/module-mixins.js';

test('no duplicate', (t) => {
  t.plan(1);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'module');

  fs.mkdirSync(fullPath, { recursive: true });
  fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
  addModulesToPom(temporaryDir, ['someother', 'module']);

  fs.mkdirSync(path.join(temporaryDir, 'someother'), { recursive: true });

  fs.writeFileSync(path.join(temporaryDir, 'someother', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:someother': {} }));

  const generator = {
    destinationPath() {
      return fullPath;
    },
    rootGeneratorName() {
      return '@adobe/generator-aem:test';
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path));
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
    },
  };

  t.notThrows(() => {
    ModuleMixins._duplicateCheck.call(generator);
  }, 'Does not error.');
});

test('same folder', (t) => {
  t.plan(1);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'module');

  fs.mkdirSync(fullPath, { recursive: true });
  fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));

  addModulesToPom(temporaryDir, ['module']);

  fs.writeFileSync(path.join(temporaryDir, 'module', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:test': {} }));

  const generator = {
    destinationPath() {
      return fullPath;
    },
    rootGeneratorName() {
      return '@adobe/generator-aem:test';
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path));
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
    },
  };

  t.notThrows(() => {
    ModuleMixins._duplicateCheck.call(generator);
  }, 'Does not error.');
});

test('duplicate', (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'module');

  fs.mkdirSync(fullPath, { recursive: true });
  fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
  addModulesToPom(temporaryDir, ['test', 'module']);
  fs.mkdirSync(path.join(temporaryDir, 'test'));
  fs.writeFileSync(path.join(temporaryDir, 'test', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:test': {} }));

  const generator = {
    destinationPath() {
      return fullPath;
    },
    rootGeneratorName() {
      return '@adobe/generator-aem:test';
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path));
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
    },
  };

  const error = t.throws(
    () => {
      ModuleMixins._duplicateCheck.call(generator);
    },
    undefined,
    'Duplicate generates an error.'
  );
  t.regex(error.message, /Refusing to create a second '@adobe\/generator-aem:test' module./, 'Error message matched');
});
