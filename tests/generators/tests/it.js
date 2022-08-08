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
import sinon from 'sinon/pkg/sinon-esm.js';

import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata } from '../../fixtures/helpers.js';

import IntegrationTestsGenerator from '../../../generators/tests-it/index.js';
import { Init, Prompt, Config, WriteInstall } from '../../fixtures/generators/wrappers.js';
import MavenUtils from '../../../lib/maven-utils.js';

const resolved = generatorPath('tests-it', 'index.js');
const ITInit = Init(IntegrationTestsGenerator, resolved);
const ITPrompt = Prompt(IntegrationTestsGenerator, resolved);
const ITConfig = Config(IntegrationTestsGenerator, resolved);
const ITWriteInstall = WriteInstall(IntegrationTestsGenerator, resolved);

test('initialize - no options', async (t) => {
  t.plan(1);
  await helpers
    .create(ITInit)
    .run()
    .then((result) => {
      const expected = {
        package: undefined,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('initialize - options', async (t) => {
  t.plan(1);

  await helpers
    .create(ITInit)
    .withOptions({ package: 'com.test.option', publish: '' })
    .run()
    .then((result) => {
      const expected = {
        package: 'com.test.option',
        publish: true,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('initialize - invalid package option', async (t) => {
  t.plan(1);

  await helpers
    .create(ITInit)
    .withOptions({ package: 'th3s.|s.N0t.Allow3d' })
    .run()
    .then((result) => {
      const expected = {
        package: undefined,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('initialize - defaults', async (t) => {
  t.plan(1);

  await helpers
    .create(ITInit)
    .withOptions({ defaults: true })
    .run()
    .then((result) => {
      const expected = {
        package: undefined,
        publish: true,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('initialize - package defaults to parent groupId', async (t) => {
  t.plan(1);

  await helpers
    .create(ITInit)
    .withOptions({ parentProps: { groupId: 'com.test.parent' } })
    .run()
    .then((result) => {
      const expected = {
        package: 'com.test.parent',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('prompting - package - default', async (t) => {
  t.plan(1);

  await helpers
    .create(ITPrompt)
    .withOptions({ props: { package: 'com.adobe.test' } })
    .run()
    .then((result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'package' });
      t.is(prompt.default, 'com.adobe.test', 'Default set');
    });
});

test('prompting - package - when - defaults & no options', async (t) => {
  t.plan(1);

  await helpers
    .create(ITPrompt)
    .withOptions({ defaults: true })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'package' });
      t.true(await prompt.when(), 'Prompts for package.');
    });
});

test('prompting - package - when - defaults & option', async (t) => {
  t.plan(1);

  await helpers
    .create(ITPrompt)
    .withOptions({ defaults: true, package: 'com.adobe.option' })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'package' });
      t.false(await prompt.when(), 'Does not prompt for package.');
    });
});

test('prompting - package - validate', async (t) => {
  t.plan(4);

  await helpers
    .create(ITPrompt)
    .withOptions({ defaults: true })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'package' });
      t.is(await prompt.validate(), 'Package must be provided.', 'Error message correct.');
      t.is(await prompt.validate(''), 'Package must be provided.', 'Error message correct.');
      t.is(await prompt.validate('th3s.|s.N0t.Allow3d'), 'Package must only contain letters or periods (.).', 'Error message correct.');
      t.true(await prompt.validate('com.adobe.test'), 'Valid package.');
    });
});

test('prompting - publish - defaults set', async (t) => {
  t.plan(2);

  await helpers
    .create(ITPrompt)
    .withOptions({ props: { publish: true } })
    .run()
    .then((result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'publish' });
      t.false(prompt.when, 'When false as is set.');
      t.true(prompt.default, 'Default is true.');
    });
});

test('prompting - publish - nothing set', async (t) => {
  t.plan(2);

  await helpers
    .create(ITPrompt)
    .withOptions({})
    .run()
    .then((result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'publish' });
      t.true(prompt.when, 'When is true.');
      t.true(prompt.default, 'Default is true.');
    });
});

test('configuring', async (t) => {
  t.plan(1);
  sinon.restore();

  const testingClient = {
    groupId: 'com.adobe.cq',
    artifactId: 'cq-testing-clients-65',
    version: '1.1.1',
  };

  const fake = sinon.fake.resolves(testingClient);
  sinon.replace(MavenUtils, 'latestRelease', fake);

  await helpers
    .create(ITConfig)
    .withOptions({
      props: { config: 'config' },
      parentProps: { aemVersion: '6.5' },
    })
    .run()
    .then((result) => {
      sinon.restore();
      const expected = {
        '@adobe/generator-aem:tests-it': {
          config: 'config',
          testingClient,
        },
      };
      const yoData = JSON.parse(fs.readFileSync(result.generator.destinationPath('.yo-rc.json')));
      t.deepEqual(yoData, expected, 'Yeoman Data saved.');
    });
});

test('writing/installing - publish', async (t) => {
  t.plan(5);

  const testingClient = {
    groupId: 'com.adobe.cq',
    artifactId: 'cq-testing-clients-65',
    version: '1.1.1',
  };

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'it.tests');
  await helpers
    .create(ITWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        examples: true,
        package: 'com.adobe.test',
        artifactId: 'test.it.tests',
        name: 'Test Project - Integration Tests',
        appId: 'test',
        publish: true,
        testingClient,
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: aem65ApiMetadata,
        aemVersion: '6.5',
      }
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'v6.5', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>it\.tests<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), { encoding: 'utf8' });
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.it.tests', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Integration Tests', 'Name set.');

      result.assertFileContent('pom.xml', /<artifactId>cq-testing-clients-65<\/artifactId>/);

      const testsRoot = path.join('src', 'main', 'java', 'com', 'adobe', 'test', 'it', 'tests');
      result.assertFile(path.join(testsRoot, 'CreatePageIT.java'));
      result.assertFile(path.join(testsRoot, 'GetPageIT.java'));
      result.assertFile(path.join(testsRoot, 'HtmlUnitClient.java'));
      result.assertFile(path.join(testsRoot, 'PublishPageValidationIT.java'));
      result.assertFile(path.join('target', 'test.it.tests-1.0.0-SNAPSHOT-jar-with-dependencies.jar'));
    });
});

test('writing/installing - no publish', async (t) => {
  t.plan(5);

  const testingClient = {
    groupId: 'com.adobe.cq',
    artifactId: 'aem-cloud-testing-clients',
    version: '1.1.0',
  };

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'it.tests');
  await helpers
    .create(ITWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        examples: true,
        package: 'com.adobe.test',
        artifactId: 'test.it.tests',
        name: 'Test Project - Integration Tests',
        appId: 'test',
        testingClient,
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: cloudSdkApiMetadata,
        aemVersion: '6.5',
      }
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>it\.tests<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), { encoding: 'utf8' });
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.it.tests', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Integration Tests', 'Name set.');

      result.assertFileContent('pom.xml', /<artifactId>aem-cloud-testing-clients<\/artifactId>/);

      const testsRoot = path.join('src', 'main', 'java', 'com', 'adobe', 'test', 'it', 'tests');
      result.assertFile(path.join(testsRoot, 'CreatePageIT.java'));
      result.assertFile(path.join(testsRoot, 'GetPageIT.java'));
      result.assertFile(path.join(testsRoot, 'HtmlUnitClient.java'));
      result.assertNoFile(path.join(testsRoot, 'PublishPageValidationIT.java'));
      result.assertFile(path.join('target', 'test.it.tests-1.0.0-SNAPSHOT-jar-with-dependencies.jar'));
    });
});
