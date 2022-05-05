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
import tempDirectory from 'temp-dir';

import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';
import helpers from 'yeoman-test';
import got from 'got';

import { XMLParser } from 'fast-xml-parser';
import { generatorPath, fixturePath } from '../../fixtures/helpers.js';

import AEMGenerator from '../../../generators/app/index.js';
import AEMIntegrationTestsGenerator from '../../../generators/tests-it/index.js';
import AEMParentPomGenerator from '../../../generators/app/pom/index.js';

const cloudTestingMetadata = fs.readFileSync(fixturePath('files', 'aem-cloud-testing-clients.metadata.xml'), 'utf8');
const aem65TestingMetadata = fs.readFileSync(fixturePath('files', 'cq-testing-clients-65.metadata.xml'), 'utf8');
const nodeVersion = versions.node;
const npmVersion = execFileSync('npm', ['--version'])
  .toString()
  .replaceAll(/\r\n|\n|\r/gm, '');

test.serial('@adobe/aem:tests-it - via @adobe/generator-aem - v6.5', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'uber-jar',
    version: '6.5.12',
    path: 'com/adobe/aem/uber-jar',
  };
  const apiStub = sinon.stub().resolves(aemData);
  sinon.replace(AEMGenerator.prototype, '_latestApi', apiStub);
  sinon.replace(AEMParentPomGenerator.prototype, '_latestApi', apiStub);

  const gotStub = sinon.stub().resolves(aem65TestingMetadata);
  sinon.replace(got, 'get', gotStub);

  let temporaryDir;
  await helpers
    .create(generatorPath('app'))
    .withGenerators([[AEMIntegrationTestsGenerator, '@adobe/aem:tests-it', generatorPath('tests-it', 'index.js')]])
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
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
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

test.serial('@adobe/aem:tests-it - via @adobe/generator-aem - cloud', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    version: '2022.3.6698.20220318T233218Z-220400',
    path: 'com/adobe/aem/aem-sdk-api',
  };
  const apiStub = sinon.stub().resolves(aemData);
  sinon.replace(AEMGenerator.prototype, '_latestApi', apiStub);
  sinon.replace(AEMParentPomGenerator.prototype, '_latestApi', apiStub);

  const gotStub = sinon.stub().resolves(cloudTestingMetadata);
  sinon.replace(got, 'get', gotStub);

  let temporaryDir;
  await helpers
    .create(generatorPath('app'))
    .withGenerators([[AEMIntegrationTestsGenerator, '@adobe/aem:tests-it', generatorPath('tests-it', 'index.js')]])
    .withOptions({
      defaults: false,
      examples: true,
      appId: 'test',
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
      artifactId: 'test',
      publish: false,
    })
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
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

      result.assertFileContent(pom, /<artifactId>aem-cloud-testing-clients<\/artifactId>/);

      const testsRoot = path.join(moduleDir, 'src', 'main', 'java', 'com', 'adobe', 'test', 'it', 'tests');
      result.assertFile(path.join(testsRoot, 'CreatePageIT.java'));
      result.assertFile(path.join(testsRoot, 'GetPageIT.java'));
      result.assertFile(path.join(testsRoot, 'HtmlUnitClient.java'));
      result.assertNoFile(path.join(testsRoot, 'PublishPageValidationIT.java'));
      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.it.tests-${properties.version}-jar-with-dependencies.jar`));
    });
});

test.serial('@adobe/aem:tests-it - metadata retrieve fails', async (t) => {
  t.plan(2);

  const gotStub = sinon.stub().throws('Error', 'Maven Repo Not found');
  sinon.replace(got, 'get', gotStub);

  let temporaryDir;
  await t.throwsAsync(
    helpers
      .create(generatorPath('app'))
      .withGenerators([[AEMIntegrationTestsGenerator, '@adobe/aem:tests-it', generatorPath('tests-it', 'index.js')]])
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
      .inTmpDir((temporary) => {
        temporaryDir = temporary;
      })
      .run()
  );
  sinon.restore();
  t.falsy(fs.existsSync(path.join(temporaryDir, 'test', 'pom.xml')));
});

test('@adobe/aem:tests-it - second test module fails', async (t) => {
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