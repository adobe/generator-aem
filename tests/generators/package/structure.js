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
import { generatorPath, fixturePath } from '../../fixtures/helpers.js';

import AEMGenerator from '../../../generators/app/index.js';
import AEMStructurePackageGenerator from '../../../generators/package-structure/index.js';
import AEMParentPomGenerator from '../../../generators/app/pom/index.js';

test.serial('@adobe/aem:package-structure - via @adobe/generator-aem', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    version: '2022.3.6698.20220318T233218Z-220400',
    path: 'com/adobe/aem/aem-sdk-api',
  };

  const stub = sinon.stub().resolves(aemData);
  sinon.replace(AEMGenerator.prototype, '_latestApi', stub);
  sinon.replace(AEMParentPomGenerator.prototype, '_latestApi', stub);

  let temporaryDir;
  await helpers
    .create(generatorPath('app'))
    .withGenerators([[AEMStructurePackageGenerator, '@adobe/aem:package-structure', generatorPath('package-structure', 'index.js')]])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: '6.5',
      modules: 'package-structure',
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

      result.assertFileContent(pom, /<filter><root>\/apps\/test<\/root><\/filter>/);
      result.assertFileContent(pom, /<filter><root>\/content\/dam\/test<\/root><\/filter>/);
      result.assertFile(path.join(moduleDir, 'README.md'));

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.ui.apps.structure-${properties.version}.zip`));
    });
});

test('@adobe/aem:package-structure - second package fails', async (t) => {
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