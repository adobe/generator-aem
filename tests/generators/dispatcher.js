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
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import PomUtils from '../../lib/pom-utils.js';
import DispatcherGenerator from '../../generators/dispatcher/index.js';
import { Prompt, Config, Default, WriteInstall } from '../fixtures/generators/wrappers.js';
import { generatorPath, fixturePath, aem65ApiMetadata, cloudSdkApiMetadata } from '../fixtures/helpers.js';

const resolved = generatorPath('dispatcher', 'index.js');
const DispatcherPrompt = Prompt(DispatcherGenerator, resolved);
const DispatcherConfig = Config(DispatcherGenerator, resolved);
const DispatcherWriteInstall = WriteInstall(DispatcherGenerator, resolved);

test('prompting', async (t) => {
  const expected = { name: 'Name Prompted', appId: 'AppId Prompted' };
  await helpers
    .create(DispatcherPrompt)
    .withPrompts(expected)
    .run()
    .then((result) => {
      t.plan(1);
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('configuring', async (t) => {
  const expected = { config: 'to be saved' };
  await helpers
    .create(DispatcherConfig)
    .withOptions({ props: expected })
    .run()
    .then((result) => {
      t.plan(1);
      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc, { '@adobe/generator-aem:dispatcher': expected }, 'Config saved.');
    });
});

test('writing/install - v6.5', async (t) => {
  t.plan(11);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'dispatcher');
  await helpers
    .create(DispatcherWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.dispatcher',
        name: 'Test Project - Dispatcher',
        appId: 'test',
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
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>dispatcher<\/module>/);
      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });
      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.dispatcher', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Dispatcher', 'Name set.');

      result.assertFile('assembly.xml');
      result.assertNoFile(path.join('src', 'opt-in', 'USE_SOURCES_DIRECTLY'));

      t.truthy(fs.lstatSync(path.join(fullPath, 'src', 'conf.d', 'enabled_vhosts', 'test_publish.vhost')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(fullPath, 'src', 'conf.d', 'enabled_vhosts', 'aem_author.vhost')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(fullPath, 'src', 'conf.d', 'enabled_vhosts', 'aem_flush.vhost')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(fullPath, 'src', 'conf.d', 'enabled_vhosts', 'aem_health.vhost')).isSymbolicLink());

      t.truthy(fs.lstatSync(path.join(fullPath, 'src', 'conf.dispatcher.d', 'enabled_farms', '000_ams_author_farm.any')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(fullPath, 'src', 'conf.dispatcher.d', 'enabled_farms', '999_ams_publish_farm.any')).isSymbolicLink());
      result.assertFileContent(path.join('src', 'conf.d', 'variables', 'ams_default.vars'), /Define CONTENT_FOLDER_NAME test/);

      result.assertFile(path.join('target', 'test.dispatcher-1.0.0-SNAPSHOT.zip'));

    });
});

test('writing/install - cloud', async (t) => {
  t.plan(7);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'dispatcher');

  await helpers
    .create(DispatcherWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'cloud.dispatcher',
        name: 'Test Project - Dispatcher',
        appId: 'test',
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: cloudSdkApiMetadata,
        aemVersion: 'cloud',
      }
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>dispatcher<\/module>/);
      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });
      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'cloud.dispatcher', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Dispatcher', 'Name set.');

      result.assertNoFileContent('pom.xml', /src\/conf\/httpd\.conf/);
      result.assertFileContent('pom.xml', /src\/conf\.d\/available_vhosts\/default\.vhost/);
      result.assertFile('assembly.xml');
      result.assertFile(path.join('src', 'opt-in', 'USE_SOURCES_DIRECTLY'));

      t.truthy(fs.lstatSync(path.join(fullPath, 'src', 'conf.d', 'enabled_vhosts', 'default.vhost')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(fullPath, 'src', 'conf.dispatcher.d', 'enabled_farms', 'default.farm')).isSymbolicLink());

      result.assertFileContent(path.join('src', 'conf.d', 'variables', 'custom.vars'), /Define CONTENT_FOLDER_NAME test/);

      result.assertFile(path.join('target', `cloud.dispatcher-1.0.0-SNAPSHOT.zip`));
    });
});
