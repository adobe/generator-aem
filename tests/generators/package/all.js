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

import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';
import helpers from 'yeoman-test';

import { XMLParser } from 'fast-xml-parser';
import project from '../../fixtures/helpers.js';
import Utils from '../../../lib/utils.js';

import AEMBundleGenerator from '../../../generators/bundle/index.js';
import AEMUIAppsGenerator from '../../../generators/ui/apps/index.js';
import AEMUIConfigGenerator from '../../../generators/ui/config/index.js';
import AEMUIAppsStructureGenerator from '../../../generators/ui/apps/structure/index.js';
import AEMAllPackageGenerator from '../../../generators/package/all/index.js';

const generatorPath = path.join(project.generatorsRoot, 'package', 'all');

test.serial('@adobe/aem:package:all - via @adobe/generator-aem - v6.5 - no modules', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'uber-jar',
    version: '6.5.12',
    path: 'com/adobe/aem/uber-jar',
  };

  const stub = sinon.stub().resolves(aemData);
  sinon.replace(Utils, 'latestApi', stub);

  let temporaryDir;
  await helpers
    .create(path.join(project.generatorsRoot, 'app'))
    .withGenerators([[AEMAllPackageGenerator, '@adobe/aem:package:all', path.join(generatorPath, 'index.js')]])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: 6.5,
      modules: 'package:all',
      showBuildOutput: false,
    })
    .inTmpDir((dir) => {
      temporaryDir = dir;
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
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

test.serial('@adobe/aem:package:all - via @adobe/generator-aem - v6.5 - bundle', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'uber-jar',
    version: '6.5.12',
    path: 'com/adobe/aem/uber-jar',
  };

  const stub = sinon.stub().resolves(aemData);
  sinon.replace(Utils, 'latestApi', stub);

  let temporaryDir;
  await helpers
    .create(path.join(project.generatorsRoot, 'app'))
    .withGenerators([
      [AEMBundleGenerator, '@adobe/aem:bundle', path.join(project.generatorsRoot, 'bundle', 'index.js')],
      [AEMAllPackageGenerator, '@adobe/aem:package:all', path.join(generatorPath, 'index.js')],
    ])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: 6.5,
      modules: 'bundle,package:all',
      showBuildOutput: false,
    })
    .inTmpDir((dir) => {
      temporaryDir = dir;
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
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

test.serial('@adobe/aem:package:all - via @adobe/generator-aem - cloud - packages', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    version: '2022.3.6698.20220318T233218Z-220400',
    path: 'com/adobe/aem/aem-sdk-api',
  };

  const stub = sinon.stub().resolves(aemData);
  sinon.replace(Utils, 'latestApi', stub);

  let temporaryDir;
  await helpers
    .create(path.join(project.generatorsRoot, 'app'))
    .withGenerators([
      [AEMUIAppsGenerator, '@adobe/aem:ui:apps', path.join(project.generatorsRoot, 'ui', 'apps', 'index.js')],
      [AEMUIConfigGenerator, '@adobe/aem:ui:config', path.join(project.generatorsRoot, 'ui', 'config', 'index.js')],
      [AEMUIAppsStructureGenerator, '@adobe/aem:ui:apps:structure', path.join(project.generatorsRoot, 'ui', 'apps', 'structure', 'index.js')],
      [AEMAllPackageGenerator, '@adobe/aem:package:all', path.join(generatorPath, 'index.js')],
    ])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: 6.5,
      modules: 'ui:apps,ui:config,ui:apps:structure,package:all',
      showBuildOutput: false,
    })
    .inTmpDir((dir) => {
      temporaryDir = dir;
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
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
