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
import helpers from 'yeoman-test';

import project from '../fixtures/helpers.js';
import TestGenerator from '../fixtures/generators/simple/index.js';
import App from '../../generators/app/index.js';

const generatorPath = path.join(project.generatorsRoot, 'app');

const NoWrite = class extends App {
  constructor(args, options, features) {
    options.resolved = path.join(generatorPath, 'index.js');
    super(args, options, features);
  }

  initializing() {
    super.initializing();
  }

  prompting() {
    return super.prompting();
  }

  configuring() {
    super.configuring();
  }

  default() {
    super.default();
  }
};

const promptDefaults = Object.freeze({
  examples: true,
  name: 'prompted',
  appId: 'prompted',
  groupId: 'prompted',
  artifactId: 'prompted',
  version: 'prompted',
  aemVersion: 'prompted',
  javaVersion: 'prompted',
});

test('@adobe/aem - initialize - no options', async (t) => {
  t.plan(1);

  await helpers
    .create(NoWrite)
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, promptDefaults, 'Properties set');
    });
});

test('@adobe/aem - initialize - defaults', async (t) => {
  t.plan(1);

  await helpers
    .create(NoWrite)
    .withOptions({ defaults: true })
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: false,
        version: '1.0.0-SNAPSHOT',
        javaVersion: '11',
        aemVersion: 'cloud',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - initialize - invalid java/aem version', async (t) => {
  t.plan(1);

  await helpers
    .create(NoWrite)
    .withOptions({ defaults: true, javaVersion: '1.7', aemVersion: '6.4' })
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: false,
        version: '1.0.0-SNAPSHOT',
        javaVersion: '11',
        aemVersion: 'cloud',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - initialize from pom', async (t) => {
  t.plan(1);

  await helpers
    .create(NoWrite)
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.copyFileSync(path.join(project.projectRoot, 'tests', 'fixtures', 'pom', 'full', 'pom.xml'), path.join(temporary, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0-POM',
        javaVersion: '8',
        aemVersion: 'pom',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - initialize from pom - generateInto', async (t) => {
  t.plan(1);
  const subdir = 'subdir';

  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: subdir })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.mkdirSync(path.join(temporary, subdir));
      fs.copyFileSync(path.join(project.projectRoot, 'tests', 'fixtures', 'pom', 'full', 'pom.xml'), path.join(temporary, subdir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0-POM',
        javaVersion: '8',
        aemVersion: 'pom',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - initialize from .yo-rc.json', async (t) => {
  t.plan(1);

  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: 'prompted' })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.mkdirSync(path.join(temporary, 'prompted'));
      fs.copyFileSync(path.join(project.projectRoot, 'tests', 'fixtures', 'yo-rc', 'full', '.yo-rc.json'), path.join(temporary, 'prompted', '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        examples: false,
        name: 'Local Yo',
        appId: 'localyo',
        groupId: 'com.test.localyo',
        artifactId: 'localyo',
        version: '1.0-LOCALYO',
        javaVersion: '8',
        aemVersion: 'localyo',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - initialize merge', async (t) => {
  t.plan(1);

  await helpers
    .create(NoWrite)
    .withOptions({ defaults: true })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.copyFileSync(path.join(project.projectRoot, 'tests', 'fixtures', 'pom', 'partial', 'pom.xml'), path.join(temporary, 'pom.xml'));
      fs.copyFileSync(path.join(project.projectRoot, 'tests', 'fixtures', 'yo-rc', 'partial', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: false,
        name: 'Local Yo',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0.0-SNAPSHOT',
        javaVersion: '11',
        aemVersion: 'localyo',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - composes with module - base options', async (t) => {
  t.plan(1);

  let temporaryDir;

  await helpers
    .create(NoWrite)
    .withGenerators([[TestGenerator, 'aem:test:simple']])
    .withOptions({
      defaults: true,
      modules: 'aem:test:simple',
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
        examples: false,
        appId: 'prompted',
        artifactId: 'prompted',
        name: 'prompted',
        parent: {
          defaults: true,
          examples: false,
          version: '1.0.0-SNAPSHOT',
          javaVersion: '11',
          aemVersion: 'cloud',
        },
      };
      _.defaults(expected.parent, promptDefaults);
      const actual = JSON.parse(fs.readFileSync(path.join(temporaryDir, 'prompted', 'simple', 'props.json')));
      t.deepEqual(actual, expected, 'File created');
    });
});

test('@adobe/aem - composes with module - shared options', async (t) => {
  t.plan(1);

  let temporaryDir;

  await helpers
    .create(NoWrite)
    .withGenerators([[TestGenerator, 'aem:test:simple']])
    .withOptions({
      artifactId: 'artifactId',
      name: 'name',
      appId: 'appId',
      defaults: true,
      modules: 'aem:test:simple',
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
        examples: false,
        artifactId: 'artifactId',
        name: 'name',
        appId: 'appId',
        parent: {
          defaults: true,
          examples: false,
          artifactId: 'artifactId',
          name: 'name',
          appId: 'appId',
          version: '1.0.0-SNAPSHOT',
          javaVersion: '11',
          aemVersion: 'cloud',
        },
      };
      _.defaults(expected.parent, promptDefaults);
      const actual = JSON.parse(fs.readFileSync(path.join(temporaryDir, 'appId', 'simple', 'props.json')));
      t.deepEqual(actual, expected, 'File created');
    });
});

test('@adobe/aem - prompting', async (t) => {
  t.plan(1);

  await helpers
    .create(NoWrite)
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const actual = result.generator.props;
      t.deepEqual(actual, promptDefaults, 'Properties set');
    });
});

