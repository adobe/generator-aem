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

import _ from 'lodash';
import test from 'ava';
import helpers from 'yeoman-test';
import { XMLParser } from 'fast-xml-parser';

import BundleGenerator from '../../generators/bundle/index.js';
import { init, prompt, config, writeInstall } from '../fixtures/generators/wrappers.js';
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata, addModulesToPom } from '../fixtures/helpers.js';

const resolved = generatorPath('bundle', 'index.js');
const BundleInit = init(BundleGenerator, resolved);
const BundlePrompt = prompt(BundleGenerator, resolved);
const BundleConfig = config(BundleGenerator, resolved);
const BundleWriteInstall = writeInstall(BundleGenerator, resolved);

test('initializing - no options', async (t) => {
  t.plan(1);
  await helpers
    .create(BundleInit)
    .run()
    .then((result) => {
      const expected = {
        package: undefined,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('initializing - package option', async (t) => {
  t.plan(1);

  await helpers
    .create(BundleInit)
    .withOptions({ package: 'com.test.option' })
    .run()
    .then((result) => {
      const expected = {
        package: 'com.test.option',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('initializing - invalid package option', async (t) => {
  t.plan(1);

  await helpers
    .create(BundleInit)
    .withOptions({ package: 'th3s.|s.N0t.Allow3d' })
    .run()
    .then((result) => {
      const expected = {
        package: undefined,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('initializing - package defaults to parent groupId', async (t) => {
  t.plan(1);

  await helpers
    .create(BundleInit)
    .withOptions({ parentProps: { groupId: 'com.test.parent' } })
    .run()
    .then((result) => {
      const expected = {
        package: 'com.test.parent',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('prompting - package - default', async (t) => {
  t.plan(1);

  await helpers
    .create(BundlePrompt)
    .withOptions({ props: { package: 'com.adobe.test' } })
    .run()
    .then((result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'package' });
      t.is(prompt.default, 'com.adobe.test', 'Default set');
    });
});

test('prompting - package - when - defaults & no options', async (t) => {
  t.plan(1);

  await helpers
    .create(BundlePrompt)
    .withOptions({ defaults: true })
    .withPrompts({ package: 'not used' })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'package' });
      t.false(await prompt.when(), 'Prompts for package.');
    });
});

test('prompting - package - when - defaults & option', async (t) => {
  t.plan(1);

  await helpers
    .create(BundlePrompt)
    .withOptions({ defaults: true, package: 'com.adobe.option' })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'package' });
      t.false(await prompt.when(), 'Does not prompt for package.');
    });
});

test('prompting - package - validate', async (t) => {
  t.plan(4);

  await helpers
    .create(BundlePrompt)
    .withOptions({ defaults: true })
    .withPrompts({ package: 'not used' })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'package' });
      t.is(await prompt.validate(), 'Package must be provided.', 'Error message correct.');
      t.is(await prompt.validate(''), 'Package must be provided.', 'Error message correct.');
      t.is(await prompt.validate('th3s.|s.N0t.Allow3d'), 'Package must only contain letters or periods (.).', 'Error message correct.');
      t.true(await prompt.validate('com.adobe.test'), 'Valid package.');
    });
});

test('configuring', async (t) => {
  t.plan(1);

  const expected = { config: 'to be saved' };
  await helpers
    .create(BundleConfig)
    .withOptions({ props: expected })
    .run()
    .then((result) => {
      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc, { '@adobe/generator-aem:bundle': expected }, 'Config saved.');
    });
});

test('writing/installing - v6.5 - new', async (t) => {
  t.plan(5);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'core');
  await helpers
    .create(BundleWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        examples: true,
        package: 'com.adobe.test',
        artifactId: 'test.core',
        name: 'Name',
        appId: 'test',
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: aem65ApiMetadata,
        aemVersion: '6.5',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'v6.5', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>core<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), { encoding: 'utf8' });
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.core', 'ArtifactId set.');
      t.is(pomData.project.name, 'Name', 'Name set.');

      result.assertFileContent('pom.xml', /<artifactId>uber-jar<\/artifactId>/);
      result.assertFileContent('pom.xml', /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);

      const classesRoot = path.join('src', 'main', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(classesRoot, 'package-info.java'));
      result.assertFile(path.join(classesRoot, 'filters', 'LoggingFilter.java'));
      result.assertFile(path.join(classesRoot, 'listeners', 'SimpleResourceListener.java'));
      result.assertFile(path.join(classesRoot, 'schedulers', 'SimpleScheduledTask.java'));
      result.assertFile(path.join(classesRoot, 'servlets', 'SimpleServlet.java'));

      const testsRoot = path.join('src', 'test', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(testsRoot, 'filters', 'LoggingFilterTest.java'));
      result.assertFile(path.join(testsRoot, 'listeners', 'SimpleResourceListenerTest.java'));
      result.assertFile(path.join(testsRoot, 'schedulers', 'SimpleScheduledTaskTest.java'));
      result.assertFile(path.join(testsRoot, 'servlets', 'SimpleServletTest.java'));
      result.assertFile(path.join('src', 'main', 'bnd', `test.core.bnd`));
      result.assertFile(path.join('target', `test.core-1.0.0-SNAPSHOT.jar`));
    });
});

test('writing/installing - cloud - new', async (t) => {
  t.plan(5);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'core');
  await helpers
    .create(BundleWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        package: 'com.adobe.test',
        artifactId: 'test.core',
        name: 'Name',
        appId: 'test',
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: cloudSdkApiMetadata,
        aemVersion: 'cloud',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>core<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), { encoding: 'utf8' });
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.core', 'ArtifactId set.');
      t.is(pomData.project.name, 'Name', 'Name set.');

      result.assertFileContent('pom.xml', /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);

      const classesRoot = path.join('src', 'main', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(classesRoot, 'package-info.java'));
      result.assertNoFile(path.join(classesRoot, 'filters', 'LoggingFilter.java'));
      result.assertNoFile(path.join(classesRoot, 'listeners', 'SimpleResourceListener.java'));
      result.assertNoFile(path.join(classesRoot, 'schedulers', 'SimpleScheduledTask.java'));
      result.assertNoFile(path.join(classesRoot, 'servlets', 'SimpleServlet.java'));

      const testsRoot = path.join('src', 'test', 'java', 'com', 'adobe', 'test');
      result.assertNoFile(path.join(testsRoot, 'filters', 'LoggingFilterTest.java'));
      result.assertNoFile(path.join(testsRoot, 'listeners', 'SimpleResourceListenerTest.java'));
      result.assertNoFile(path.join(testsRoot, 'schedulers', 'SimpleScheduledTaskTest.java'));
      result.assertNoFile(path.join(testsRoot, 'servlets', 'SimpleServletTest.java'));

      result.assertFile(path.join('src', 'main', 'bnd', `test.core.bnd`));
      result.assertFile(path.join('target', `test.core-1.0.0-SNAPSHOT.jar`));
    });
});

