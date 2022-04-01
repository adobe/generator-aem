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
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

import _ from 'lodash';
import tempDirectory from 'temp-dir';

import test from 'ava';
import helpers from 'yeoman-test';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const projectRoot = path.join(dirname, '..', '..');
const generatorPath = path.join(projectRoot, 'generators', 'app');

const promptDefaults = Object.freeze({
  examples: false,
  name: 'prompted',
  appId: 'prompted',
  artifactId: 'prompted',
  version: 'prompted',
  aemVersion: 'prompted',
});

test('@adobe/generator-aem - initialize', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, promptDefaults, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize - defaults', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .withOptions({ defaults: true })
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: true,
        version: '1.0.0-SNAPSHOT',
        aemVersion: 'cloud',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize from pom', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'pom', 'full', 'pom.xml'), path.join(temporary, 'pom.xml'));
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
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize from pom - generateInto', async (t) => {
  t.plan(1);
  const subdir = 'subdir';

  await helpers
    .create(generatorPath)
    .withOptions({ generateInto: subdir })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.mkdirSync(path.join(temporary, subdir));
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'pom', 'full', 'pom.xml'), path.join(temporary, subdir, 'pom.xml'));
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
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize from .yo-rc.json', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'yo-rc', 'full', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
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
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/generator-aem - initialize merge', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .withOptions({ defaults: true })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'pom', 'partial', 'pom.xml'), path.join(temporary, 'pom.xml'));
      fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'yo-rc', 'partial', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
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
      _.defaults(expected, promptDefaults);
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
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
    })
    .run()
    .then(() => {
      const expected = {
        added: 'Added',
        defaults: true,
        examples: true,
        appId: 'prompted',
        artifactId: 'prompted',
        name: 'prompted',
        parent: {
          defaults: true,
          examples: true,
          version: '1.0.0-SNAPSHOT',
          aemVersion: 'cloud',
        },
      };
      _.defaults(expected.parent, promptDefaults);
      const actual = JSON.parse(fs.readFileSync(path.join(temporaryDir, 'prompted', 'simple', 'props.json')));
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
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
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
      _.defaults(expected.parent, promptDefaults);
      const actual = JSON.parse(fs.readFileSync(path.join(temporaryDir, 'appId', 'simple', 'props.json')));
      t.deepEqual(actual, expected, 'File created');
    });
});

test('@adobe/generator-aem - prompting', async (t) => {
  t.plan(1);

  await helpers
    .create(generatorPath)
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const actual = result.generator.props;
      t.deepEqual(actual, promptDefaults, 'Properties set');
    });
});

test('@adobe/generator-aem - configuring', async (t) => {
  t.plan(1);
  let temporaryDir;

  await helpers
    .create(generatorPath)
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
    })
    .run()
    .then(() => {
      const expected = {
        '@adobe/generator-aem': promptDefaults,
      };

      const yoData = JSON.parse(fs.readFileSync(path.join(temporaryDir, 'prompted', '.yo-rc.json')));
      t.deepEqual(yoData, expected, 'Yeoman Data saved.');
    });
});

test('@adobe/generator-aem - configuring - fails on existing different pom', async (t) => {
  t.plan(2);

  const error = await t.throwsAsync(
    helpers
      .create(generatorPath)
      .withPrompts(promptDefaults)
      .inTmpDir((temporary) => {
        fs.mkdirSync(path.join(temporary, 'prompted'));
        fs.copyFileSync(path.join(projectRoot, 'tests', 'fixtures', 'pom', 'full', 'pom.xml'), path.join(temporary, 'prompted', 'pom.xml'));
      })
      .run()
  );
  t.is(error.message, 'Refusing to update existing project with different group/artifact identifiers.');
});

test('@adobe/generator-aem - configuring - cwd is same as appId', async (t) => {
  t.plan(1);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'), 'appId');

  await helpers
    .create(generatorPath)
    .withOptions({ appId: 'appId' })
    .withPrompts(promptDefaults)
    .inDir(temporaryDir)
    .run()
    .then(() => {
      const rootProps = {};
      const expected = {
        '@adobe/generator-aem': _.merge(rootProps, promptDefaults, { appId: 'appId' }),
      };

      const yoData = JSON.parse(fs.readFileSync(path.join(temporaryDir, '.yo-rc.json')));
      t.deepEqual(yoData, expected, 'Yeoman Data saved.');
    });
});
