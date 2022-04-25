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
import helpers from 'yeoman-test';

import { fixturePath } from '../fixtures/helpers.js';
import Wrapper from '../fixtures/generators/module/index.js';

const parent = Object.freeze({
  groupId: 'parent',
  artifactId: 'parent',
  version: 'parent',
  aemVersion: 'parent',
});

test('ModuleFunctions - initialize - requires parent', async (t) => {
  t.plan(1);
  const options = { defaults: true };
  await t.throwsAsync(helpers.create(Wrapper).withOptions(options).run());
});

test('ModuleFunctions - initialize - requires destination', async (t) => {
  t.plan(1);
  await t.throwsAsync(helpers.create(Wrapper).withOptions({ parent }).run());
});

test('ModuleFunctions - initialize - no options', async (t) => {
  t.plan(1);
  await helpers
    .create(Wrapper)
    .withOptions({ generateInto: 'test', parent: { ...parent } })
    .run()
    .then((result) => {
      const expected = {
        parent,
        moduleType: 'wrapper',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('ModuleFunctions - initialize - defaults', async (t) => {
  t.plan(1);

  const options = { defaults: true, generateInto: 'doesnotexist', parent: { groupId: 'groupId' } };
  await helpers
    .create(Wrapper)
    .withOptions(options)
    .inTmpDir((temporary) => {
      fs.copyFileSync(fixturePath('yo-rc', 'parent-only', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: false,
        moduleType: 'wrapper',
        parent: {
          groupId: 'groupId',
          artifactId: 'localyo',
          version: '1.0-LOCALYO',
          aemVersion: 'localyo',
        },
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('ModuleFunctions - initialize from pom - in directory', async (t) => {
  t.plan(1);

  const artifact = 'core.bundle';
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, artifact);

  await helpers
    .create(Wrapper)
    .withOptions({ destinationRoot: temporaryDir })
    .inDir(fullPath, (temporary) => {
      fs.copyFileSync(fixturePath('yo-rc', 'parent-only', '.yo-rc.json'), path.join(temporaryDir, '.yo-rc.json'));
      fs.copyFileSync(fixturePath('pom', 'full', 'pom.xml'), path.join(temporary, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        artifactId: 'pom.artifactid',
        moduleType: 'wrapper',
        parent: {
          groupId: 'com.test.localyo',
          artifactId: 'localyo',
          version: '1.0-LOCALYO',
          aemVersion: 'localyo',
        },
      };
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('ModuleFunctions - initialize from pom - generateInto', async (t) => {
  t.plan(1);
  const subdir = 'subdir';
  await helpers
    .create(Wrapper)
    .withOptions({ generateInto: subdir, parent: { ...parent } })
    .inTmpDir((temporary) => {
      fs.mkdirSync(path.join(temporary, subdir));
      fs.copyFileSync(fixturePath('pom', 'full', 'pom.xml'), path.join(temporary, subdir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        artifactId: 'pom.artifactid',
        moduleType: 'wrapper',
        parent,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('ModuleFunctions - initialize error - invalid moduleType', async (t) => {
  t.plan(1);
  await t.throwsAsync(
    helpers
      .create(Wrapper)
      .withOptions({ generateInto: 'core', parent: { ...parent } })
      .inTmpDir((temporary) => {
        fs.copyFileSync(fixturePath('yo-rc', 'partial', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
      })
      .run()
  );
});

test('ModuleFunctions - initialize from .yo-rc.json', async (t) => {
  t.plan(1);
  await helpers
    .create(Wrapper)
    .withOptions({ generateInto: 'wrapper', parent: { ...parent } })
    .inTmpDir((temporary) => {
      fs.copyFileSync(fixturePath('yo-rc', 'full', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        examples: true,
        name: 'Local Yo',
        appId: 'localyo',
        artifactId: 'localyo',
        moduleType: 'wrapper',
        parent,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('ModuleFunctions - configuring', async (t) => {
  t.plan(1);
  let temporaryDir;

  await helpers
    .create(Wrapper)
    .withOptions({ generateInto: 'prompted' })
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
      fs.copyFileSync(fixturePath('yo-rc', 'parent-only', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then(() => {
      const expected = { moduleType: 'wrapper' };
      const yoData = JSON.parse(fs.readFileSync(path.join(temporaryDir, '.yo-rc.json')));

      t.deepEqual(yoData['@adobe/generator-aem'].prompted, expected, 'Yeoman Data saved.');
    });
});