test('@adobe/aem - configuring', async (t) => {
  t.plan(1);
  let temporaryDir;

  await helpers
    .create(NoWrite)
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

test('@adobe/aem - configuring - generateInto', async (t) => {
  t.plan(1);
  let temporaryDir;

  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: 'subdir' })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
    })
    .run()
    .then(() => {
      const expected = {
        '@adobe/generator-aem': promptDefaults,
      };

      const yoData = JSON.parse(fs.readFileSync(path.join(temporaryDir, 'subdir', '.yo-rc.json')));
      t.deepEqual(yoData, expected, 'Yeoman Data saved.');
    });
});

test('@adobe/aem - configuring - fails on existing different pom', async (t) => {
  t.plan(2);

  const error = await t.throwsAsync(
    helpers
      .create(NoWrite)
      .withPrompts(promptDefaults)
      .inTmpDir((temporary) => {
        fs.mkdirSync(path.join(temporary, 'prompted'));
        fs.copyFileSync(path.join(project.projectRoot, 'tests', 'fixtures', 'pom', 'full', 'pom.xml'), path.join(temporary, 'prompted', 'pom.xml'));
      })
      .run()
  );
  t.is(error.message, 'Refusing to update existing project with different group/artifact identifiers.');
});

test('@adobe/aem - configuring - cwd is same as appId', async (t) => {
  t.plan(1);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'), 'appId');

  await helpers
    .create(NoWrite)
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

test('@adobe/aem - writing/installing - options - cloud', async () => {
  await helpers
    .create(generatorPath)
    .withOptions({
      defaults: true,
      examples: false,
      groupId: 'com.adobe.test.main',
      appId: 'main',
      name: 'Main Title',
    })
    .run()
    .then((result) => {
      result.assertFile(path.join('main', 'README.md'));
      result.assertFile(path.join('main', '.gitignore'));
      const pom = path.join('main', 'pom.xml');
      result.assertFile(pom);
      result.assertFileContent(pom, /<groupId>com.adobe.test.main<\/groupId>/);
      result.assertFileContent(pom, /<artifactId>main<\/artifactId>/);
      result.assertFileContent(pom, /<version>1.0.0-SNAPSHOT<\/version>/);
      result.assertFileContent(pom, /<name>Main Title<\/name>/);
      result.assertFileContent(pom, /<description>Parent pom for Main Title<\/description>/);

      result.assertFileContent(pom, /<componentGroupName>Main Title<\/componentGroupName>/);
      result.assertFileContent(pom, /<java.version>11<\/java.version>/);
      result.assertFileContent(pom, /<aem.version>\d{4}\.\d+\.\d+\.\d{8}T\d{6}Z-\d+<\/aem.version>/);
      result.assertFileContent(pom, /<artifactId>aem-sdk-api<\/artifactId>/);
    });
});

test('@adobe/aem - writing/installing - prompts - v6.5', async () => {
  await helpers
    .create(generatorPath)
    .withPrompts({
      examples: false,
      groupId: 'com.adobe.test.main',
      appId: 'main',
      name: 'Main Title',
      javaVersion: '8',
      aemVersion: '6.5',
    })
    .run()
    .then((result) => {
      result.assertFile(path.join('main', 'README.md'));
      result.assertFile(path.join('main', '.gitignore'));
      const pom = path.join('main', 'pom.xml');
      result.assertFile(pom);
      result.assertFileContent(pom, /<groupId>com.adobe.test.main<\/groupId>/);
      result.assertFileContent(pom, /<artifactId>main<\/artifactId>/);
      result.assertFileContent(pom, /<version>1.0.0-SNAPSHOT<\/version>/);
      result.assertFileContent(pom, /<name>Main Title<\/name>/);
      result.assertFileContent(pom, /<description>Parent pom for Main Title<\/description>/);

      result.assertFileContent(pom, /<componentGroupName>Main Title<\/componentGroupName>/);
      result.assertFileContent(pom, /<java.version>8<\/java.version>/);
      result.assertFileContent(pom, /<aem.version>6\.5\.\d+<\/aem.version>/);
      result.assertFileContent(pom, /<artifactId>uber-jar<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);
    });
});
