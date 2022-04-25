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
import { versions } from 'node:process';
import { execFileSync } from 'node:child_process';

import _ from 'lodash';
import tempDirectory from 'temp-dir';

import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';
import helpers from 'yeoman-test';

import { generatorPath, fixturePath } from '../fixtures/helpers.js';
import TestGenerator from '../fixtures/generators/simple/index.js';

import Utils from '../../lib/utils.js';

import { AEMAppNoWrite } from '../fixtures/wrappers/index.js';

const nodeVersion = versions.node;
const npmVersion = execFileSync('npm', ['--version'])
  .toString()
  .replaceAll(/\r\n|\n|\r/gm, '');

const promptDefaults = Object.freeze({
  examples: true,
  name: 'prompted',
  appId: 'prompted',
  groupId: 'prompted',
  artifactId: 'prompted',
  version: 'prompted',
  aemVersion: 'prompted',
  javaVersion: 'prompted',
  nodeVersion,
  npmVersion,
});

test('@adobe/aem - initialize - no options', async (t) => {
  t.plan(1);

  await helpers
    .create(AEMAppNoWrite)
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, promptDefaults, 'Properties set');
    });
});

test('@adobe/aem - initialize - defaults', async (t) => {
  t.plan(1);

  await helpers
    .create(AEMAppNoWrite)
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
    .create(AEMAppNoWrite)
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
    .create(AEMAppNoWrite)
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.copyFileSync(fixturePath('pom', 'full', 'pom.xml'), path.join(temporary, 'pom.xml'));
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
        nodeVersion: 'pom',
        npmVersion: 'pom',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - initialize from pom - generateInto', async (t) => {
  t.plan(1);
  const subdir = 'subdir';

  await helpers
    .create(AEMAppNoWrite)
    .withOptions({ generateInto: subdir })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.mkdirSync(path.join(temporary, subdir));
      fs.copyFileSync(fixturePath('pom', 'full', 'pom.xml'), path.join(temporary, subdir, 'pom.xml'));
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
        nodeVersion: 'pom',
        npmVersion: 'pom',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - initialize from .yo-rc.json', async (t) => {
  t.plan(1);

  await helpers
    .create(AEMAppNoWrite)
    .withOptions({ generateInto: 'prompted' })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.mkdirSync(path.join(temporary, 'prompted'));
      fs.copyFileSync(fixturePath('yo-rc', 'full', '.yo-rc.json'), path.join(temporary, 'prompted', '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
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
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - initialize merge', async (t) => {
  t.plan(1);

  await helpers
    .create(AEMAppNoWrite)
    .withOptions({ defaults: true })
    .withPrompts({ appId: 'prompted' })
    .inTmpDir((temporary) => {
      fs.copyFileSync(fixturePath('pom', 'partial', 'pom.xml'), path.join(temporary, 'pom.xml'));
      fs.copyFileSync(fixturePath('yo-rc', 'partial', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: false,
        name: 'Local Yo',
        appId: 'prompted',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0.0-SNAPSHOT',
        javaVersion: '11',
        aemVersion: 'localyo',
        nodeVersion,
        npmVersion,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem - compose with module - does not exist', async (t) => {
  t.plan(1);
  await t.throwsAsync(helpers.create(AEMAppNoWrite).withOptions({ defaults: true, modules: 'test:simple' }).withPrompts(promptDefaults).run());
});

test('@adobe/aem - compose with module - base options', async (t) => {
  t.plan(1);

  let temporaryDir;
  await helpers
    .create(AEMAppNoWrite)
    .withGenerators([[TestGenerator, 'test:simple']])
    .withOptions({
      defaults: true,
      modules: 'test:simple',
    })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
    })
    .run()
    .then(() => {
      const expected = {
        added: 'Added',
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

test('@adobe/aem - compose with module - shared options', async (t) => {
  t.plan(1);

  let temporaryDir;
  await helpers
    .create(AEMAppNoWrite)
    .withGenerators([[TestGenerator, 'test:simple']])
    .withOptions({
      defaults: true,
      artifactId: 'artifactId',
      name: 'name',
      appId: 'appId',
      modules: 'test:simple',
    })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
    })
    .run()
    .then(() => {
      const expected = {
        added: 'Added',
        parent: {
          defaults: true,
          examples: false,
          artifactId: 'artifactId',
          name: 'name',
          appId: 'appId',
          version: '1.0.0-SNAPSHOT',
          javaVersion: '11',
          aemVersion: 'cloud',
          nodeVersion,
          npmVersion,
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
    .create(AEMAppNoWrite)
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
    .create(AEMAppNoWrite)
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
    .create(AEMAppNoWrite)
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
  t.plan(1);

  await t.throwsAsync(
    helpers
      .create(AEMAppNoWrite)
      .withPrompts(promptDefaults)
      .inTmpDir((temporary) => {
        fs.mkdirSync(path.join(temporary, 'prompted'));
        fs.copyFileSync(fixturePath('pom', 'full', 'pom.xml'), path.join(temporary, 'prompted', 'pom.xml'));
      })
      .run()
  );
});

test('@adobe/aem - configuring - cwd is same as appId', async (t) => {
  t.plan(1);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'), 'appId');

  await helpers
    .create(AEMAppNoWrite)
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

test.serial('@adobe/aem - writing/installing - options - cloud', async () => {
  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    version: '2022.3.6698.20220318T233218Z-220400',
    path: 'com/adobe/aem/aem-sdk-api',
  };

  const stub = sinon.stub().resolves(aemData);
  sinon.replace(Utils, 'latestApi', stub);

  await helpers
    .create(generatorPath('app'))
    .withOptions({
      defaults: true,
      examples: false,
      groupId: 'com.adobe.test.main',
      appId: 'main',
      name: 'Main Title',
      showBuildOutput: false,
    })
    .run()
    .then((result) => {
      sinon.restore();
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
      result.assertFileContent(pom, `<node.version>v${nodeVersion}</node.version>`);
      result.assertFileContent(pom, `<npm.version>${npmVersion}</npm.version>`);
      result.assertFileContent(pom, /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertNoFileContent(pom, /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);
    });
});

test.serial('@adobe/aem - writing/installing - prompts - v6.5', async () => {
  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'uber-jar',
    version: '6.5.12',
    path: 'com/adobe/aem/uber-jar',
  };

  const stub = sinon.stub().resolves(aemData);
  sinon.replace(Utils, 'latestApi', stub);

  await helpers
    .create(generatorPath('app'))
    .withOptions({ showBuildOutput: false })
    .withPrompts({
      examples: false,
      groupId: 'com.adobe.test.main',
      appId: 'main',
      name: 'Main Title',
      javaVersion: '8',
      aemVersion: '6.5',
      nodeVersion,
      npmVersion,
    })
    .run()
    .then((result) => {
      sinon.restore();
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
      result.assertFileContent(pom, `<node.version>v${nodeVersion}</node.version>`);
      result.assertFileContent(pom, `<npm.version>${npmVersion}</npm.version>`);
      result.assertFileContent(pom, /<artifactId>uber-jar<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);
    });
});
