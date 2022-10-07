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
import { XMLParser } from 'fast-xml-parser';
import { addModulesToPom, fixturePath, generatorPath } from '../../fixtures/helpers.js';

import UITestsGenerator from '../../../generators/tests-ui/index.js';
import { config, wrapDefault, writeInstall } from '../../fixtures/generators/wrappers.js';

const resolved = generatorPath('tests-ui', 'index.js');
const UITestConfig = config(UITestsGenerator, resolved);
const UITestDefault = wrapDefault(UITestsGenerator, resolved);
const UITestWriteInstall = writeInstall(UITestsGenerator, resolved);

test('configuring', async (t) => {
  t.plan(1);

  const expected = { config: 'to be saved' };
  await helpers
    .create(UITestConfig)
    .withOptions({ props: expected })
    .run()
    .then((result) => {
      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc, { '@adobe/generator-aem:tests-ui': expected }, 'Config saved.');
    });
});

test('default - fails on no content', async (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.tests');

  const exception = await t.throwsAsync(
    helpers
      .create(UITestDefault)
      .inDir(fullPath, () => {
        fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      })
      .run()
  );
  t.regex(exception.message, /Unable to create UI Test package, Content package is required and not found\./);
});

test('writing/installing - v6.5', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.tests');

  await helpers
    .create(UITestWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.tests',
        name: 'Test Project - UI Tests',
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aemVersion: '6.5',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));

      fs.mkdirSync(path.join(temporaryDir, 'ui.content'));
      fs.cpSync(fixturePath('projects', 'cloud', 'ui.content'), path.join(temporaryDir, 'ui.content'), { recursive: true });
      addModulesToPom(temporaryDir, ['ui.content']);
    })
    .run()
    .then((result) => {
      assertShared(t, result);
      result.assertFileContent(path.join('test-module', 'lib', 'wdio.commands.js'), /td:first-child img/);
      result.assertFileContent(path.join('test-module', 'specs', 'aem', 'basic.js'), /coral-shell-solutionswitcher/);
    });
});

test('writing/installing - cloud', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.tests');

  await helpers
    .create(UITestWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.tests',
        name: 'Test Project - UI Tests',
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aemVersion: 'cloud',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));

      fs.mkdirSync(path.join(temporaryDir, 'ui.content'));
      fs.cpSync(fixturePath('projects', 'cloud', 'ui.content'), path.join(temporaryDir, 'ui.content'), { recursive: true });
      addModulesToPom(temporaryDir, ['ui.content']);
    })
    .run()
    .then((result) => {
      assertShared(t, result);
      result.assertFileContent(path.join('test-module', 'lib', 'wdio.commands.js'), /type="checkbox"/);
      result.assertFileContent(path.join('test-module', 'specs', 'aem', 'basic.js'), /coral-shell-menu\[aria-label/);
    });
});

function assertShared(t, result) {
  const temporaryDir = path.dirname(result.generator.destinationPath());
  result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui\.tests<\/module>/);

  const fullPath = result.generator.destinationPath();
  const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), { encoding: 'utf8' });
  const parser = new XMLParser({
    ignoreAttributes: true,
    ignoreDeclaration: true,
  });

  const pomData = parser.parse(pomString);
  t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
  t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
  t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
  t.is(pomData.project.artifactId, 'test.ui.tests', 'ArtifactId set.');
  t.is(pomData.project.name, 'Test Project - UI Tests', 'Name set.');

  result.assertFile('.dockerignore');
  result.assertFile('assembly-ui-test-docker-context.xml');
  result.assertFile('docker-compose-wdio-chrome.yaml');
  result.assertFile('docker-compose-wdio-firefox.yaml');
  result.assertFile('Dockerfile');
  result.assertFile('pom.xml');
  result.assertFile('README.md');
  result.assertFile('wait-for-grid.sh');
  result.assertFile(path.join('test-module', 'package.json'));
  result.assertFile(path.join('target', 'test.ui.tests-1.0.0-SNAPSHOT-ui-test-docker-context.tar.gz'));
}
