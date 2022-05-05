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
import { generatorPath, fixturePath } from '../../fixtures/helpers.js';

import AEMGenerator from '../../../generators/app/index.js';
import AEMBundleGenerator from '../../../generators/bundle/index.js';
import AEMGeneralFEGenerator from '../../../generators/frontend-general/index.js';
import AEMStructurePackageGenerator from '../../../generators/package-structure/index.js';
import AEMAppsPackageGenerator from '../../../generators/package-apps/index.js';
import AEMParentPomGenerator from '../../../generators/app/pom/index.js';

test.serial('@adobe/aem:package-apps - via @adobe/generator-aem - v6.5', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'uber-jar',
    version: '6.5.12',
    path: 'com/adobe/aem/uber-jar',
  };
  const stub = sinon.stub().resolves(aemData);
  sinon.replace(AEMGenerator.prototype, '_latestApi', stub);
  sinon.replace(AEMParentPomGenerator.prototype, '_latestApi', stub);

  let temporaryDir;

  await helpers
    .create(generatorPath('app'))
    .withGenerators([
      [AEMBundleGenerator, '@adobe/aem:bundle', generatorPath('bundle', 'index.js')],
      [AEMGeneralFEGenerator, '@adobe/aem:frontend-general', generatorPath('frontend-general', 'index.js')],
      [AEMStructurePackageGenerator, '@adobe/aem:package-structure', generatorPath('package-structure', 'index.js')],
      [AEMAppsPackageGenerator, '@adobe/aem:package-apps', generatorPath('package-apps', 'index.js')],
    ])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: '6.5',
      modules: 'bundle,frontend-general,package-structure,package-apps',
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
      const moduleDir = path.join(outputRoot, 'ui.apps');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>ui\.apps<\/module>/);

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
      t.is(pomData.project.artifactId, 'test.ui.apps', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - UI Apps Package', 'Name set.');
      result.assertFileContent(pom, /<artifactId>test\.core<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>test\.ui\.frontend<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>uber-jar<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>cq-wcm-taglib<\/artifactId>/);

      result.assertFileContent(pom, /<directory>\${project\.basedir}\/\.\.\/ui\.frontend\/src\/main\/content\/jcr_root<\/directory>/);

      const contentPath = path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'apps', 'test');

      result.assertFile(path.join(contentPath, 'clientlibs', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', '.content.xml'));
      result.assertFile(path.join(contentPath, 'i18n', '.content.xml'));

      result.assertFile(path.join(contentPath, 'components', 'helloworld', 'helloworld.html'));

      result.assertFile(path.join(moduleDir, 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));
      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.ui.apps-${properties.version}.zip`));
    });
});

test.serial('@adobe/aem:package-apps - second package - cloud', async (t) => {
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

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');

  await helpers
    .create(generatorPath('package-apps'))
    .withGenerators([[AEMGenerator, '@adobe/aem:app', generatorPath('app', 'index.js')]])
    .withOptions({
      defaults: true,
      examples: false,
      generateInto: 'second',
      appId: 'second',
      name: 'Second Package',
      showBuildOutput: false,
    })
    .inDir(fullPath, (temporary) => {
      fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
      const moduleDir = path.join(outputRoot, 'second');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>second<\/module>/);

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
      t.is(pomData.project.name, 'Second Package', 'Name set.');
      result.assertNoFileContent(pom, /<artifactId>test.core<\/artifactId>/);
      result.assertNoFileContent(pom, /<artifactId>test.ui.frontend<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertNoFileContent(pom, /<directory>\${project\.basedir}\/\.\.\/ui\.frontend\/src\/main\/content\/jcr_root<\/directory>/);
      const contentPath = path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'apps', 'second');

      result.assertFile(path.join(contentPath, 'clientlibs', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', '.content.xml'));
      result.assertFile(path.join(contentPath, 'i18n', '.content.xml'));
      result.assertNoFile(path.join(contentPath, 'components', 'helloworld', 'helloworld.html'));

      result.assertFile(path.join(moduleDir, 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));
      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}-${properties.parent.version}.zip`));
    });
});