test('writing/installing - cloud - second', async (t) => {
  t.plan(5);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'new');
  await helpers
    .create(BundleWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        examples: true,
        package: 'com.adobe.test',
        artifactId: 'test.new',
        name: 'Name',
        appId: 'new',
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: cloudSdkApiMetadata,
        aemVersion: 'cloud',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'core', 'pom.xml'), path.join(temporaryDir, 'core', 'pom.xml'));
      addModulesToPom(temporaryDir, ['core']);
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>new<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), { encoding: 'utf8' });
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.new', 'ArtifactId set.');
      t.is(pomData.project.name, 'Name', 'Name set.');

      result.assertFileContent('pom.xml', /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);

      const classesRoot = path.join('src', 'main', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(classesRoot, 'package-info.java'));
      result.assertFile(path.join(classesRoot, 'filters', 'LoggingFilter.java'));
      result.assertFile(path.join(classesRoot, 'listeners', 'SimpleResourceListener.java'));
      result.assertFile(path.join(classesRoot, 'schedulers', 'SimpleScheduledTask.java'));
      result.assertFile(path.join(classesRoot, 'servlets', 'SimpleServlet.java'));

      const testsRoot = path.join('src', 'test', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(testsRoot, 'filters', 'LoggingFilterTest.java'));
      result.assertFile(path.join(testsRoot, 'listeners', 'SimpleResourceListenerTest.java'));
      result.assertFile(path.join(testsRoot, 'schedulers', 'SimpleScheduledTaskTest.java'));
      result.assertFile(path.join(testsRoot, 'servlets', 'SimpleServletTest.java'));

      result.assertFile(path.join('src', 'main', 'bnd', `test.new.bnd`));
      result.assertFile(path.join('target', `test.new-1.0.0-SNAPSHOT.jar`));
    });
});

test('writing/installing - merges existing pom', async (t) => {
  t.plan(5);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'core');
  await helpers
    .create(BundleWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        package: 'com.adobe.test',
        artifactId: 'test.core',
        name: 'Name',
        appId: 'test',
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: cloudSdkApiMetadata,
        aemVersion: 'cloud',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'core', 'pom.xml'), path.join(fullPath, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>core<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), { encoding: 'utf8' });
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.core', 'ArtifactId set.');
      t.is(pomData.project.name, 'Name', 'Name set.');

      result.assertFileContent('pom.xml', /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertFileContent('pom.xml', /<artifactId>commons-lang3<\/artifactId>/);
      result.assertFileContent('pom.xml', /<property>someproperty<\/property>/);
      result.assertFileContent('pom.xml', /<id>autoInstallBundle<\/id>/);
      result.assertNoFileContent('pom.xml', /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);

      const classesRoot = path.join('src', 'main', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(classesRoot, 'package-info.java'));
      result.assertNoFile(path.join(classesRoot, 'filters', 'LoggingFilter.java'));
      result.assertNoFile(path.join(classesRoot, 'listeners', 'SimpleResourceListener.java'));
      result.assertNoFile(path.join(classesRoot, 'schedulers', 'SimpleScheduledTask.java'));
      result.assertNoFile(path.join(classesRoot, 'servlets', 'SimpleServlet.java'));

      const testsRoot = path.join('src', 'test', 'java', 'com', 'adobe', 'test');
      result.assertNoFile(path.join(testsRoot, 'filters', 'LoggingFilterTest.java'));
      result.assertNoFile(path.join(testsRoot, 'listeners', 'SimpleResourceListenerTest.java'));
      result.assertNoFile(path.join(testsRoot, 'schedulers', 'SimpleScheduledTaskTest.java'));
      result.assertNoFile(path.join(testsRoot, 'servlets', 'SimpleServletTest.java'));

      result.assertFile(path.join('src', 'main', 'bnd', `test.core.bnd`));
      result.assertFile(path.join('target', `test.core-1.0.0-SNAPSHOT.jar`));
    });
});
