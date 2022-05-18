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
import sinon from 'sinon/pkg/sinon-esm.js';
import helpers from 'yeoman-test';

import { XMLParser } from 'fast-xml-parser';
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata } from '../fixtures/helpers.js';

import AEMDispatcherGenerator from '../../generators/dispatcher/index.js';
import AEMParentPomGenerator from '../../generators/app/pom/index.js';

test.serial('via @adobe/generator-aem - v6.5 - no content', async (t) => {
  t.plan(11);

  sinon.restore();
  const stub = sinon.stub().resolves(aem65ApiMetadata);
  sinon.replace(AEMParentPomGenerator.prototype, '_latestRelease', stub);

  let temporaryDir;
  await helpers
    .create(generatorPath('app'))
    .withGenerators([[AEMDispatcherGenerator, '@adobe/aem:dispatcher', generatorPath('dispatcher', 'index.js')]])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: '6.5',
      modules: 'dispatcher',
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
      const moduleDir = path.join(outputRoot, 'dispatcher');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>dispatcher<\/module>/);

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
      t.is(pomData.project.artifactId, 'test.dispatcher', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Dispatcher', 'Name set.');

      result.assertFileContent(pom, /src\/conf\/httpd\.conf/);
      result.assertFile(path.join(moduleDir, 'assembly.xml'));
      result.assertNoFile(path.join(moduleDir, 'src', 'opt-in', 'USE_SOURCES_DIRECTLY'));

      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.d', 'enabled_vhosts', 'test_publish.vhost')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.d', 'enabled_vhosts', 'aem_author.vhost')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.d', 'enabled_vhosts', 'aem_flush.vhost')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.d', 'enabled_vhosts', 'aem_health.vhost')).isSymbolicLink());

      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.dispatcher.d', 'enabled_farms', '000_ams_author_farm.any')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.dispatcher.d', 'enabled_farms', '999_ams_publish_farm.any')).isSymbolicLink());
      result.assertFileContent(path.join(moduleDir, 'src', 'conf.d', 'variables', 'ams_default.vars'), /Define CONTENT_FOLDER_NAME test/);

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.dispatcher-${properties.version}.zip`));
    });
});

test.serial('via @adobe/generator-aem - cloud - no content', async (t) => {
  t.plan(7);

  sinon.restore();
  const stub = sinon.stub().resolves(cloudSdkApiMetadata);
  sinon.replace(AEMParentPomGenerator.prototype, '_latestRelease', stub);

  let temporaryDir;
  await helpers
    .create(generatorPath('app'))
    .withGenerators([[AEMDispatcherGenerator, '@adobe/aem:dispatcher', generatorPath('dispatcher', 'index.js')]])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: 'cloud',
      modules: 'dispatcher',
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
      const moduleDir = path.join(outputRoot, 'dispatcher');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>dispatcher<\/module>/);

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
      t.is(pomData.project.artifactId, 'test.dispatcher', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Dispatcher', 'Name set.');

      result.assertNoFileContent(pom, /src\/conf\/httpd\.conf/);
      result.assertFileContent(pom, /src\/conf\.d\/available_vhosts\/default\.vhost/);
      result.assertFile(path.join(moduleDir, 'assembly.xml'));
      result.assertFile(path.join(moduleDir, 'src', 'opt-in', 'USE_SOURCES_DIRECTLY'));

      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.d', 'enabled_vhosts', 'default.vhost')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.dispatcher.d', 'enabled_farms', 'default.farm')).isSymbolicLink());

      result.assertFileContent(path.join(moduleDir, 'src', 'conf.d', 'variables', 'custom.vars'), /Define CONTENT_FOLDER_NAME test/);

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.dispatcher-${properties.version}.zip`));
    });
});

test.serial('add module to existing project', async (t) => {
  t.plan(7);

  sinon.restore();
  const stub = sinon.stub().resolves(cloudSdkApiMetadata);
  sinon.replace(AEMParentPomGenerator.prototype, '_latestRelease', stub);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');
  await helpers
    .create(generatorPath('dispatcher'))
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'other',
      artifactId: 'dispatcher.other',
      generateInto: 'dispatcher.other',
      name: 'Other Dispatcher',
      groupId: 'com.adobe.test',
      aemVersion: 'cloud',
      modules: 'dispatcher',
      showBuildOutput: false,
    })
    .inDir(fullPath, (temporary) => {
      fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
      fs.rmSync(path.join(temporary, 'dispatcher'), { recursive: true });
      const data = JSON.parse(fs.readFileSync(path.join(temporary, '.yo-rc.json')));
      delete data['@adobe/generator-aem'].all;
      delete data['@adobe/generator-aem'].core;
      delete data['@adobe/generator-aem']['ui.apps'];
      delete data['@adobe/generator-aem']['ui.apps.structure'];
      delete data['@adobe/generator-aem']['ui.config'];
      delete data['@adobe/generator-aem']['it.tests'];
      delete data['@adobe/generator-aem']['ui.frontend'];
      delete data['@adobe/generator-aem'].dispatcher;
      fs.writeFileSync(path.join(temporary, '.yo-rc.json'), JSON.stringify(data, null, 2));
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
      const moduleDir = path.join(outputRoot, 'dispatcher.other');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>dispatcher\.other<\/module>/);

      const pom = path.join(moduleDir, 'pom.xml');
      result.assertFile(pom);
      const pomString = fs.readFileSync(pom, 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });
      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, properties.parent.groupId, 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'dispatcher.other', 'ArtifactId set.');
      t.is(pomData.project.name, 'Other Dispatcher', 'Name set.');

      result.assertNoFileContent(pom, /src\/conf\/httpd\.conf/);
      result.assertFileContent(pom, /src\/conf\.d\/available_vhosts\/default\.vhost/);
      result.assertFile(path.join(moduleDir, 'assembly.xml'));
      result.assertFile(path.join(moduleDir, 'src', 'opt-in', 'USE_SOURCES_DIRECTLY'));

      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.d', 'enabled_vhosts', 'default.vhost')).isSymbolicLink());
      t.truthy(fs.lstatSync(path.join(moduleDir, 'src', 'conf.dispatcher.d', 'enabled_farms', 'default.farm')).isSymbolicLink());

      result.assertFileContent(path.join(moduleDir, 'src', 'conf.d', 'variables', 'custom.vars'), /Define CONTENT_FOLDER_NAME other/);

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}-${properties.parent.version}.zip`));
    });
});

test('second module fails', async (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');

  const error = await t.throwsAsync(
    helpers
      .create(generatorPath('dispatcher'))
      .withOptions({
        defaults: true,
        examples: false,
        generateInto: 'dispatcher.other',
        appId: 'other',
        name: 'Second Dispatcher',
        showBuildOutput: false,
      })
      .inDir(fullPath, (temporary) => {
        fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
      })
      .run()
  );

  t.regex(error.message, /Refusing to create a second Dispatcher module\./);
});
