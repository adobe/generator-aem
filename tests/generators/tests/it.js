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

import { XMLParser } from 'fast-xml-parser';
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata } from '../../fixtures/helpers.js';

import IntegrationTestsGenerator from '../../../generators/tests-it/index.js';
import ParentPomGenerator from '../../../generators/app/pom/index.js';

const nodeVersion = versions.node;
const npmVersion = execFileSync('npm', ['--version'])
  .toString()
  .replaceAll(/\r\n|\n|\r/gm, '');

test.serial('via @adobe/generator-aem - v6.5', async (t) => {
  t.plan(5);

  const itStub = sinon.stub();
  itStub.withArgs({ groupId: 'com.adobe.cq', artifactId: 'cq-testing-clients-65' }).resolves({
    groupId: 'com.adobe.cq',
    artifactId: 'cq-testing-clients-65',
    version: '1.1.1',
  });
  sinon.restore();

  itStub.withArgs(_.omit(aem65ApiMetadata, ['version'])).resolves(aem65ApiMetadata);
  sinon.replace(IntegrationTestsGenerator.prototype, '_latestRelease', itStub);

  const pomStub = sinon.stub().resolves(aem65ApiMetadata);
  sinon.replace(ParentPomGenerator.prototype, '_latestRelease', pomStub);

  await helpers
    .create(generatorPath('app'))
    .withGenerators([[IntegrationTestsGenerator, '@adobe/aem:tests-it', generatorPath('tests-it', 'index.js')]])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: '6.5',
      modules: 'tests-it',
      showBuildOutput: false,
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = result.generator.destinationPath();
      const moduleDir = path.join(outputRoot, 'it.tests');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>it\.tests<\/module>/);

      const pom = path.join(moduleDir, 'pom.xml');
      result.assertFile(pom);
      const pomString = fs.readFileSync(pom, 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, properties.groupId, 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.it.tests', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Integration Tests', 'Name set.');

      result.assertFileContent(pom, /<artifactId>cq-testing-clients-65<\/artifactId>/);

      const testsRoot = path.join(moduleDir, 'src', 'main', 'java', 'com', 'adobe', 'test', 'it', 'tests');
      result.assertFile(path.join(testsRoot, 'CreatePageIT.java'));
      result.assertFile(path.join(testsRoot, 'GetPageIT.java'));
      result.assertFile(path.join(testsRoot, 'HtmlUnitClient.java'));
      result.assertFile(path.join(testsRoot, 'PublishPageValidationIT.java'));
      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.it.tests-${properties.version}-jar-with-dependencies.jar`));
    });
});

test.serial('via @adobe/generator-aem - cloud', async (t) => {
  t.plan(5);

  const itStub = sinon.stub();
  itStub.withArgs({ groupId: 'com.adobe.cq', artifactId: 'aem-cloud-testing-clients' }).resolves({
    groupId: 'com.adobe.cq',
    artifactId: 'aem-cloud-testing-clients',
    version: '1.1.0',
  });

  sinon.restore();
  itStub.withArgs(_.omit(cloudSdkApiMetadata, ['version'])).resolves(cloudSdkApiMetadata);
  sinon.replace(IntegrationTestsGenerator.prototype, '_latestRelease', itStub);

  const pomStub = sinon.stub().resolves(cloudSdkApiMetadata);
  sinon.replace(ParentPomGenerator.prototype, '_latestRelease', pomStub);

  await helpers
    .create(generatorPath('app'))
    .withGenerators([[IntegrationTestsGenerator, '@adobe/aem:tests-it', generatorPath('tests-it', 'index.js')]])
    .withOptions({
      defaults: false,
      examples: true,
      appId: 'test',
      artifactId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: 'cloud',
      modules: 'tests-it',
      javaVersion: 8,
      nodeVersion,
      npmVersion,
      showBuildOutput: false,
    })
    .withPrompts({
      groupId: 'com.adobe.test',
      artifactId: 'test.it.module',
      appId: 'test',
      name: 'Integration Tests for Project',
      publish: false,
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = result.generator.destinationPath();
      const moduleDir = path.join(outputRoot, 'it.tests');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>it\.tests<\/module>/);

      const pom = path.join(moduleDir, 'pom.xml');
      result.assertFile(pom);
      const pomString = fs.readFileSync(pom, 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, properties.groupId, 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.it.module', 'ArtifactId set.');
      t.is(pomData.project.name, 'Integration Tests for Project', 'Name set.');

      result.assertFileContent(pom, /<artifactId>aem-cloud-testing-clients<\/artifactId>/);

      const testsRoot = path.join(moduleDir, 'src', 'main', 'java', 'com', 'adobe', 'test', 'it', 'tests');
      result.assertFile(path.join(testsRoot, 'CreatePageIT.java'));
      result.assertFile(path.join(testsRoot, 'GetPageIT.java'));
      result.assertFile(path.join(testsRoot, 'HtmlUnitClient.java'));
      result.assertNoFile(path.join(testsRoot, 'PublishPageValidationIT.java'));
      result.assertFile(path.join(moduleDir, 'target', `test.it.module-${properties.version}-jar-with-dependencies.jar`));
    });
});

test.serial('add module to existing project', async (t) => {
  t.plan(5);

  const itStub = sinon.stub();
  itStub.withArgs({ groupId: 'com.adobe.cq', artifactId: 'aem-cloud-testing-clients' }).resolves({
    groupId: 'com.adobe.cq',
    artifactId: 'aem-cloud-testing-clients',
    version: '1.1.0',
  });
  sinon.restore();

  itStub.withArgs(_.omit(cloudSdkApiMetadata, ['version'])).resolves(cloudSdkApiMetadata);
  sinon.replace(IntegrationTestsGenerator.prototype, '_latestRelease', itStub);

  const pomStub = sinon.stub().resolves(cloudSdkApiMetadata);
  sinon.replace(ParentPomGenerator.prototype, '_latestRelease', pomStub);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');

  await helpers
    .create(generatorPath('tests-it'))
    .withOptions({
      defaults: true,
      examples: false,
      generateInto: 'tests.it',
      package: 'invalid-package-name',
      appId: 'second',
      name: 'Integration Tests',
      showBuildOutput: false,
    })
    .inDir(fullPath, (temporary) => {
      fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
      fs.rmSync(path.join(temporary, 'it.tests'), { recursive: true });
      const data = JSON.parse(fs.readFileSync(path.join(temporary, '.yo-rc.json')));
      delete data['@adobe/generator-aem'].all;
      delete data['@adobe/generator-aem'].core;
      delete data['@adobe/generator-aem']['ui.config'];
      delete data['@adobe/generator-aem']['ui.apps'];
      delete data['@adobe/generator-aem']['ui.apps.structure'];
      delete data['@adobe/generator-aem']['ui.frontend'];
      delete data['@adobe/generator-aem']['it.tests'];
      fs.writeFileSync(path.join(temporary, '.yo-rc.json'), JSON.stringify(data, null, 2));
    })
    .run()
    .then((result) => {
      const properties = result.generator.props;
      const moduleDir = path.join(fullPath, 'tests.it');
      const pom = path.join(moduleDir, 'pom.xml');
      result.assertFile(pom);
      const pomString = fs.readFileSync(pom, 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });
      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'second', 'ArtifactId set.');
      t.is(pomData.project.name, 'Integration Tests', 'Name set.');

      const testsRoot = path.join(moduleDir, 'src', 'main', 'java', 'com', 'adobe', 'test', 'it', 'tests');
      result.assertFile(path.join(testsRoot, 'CreatePageIT.java'));
      result.assertFile(path.join(testsRoot, 'GetPageIT.java'));
      result.assertFile(path.join(testsRoot, 'HtmlUnitClient.java'));
      result.assertFile(path.join(testsRoot, 'PublishPageValidationIT.java'));
      result.assertFile(path.join(moduleDir, 'target', `second-${properties.parent.version}-jar-with-dependencies.jar`));
    });
});

test('second test module fails', async (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');

  const error = await t.throwsAsync(
    helpers
      .create(generatorPath('tests-it'))
      .withOptions({
        defaults: true,
        examples: false,
        generateInto: 'tests.it.second',
        appId: 'second',
        name: 'Second Integration Tests',
        showBuildOutput: false,
      })
      .inDir(fullPath, (temporary) => {
        fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
      })
      .run()
  );

  t.regex(error.message, /Refusing to create a second Integration Testing module\./);
});
