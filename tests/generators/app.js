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

import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

import test from 'ava';
import helpers from 'yeoman-test';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const projectRoot = path.join(dirname, '..', '..');
const generatorPath = path.join(projectRoot, 'generators', 'app');

test('@adobe/generator-aem - initialize', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .run()
    .then((result) => {
      const expected = {};
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize - defaults', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .withOptions({ defaults: true })
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: true,
        version: '1.0.0-SNAPSHOT',
        aemVersion: 'cloud',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize from pom', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .inTmpDir((dir) => {
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'pom', 'full', 'pom.xml'), path.join(dir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0-POM',
        aemVersion: 'pom',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize from pom - generateInto', async (t) => {
  t.plan(1);

  const subdir = 'subdir';

  await helpers
    .create(generatorPath)
    .withOptions({ generateInto: subdir })
    .inTmpDir((dir) => {
      fs.mkdirSync(path.join(dir, subdir));
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'pom', 'full', 'pom.xml'), path.join(dir, subdir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0-POM',
        aemVersion: 'pom',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize from .yo-rc.json', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .inTmpDir((dir) => {
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'yo-rc', 'full', '.yo-rc.json'), path.join(dir, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Local Yo',
        appId: 'localyo',
        groupId: 'com.test.localyo',
        artifactId: 'localyo',
        version: '1.0-LOCALYO',
        aemVersion: 'localyo',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize merge', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .withOptions({ defaults: true })
    .inTmpDir((dir) => {
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'pom', 'partial', 'pom.xml'), path.join(dir, 'pom.xml'));
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'yo-rc', 'partial', '.yo-rc.json'), path.join(dir, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: true,
        name: 'Local Yo',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0.0-SNAPSHOT',
        aemVersion: 'localyo',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - composes with module - base options', async (t) => {
  t.plan(1);

  let temporaryDir;

  await helpers
    .create(generatorPath)
    .withGenerators([path.join(projectRoot, 'tests', 'fixtures', 'generators', 'simple')])
    .withOptions({
      defaults: true,
      modules: path.join(projectRoot, 'tests', 'fixtures', 'generators', 'simple'),
    })
    .inTmpDir((dir) => {
      temporaryDir = dir;
    })
    .run()
    .then(() => {
      const expected = {
        added: 'Added',
        defaults: true,
        examples: true,
        parent: {
          defaults: true,
          examples: true,
          version: '1.0.0-SNAPSHOT',
          aemVersion: 'cloud',
        },
      };
      const actual = JSON.parse(fs.readFileSync(path.join(temporaryDir, 'simple', 'props.json')));
      t.deepEqual(actual, expected, 'File created');
    });
});

test('@adobe/generator-aem - composes with module - shared options', async (t) => {
  t.plan(1);

  let temporaryDir;

  await helpers
    .create(generatorPath)
    .withGenerators([path.join(projectRoot, 'tests', 'fixtures', 'generators', 'simple')])
    .withOptions({
      artifactId: 'artifactId',
      name: 'name',
      appId: 'appId',
      defaults: true,
      modules: path.join(projectRoot, 'tests', 'fixtures', 'generators', 'simple'),
    })
    .inTmpDir((dir) => {
      temporaryDir = dir;
    })
    .run()
    .then(() => {
      const expected = {
        added: 'Added',
        defaults: true,
        examples: true,
        artifactId: 'artifactId',
        name: 'name',
        appId: 'appId',
        parent: {
          defaults: true,
          examples: true,
          artifactId: 'artifactId',
          name: 'name',
          appId: 'appId',
          version: '1.0.0-SNAPSHOT',
          aemVersion: 'cloud',
        },
      };
      const actual = JSON.parse(fs.readFileSync(path.join(temporaryDir, 'simple', 'props.json')));
      t.deepEqual(actual, expected, 'File created');
    });
});

test('@adobe/generator-aem - prompting', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .run()
    .then((result) => {
      const expected = {};
      const actual = result.generator.props;
      t.deepEqual(actual, expected, 'Properties set');
    });
});
