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
import project from '../../fixtures/helpers.js';
import AEMUIFrontendGenerator from '../../../generators/ui/frontend/index.js';
import { AEMAppWrapper } from '../../fixtures/wrappers/index.js';
import Utils from '../../../lib/utils.js';

const generatorPath = path.join(project.generatorsRoot, 'ui', 'frontend');

class Wrapper extends AEMUIFrontendGenerator {
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

test.serial('@adobe/aem:ui:frontend - via @adobe/generator-aem', async (t) => {
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
    .withGenerators([[Wrapper, '@adobe/aem:ui:frontend']])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: '6.5',
      modules: 'ui:frontend',
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
      const moduleDir = path.join(outputRoot, 'ui.frontend');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>ui.frontend<\/module>/);

      result.assertFile(path.join(moduleDir, '.babelrc'));
      result.assertFile(path.join(moduleDir, '.eslintrc.json'));
      result.assertFile(path.join(moduleDir, 'package.json'));

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
      t.is(pomData.project.artifactId, 'test.ui.frontend', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - UI Frontend', 'Name set.');
      result.assertFileContent(pom, /<artifactId>test.ui.frontend<\/artifactId>/);

      result.assertFile(path.join(moduleDir, 'README.md'));
      result.assertFile(path.join(moduleDir, 'tsconfig.json'));

      result.assertFile(path.join(moduleDir, 'webpack.common.js'));
      result.assertFile(path.join(moduleDir, 'webpack.dev.js'));
      result.assertFile(path.join(moduleDir, 'webpack.prod.js'));
      result.assertFile(path.join(moduleDir, 'clientlib.config.cjs'));

      result.assertFile(path.join(moduleDir, 'src', 'main', 'webpack', 'static', 'index.html'));

      // Build was successful
      result.assertFile(path.join(moduleDir, 'dist', 'clientlib-site', 'site.js'));
      result.assertFile(path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'apps', 'test', 'clientlibs', 'clientlib-dependencies', '.content.xml'));
      result.assertFile(path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'apps', 'test', 'clientlibs', 'clientlib-site', '.content.xml'));
      result.assertFile(path.join(moduleDir, 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));
    });
});

test.serial('@adobe/aem:ui:frontend - second module', async (t) => {
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
      generateInto: 'ui.general',
      name: 'Second Frontend',
      appId: 'second',
      showBuildOutput: false,
    })
    .inDir(fullPath, (temporary) => {
      fs.cpSync(path.join(project.fixturesRoot, 'projects'), path.join(temporary), { recursive: true });
    })
    .run()
    .then((result) => {
      sinon.restore();
      const moduleDir = path.join(fullPath, 'ui.general');
      result.assertFileContent(path.join(fullPath, 'pom.xml'), /<module>ui.general<\/module>/);

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
      t.is(pomData.project.name, 'Second Frontend', 'Name set.');

      // Build was successful
      result.assertFile(path.join(moduleDir, 'dist', 'clientlib-site', 'site.js'));
      result.assertFile(path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'apps', 'second', 'clientlibs', 'clientlib-dependencies', '.content.xml'));
      result.assertFile(path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'apps', 'second', 'clientlibs', 'clientlib-site', '.content.xml'));
      result.assertFile(path.join(moduleDir, 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));
    });
});
