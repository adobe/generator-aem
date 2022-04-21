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
import project from '../../fixtures/helpers.js';
import AEMUIAppsGenerator from '../../../generators/ui/apps/index.js';
import Utils from '../../../lib/utils.js';
import { AEMAppWrapper } from '../../fixtures/wrappers/index.js';

const generatorPath = path.join(project.generatorsRoot, 'ui', 'apps');

class Wrapper extends AEMUIAppsGenerator {
  constructor(args, options, features) {
    options.resolved = path.join(generatorPath, 'index.js');
    super(args, options, features);
  }

  initializing() {
    return super.initializing();
  }

  prompting() {
    return super.prompting();
  }

  configuring() {
    return super.configuring();
  }

  default() {
    return super.default();
  }

  writing() {
    return super.writing();
  }
}

test.serial('@adobe/aem:ui:apps - via @adobe/generator-aem - v6.5', async (t) => {
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
      path.join(project.generatorsRoot, 'bundle'),
      path.join(project.generatorsRoot, 'ui', 'frontend'),
      path.join(project.generatorsRoot, 'ui', 'apps', 'structure'),
      [Wrapper, '@adobe/aem:ui:apps'],
    ])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: '6.5',
      modules: 'bundle,ui:frontend,ui:apps:structure,ui:apps',
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
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>ui.apps<\/module>/);

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
      result.assertFileContent(pom, /<artifactId>test.core<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>test.ui.frontend<\/artifactId>/);
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

test.serial('@adobe/aem:ui:apps - second package - cloud', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    version: '2022.3.6698.20220318T233218Z-220400',
    path: 'com/adobe/aem/aem-sdk-api',
  };

  const stub = sinon.stub().resolves(aemData);
  sinon.replace(Utils, 'latestApi', stub);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');

  await helpers
    .create(Wrapper)
    .withGenerators([[AEMAppWrapper, '@adobe/aem:app']])
    .withOptions({
      defaults: true,
      examples: false,
      generateInto: 'second',
      appId: 'second',
      name: 'Second Package',
      showBuildOutput: false,
    })
    .inDir(fullPath, (temporary) => {
      fs.cpSync(path.join(project.fixturesRoot, 'projects'), temporary, { recursive: true });
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
