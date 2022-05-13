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

import AEMBundleGenerator from '../../generators/bundle/index.js';
import AEMParentPomGenerator from '../../generators/app/pom/index.js';

test.serial('via @adobe/generator-aem - v6.5', async (t) => {
  t.plan(5);

  const stub = sinon.stub().resolves(aem65ApiMetadata);
  sinon.replace(AEMParentPomGenerator.prototype, '_latestRelease', stub);
  sinon.replace(AEMBundleGenerator.prototype, '_latestRelease', stub);

  let temporaryDir;
  await helpers
    .create(generatorPath('app'))
    .withGenerators([[AEMBundleGenerator, '@adobe/aem:bundle', generatorPath('bundle', 'index.js')]])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: '6.5',
      modules: 'bundle',
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
      const moduleDir = path.join(outputRoot, 'core');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>core<\/module>/);

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
      t.is(pomData.project.artifactId, 'test.core', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Core Bundle', 'Name set.');
      result.assertFileContent(pom, /<artifactId>uber-jar<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);

      const classesRoot = path.join(moduleDir, 'src', 'main', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(classesRoot, 'package-info.java'));
      result.assertFile(path.join(classesRoot, 'filters', 'LoggingFilter.java'));
      result.assertFile(path.join(classesRoot, 'listeners', 'SimpleResourceListener.java'));
      result.assertFile(path.join(classesRoot, 'schedulers', 'SimpleScheduledTask.java'));
      result.assertFile(path.join(classesRoot, 'servlets', 'SimpleServlet.java'));

      const testsRoot = path.join(moduleDir, 'src', 'test', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(testsRoot, 'filters', 'LoggingFilterTest.java'));
      result.assertFile(path.join(testsRoot, 'listeners', 'SimpleResourceListenerTest.java'));
      result.assertFile(path.join(testsRoot, 'schedulers', 'SimpleScheduledTaskTest.java'));
      result.assertFile(path.join(testsRoot, 'servlets', 'SimpleServletTest.java'));

      result.assertFile(path.join(moduleDir, 'src', 'main', 'bnd', `${properties.artifactId}.core.bnd`));

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.core-${properties.version}.jar`));
    });
});

test.serial('second bundle - cloud', async (t) => {
  t.plan(5);

  const stub = sinon.stub().resolves(cloudSdkApiMetadata);
  sinon.replace(AEMParentPomGenerator.prototype, '_latestRelease', stub);
  sinon.replace(AEMBundleGenerator.prototype, '_latestRelease', stub);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');

  await helpers
    .create(generatorPath('bundle'))
    .withGenerators([[AEMBundleGenerator, '@adobe/aem:bundle', generatorPath('bundle', 'index.js')]])
    .withOptions({
      defaults: true,
      examples: false,
      generateInto: 'bundle',
      appId: 'bundle',
      name: 'Second Bundle',
      package: 'com.adobe.test.bundle',
      showBuildOutput: false,
    })
    .inDir(fullPath, (temporary) => {
      fs.cpSync(fixturePath('projects'), temporary, { recursive: true });

      // Delete additional things to reduce context
      const data = JSON.parse(fs.readFileSync(path.join(temporary, '.yo-rc.json')));
      delete data['@adobe/generator-aem'].all;
      delete data['@adobe/generator-aem']['ui.apps'];
      delete data['@adobe/generator-aem']['ui.apps.structure'];
      delete data['@adobe/generator-aem']['ui.config'];
      delete data['@adobe/generator-aem']['it.tests'];
      delete data['@adobe/generator-aem']['ui.frontend'];
      fs.writeFileSync(path.join(temporary, '.yo-rc.json'), JSON.stringify(data, null, 2));
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
      const moduleDir = path.join(outputRoot, 'bundle');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>bundle<\/module>/);

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
      t.is(pomData.project.artifactId, 'bundle', 'ArtifactId set.');
      t.is(pomData.project.name, 'Second Bundle', 'Name set.');
      result.assertFileContent(pom, /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertNoFileContent(pom, /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);

      const classesRoot = path.join(moduleDir, 'src', 'main', 'java', 'com', 'adobe', 'test', 'bundle');
      result.assertFile(path.join(classesRoot, 'package-info.java'));
      result.assertNoFile(path.join(classesRoot, 'filters', 'LoggingFilter.java'));
      result.assertNoFile(path.join(classesRoot, 'listeners', 'SimpleResourceListener.java'));
      result.assertNoFile(path.join(classesRoot, 'schedulers', 'SimpleScheduledTask.java'));
      result.assertNoFile(path.join(classesRoot, 'servlets', 'SimpleServlet.java'));

      const testsRoot = path.join(moduleDir, 'src', 'test', 'java', 'com', 'adobe', 'test');
      result.assertNoFile(path.join(testsRoot, 'filters', 'LoggingFilterTest.java'));
      result.assertNoFile(path.join(testsRoot, 'listeners', 'SimpleResourceListenerTest.java'));
      result.assertNoFile(path.join(testsRoot, 'schedulers', 'SimpleScheduledTaskTest.java'));
      result.assertNoFile(path.join(testsRoot, 'servlets', 'SimpleServletTest.java'));

      result.assertFile(path.join(moduleDir, 'src', 'main', 'bnd', `${properties.artifactId}.bnd`));

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}-${properties.parent.version}.jar`));
    });
});

// TODO: Tests to update existing bundle
