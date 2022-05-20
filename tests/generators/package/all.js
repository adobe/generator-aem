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
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata } from '../../fixtures/helpers.js';

import BundleGenerator from '../../../generators/bundle/index.js';
import ConfigPackageGenerator from '../../../generators/package-config/index.js';
import StructurePackageGenerator from '../../../generators/package-structure/index.js';
import AllPackageGenerator from '../../../generators/package-all/index.js';
import ParentPomGenerator from '../../../generators/app/pom/index.js';
import AppsPackageGenerator from '../../../generators/package-apps/index.js';

test.serial('via @adobe/generator-aem - v6.5 - no modules', async (t) => {
  t.plan(5);

  sinon.restore();
  const stub = sinon.stub().resolves(aem65ApiMetadata);
  sinon.replace(ParentPomGenerator.prototype, '_latestRelease', stub);

  await helpers
    .create(generatorPath('app'))
    .withGenerators([[AllPackageGenerator, '@adobe/aem:package-all', generatorPath('package-all', 'index.js')]])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: '6.5',
      modules: 'package-all',
      showBuildOutput: false,
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = result.generator.destinationPath();
      const moduleDir = path.join(outputRoot, 'all');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>all<\/module>/);

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
      t.is(pomData.project.artifactId, 'test.all', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - All', 'Name set.');

      result.assertNoFileContent(pom, /<artifactId>test\.ui\.apps<\/artifactId>/);
      result.assertNoFileContent(pom, /<artifactId>test\.ui\.core<\/artifactId>/);
      result.assertNoFileContent(pom, /<artifactId>test\.ui\.config<\/artifactId>/);
      result.assertNoFileContent(pom, /<target>\/apps\/test-packages\/application\/install<\/target>/);

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.all-${properties.version}.zip`));
    });
});

test.serial('via @adobe/generator-aem - v6.5 - bundle', async (t) => {
  t.plan(5);

  sinon.restore();
  const stub = sinon.stub().resolves(aem65ApiMetadata);
  sinon.replace(ParentPomGenerator.prototype, '_latestRelease', stub);

  await helpers
    .create(generatorPath('app'))
    .withGenerators([
      [BundleGenerator, '@adobe/aem:bundle', generatorPath('bundle', 'index.js')],
      [AllPackageGenerator, '@adobe/aem:package-all', generatorPath('package-all', 'index.js')],
    ])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: 6.5,
      modules: 'bundle,package-all',
      showBuildOutput: false,
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = result.generator.destinationPath();
      const moduleDir = path.join(outputRoot, 'all');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>all<\/module>/);

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
      t.is(pomData.project.artifactId, 'test.all', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - All', 'Name set.');

      result.assertFileContent(pom, /<artifactId>test\.core<\/artifactId>/);
      result.assertNoFileContent(pom, /<artifactId>test\.ui\.apps<\/artifactId>/);
      result.assertNoFileContent(pom, /<artifactId>test\.ui\.config<\/artifactId>/);
      result.assertFileContent(pom, /<target>\/apps\/test-packages\/application\/install<\/target>/);

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.all-${properties.version}.zip`));
    });
});

test.serial('via @adobe/generator-aem - cloud - packages', async (t) => {
  t.plan(5);

  sinon.restore();
  const stub = sinon.stub().resolves(cloudSdkApiMetadata);
  sinon.replace(ParentPomGenerator.prototype, '_latestRelease', stub);

  await helpers
    .create(generatorPath('app'))
    .withGenerators([
      [StructurePackageGenerator, '@adobe/aem:package-structure', generatorPath('package-structure', 'index.js')],
      [AppsPackageGenerator, '@adobe/aem:package-apps', generatorPath('package-apps', 'index.js')],
      [ConfigPackageGenerator, '@adobe/aem:package-config', generatorPath('package-config', 'index.js')],
      [AllPackageGenerator, '@adobe/aem:package-all', generatorPath('package-all', 'index.js')],
    ])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: 'cloud',
      modules: 'package-apps,package-config,package-structure,package-all',
      showBuildOutput: false,
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = result.generator.destinationPath();
      const moduleDir = path.join(outputRoot, 'all');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>all<\/module>/);

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
      t.is(pomData.project.artifactId, 'test.all', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - All', 'Name set.');

      result.assertNoFileContent(pom, /<artifactId>test\.core<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>test\.ui\.apps<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>test\.ui\.config<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>test\.ui\.apps\.structure<\/artifactId>/);
      result.assertFileContent(pom, /<target>\/apps\/test-packages\/application\/install<\/target>/);

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.all-${properties.version}.zip`));
    });
});

test.serial('add module to existing project', async (t) => {
  t.plan(5);
  sinon.restore();
  const stub = sinon.stub().resolves(cloudSdkApiMetadata);
  sinon.replace(ParentPomGenerator.prototype, '_latestRelease', stub);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');
  await helpers
    .create(generatorPath('package-all'))
    .withGenerators([
      [StructurePackageGenerator, '@adobe/aem:package-structure', generatorPath('package-structure', 'index.js')],
      [AppsPackageGenerator, '@adobe/aem:package-apps', generatorPath('package-apps', 'index.js')],
      [ConfigPackageGenerator, '@adobe/aem:package-config', generatorPath('package-config', 'index.js')],
      [AllPackageGenerator, '@adobe/aem:package-all', generatorPath('package-all', 'index.js')],
    ])
    .withOptions({
      defaults: true,
      examples: false,
      generateInto: 'ui.all.other',
      appId: 'other',
      name: 'Second All',
      showBuildOutput: false,
    })
    .inDir(fullPath, (temporary) => {
      fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
      fs.rmSync(path.join(temporary, 'all'), { recursive: true });
      const data = JSON.parse(fs.readFileSync(path.join(temporary, '.yo-rc.json')));
      delete data['@adobe/generator-aem'].all;
      delete data['@adobe/generator-aem'].core;
      delete data['@adobe/generator-aem']['it.tests'];
      delete data['@adobe/generator-aem']['ui.frontend'];
      fs.writeFileSync(path.join(temporary, '.yo-rc.json'), JSON.stringify(data, null, 2));
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
      const moduleDir = path.join(fullPath, 'ui.all.other');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>ui\.all\.other<\/module>/);

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
      t.is(pomData.project.artifactId, 'other', 'ArtifactId set.');
      t.is(pomData.project.name, 'Second All', 'Name set.');

      result.assertFileContent(pom, /<artifactId>test\.ui\.apps<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>test\.ui\.config<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>test\.ui\.apps\.structure<\/artifactId>/);
      result.assertFileContent(pom, /<target>\/apps\/other-packages\/application\/install<\/target>/);

      result.assertFile(path.join(moduleDir, 'target', `other-${properties.parent.version}.zip`));
    });
});

test('second module fails', async (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');

  const error = await t.throwsAsync(
    helpers
      .create(generatorPath('package-all'))
      .withOptions({
        defaults: true,
        examples: false,
        generateInto: 'ui.all.other',
        appId: 'other',
        name: 'Second All',
        showBuildOutput: false,
      })
      .inDir(fullPath, (temporary) => {
        fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
      })
      .run()
  );

  t.regex(error.message, /Refusing to create a second All Package module\./);
});
