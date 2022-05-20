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

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import tempDirectory from 'temp-dir';

import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';
import helpers from 'yeoman-test';

import { XMLParser } from 'fast-xml-parser';
import { generatorPath, fixturePath, cloudSdkApiMetadata } from '../../fixtures/helpers.js';

import StructurePackageGenerator from '../../../generators/package-structure/index.js';
import ParentPomGenerator from '../../../generators/app/pom/index.js';
import ConfigPackageGenerator from '../../../generators/package-config/index.js';
import AppsPackageGenerator from '../../../generators/package-apps/index.js';

test.serial('via @adobe/generator-aem', async (t) => {
  t.plan(5);

  sinon.restore();
  const stub = sinon.stub().resolves(cloudSdkApiMetadata);
  sinon.replace(ParentPomGenerator.prototype, '_latestRelease', stub);

  await helpers
    .create(generatorPath('app'))
    .withGenerators([[StructurePackageGenerator, '@adobe/aem:package-structure', generatorPath('package-structure', 'index.js')]])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: 'cloud',
      modules: 'package-structure',
      showBuildOutput: false,
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = result.generator.destinationPath();
      const moduleDir = path.join(outputRoot, 'ui.apps.structure');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>ui\.apps.structure<\/module>/);

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
      t.is(pomData.project.artifactId, 'test.ui.apps.structure', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Repository Structure Package', 'Name set.');

      result.assertFile(path.join(moduleDir, 'README.md'));

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.ui.apps.structure-${properties.version}.zip`));
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
    .create(generatorPath('package-structure'))
    .withGenerators([
      [ConfigPackageGenerator, '@adobe/aem:package-config', generatorPath('package-config', 'index.js')],
      [AppsPackageGenerator, '@adobe/aem:package-apps', generatorPath('package-apps', 'index.js')],
    ])
    .withOptions({
      defaults: true,
      examples: false,
      generateInto: 'second.structure',
      appId: 'test',
      artifactId: 'second',
      name: 'Structure Package',
      showBuildOutput: false,
    })
    .inDir(fullPath, (temporary) => {
      fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
      fs.rmSync(path.join(temporary, 'ui.apps.structure'), { recursive: true });

      const data = JSON.parse(fs.readFileSync(path.join(temporary, '.yo-rc.json')));
      // Delete initial structure package
      delete data['@adobe/generator-aem']['ui.apps.structure'];
      // Delete additional things to reduce context
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
      const moduleDir = path.join(fullPath, 'second.structure');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>second.structure<\/module>/);

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
      t.is(pomData.project.artifactId, 'second', 'ArtifactId set.');
      t.is(pomData.project.name, 'Structure Package', 'Name set.');

      result.assertFileContent(pom, /<filter><root>\/apps\/test<\/root><\/filter>/);
      result.assertFileContent(pom, /<filter><root>\/content\/dam\/test<\/root><\/filter>/);
      result.assertFile(path.join(moduleDir, 'README.md'));

      result.assertFile(path.join(moduleDir, 'target', `second-${properties.parent.version}.zip`));
    });
});

test('second package fails', async (t) => {
  t.plan(2);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');

  const error = await t.throwsAsync(
    helpers
      .create(generatorPath('package-structure'))
      .withOptions({
        defaults: true,
        examples: false,
        generateInto: 'ui.apps.otherstructure',
        appId: 'othersturcture',
        name: 'Second Structure',
        showBuildOutput: false,
      })
      .inDir(fullPath, (temporary) => {
        fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
      })
      .run()
  );

  t.regex(error.message, /Refusing to create a second Repository Structure module\./);
});
