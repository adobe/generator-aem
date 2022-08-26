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
import helpers from 'yeoman-test';
import sinon from 'sinon/pkg/sinon-esm.js';
import { XMLParser } from 'fast-xml-parser';

import MavenUtils from '../../../lib/maven-utils.js';
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata, addModulesToPom } from '../../fixtures/helpers.js';
import { config, writeInstall } from '../../fixtures/generators/wrappers.js';

import AllPackageGenerator from '../../../generators/package-all/index.js';

const resolved = generatorPath('package-all', 'index.js');
const AllConfig = config(AllPackageGenerator, resolved);
const AllWriteInstall = writeInstall(AllPackageGenerator, resolved);

test('configuring - v6.5', async (t) => {
  t.plan(1);
  const expected = { config: 'to be saved', analyserVersion: '1.4.16' };
  await helpers
    .create(AllConfig)
    .withOptions({
      props: expected,
      parentProps: { aemVersion: '6.5' },
    })
    .run()
    .then((result) => {
      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc, { '@adobe/generator-aem:package-all': expected }, 'Config saved.');
    });
});

test('configuring - cloud', async (t) => {
  t.plan(1);
  sinon.restore();

  const analyser = {
    groupId: 'com.adobe.aem',
    artifactId: 'aemanalyser-maven-plugin',
    version: '1.4.16',
  };

  const fake = sinon.fake.resolves(analyser);
  sinon.replace(MavenUtils, 'latestRelease', fake);

  const expected = { config: 'to be saved', analyserVersion: '1.4.16' };
  await helpers
    .create(AllConfig)
    .withOptions({
      props: expected,
      parentProps: { aemVersion: 'cloud' },
    })
    .run()
    .then((result) => {
      sinon.restore();

      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc, { '@adobe/generator-aem:package-all': expected }, 'Config saved.');
    });
});

test('writing/installing - no modules', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'all');

  await helpers
    .create(AllWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.all',
        name: 'Test Module - All Package',
        appId: 'test',
        analyserVersion: '1.4.16',
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
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>all<\/module>/);
      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.all', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - All Package', 'Name set.');

      result.assertFileContent(path.join(fullPath, 'pom.xml'), /<embeddeds>\s+<\/embeddeds>/);
      result.assertFileContent(path.join(fullPath, 'pom.xml'), /<artifactId>aemanalyser-maven-plugin<\/artifactId>/);
      result.assertFileContent(path.join(fullPath, 'pom.xml'), /<dependencies>\s+<\/dependencies>/);
    });
});

test('writing/installing - with modules', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'all');

  await helpers
    .create(AllWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.all',
        name: 'Test Module - All Package',
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
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'core' }] }, { module: [{ '#text': 'ui.apps' }] }, { module: [{ '#text': 'ui.config' }] }, { module: [{ '#text': 'ui.content' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'core', 'pom.xml'), path.join(temporaryDir, 'core', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'core', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': { artifactId: 'test.core' } }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault'), { recursive: true });
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps', 'pom.xml'), path.join(temporaryDir, 'ui.apps', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-apps': { artifactId: 'test.ui.apps' } }));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
        path.join(temporaryDir, 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml')
      );

      fs.mkdirSync(path.join(temporaryDir, 'ui.config'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.config', 'pom.xml'), path.join(temporaryDir, 'ui.config', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.config', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-config': { artifactId: 'test.ui.config' } }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault'), { recursive: true });
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.content', 'pom.xml'), path.join(temporaryDir, 'ui.content', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.content', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-content': { artifactId: 'test.ui.content' } }));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
        path.join(temporaryDir, 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml')
      );
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>all<\/module>/);
      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.all', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - All Package', 'Name set.');

      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.core<\/artifactId>\s+<target>\/apps\/test-packages\/application\/install<\/target>/
      );
      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.apps<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-packages\/application\/install<\/target>/
      );
      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.config<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-packages\/application\/install<\/target>/
      );
      // Result.assertFileContent(
      //   path.join(fullPath, 'pom.xml'),
      //   /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.content<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-packages\/application\/install<\/target>/
      // );

      result.assertFileContent(path.join(fullPath, 'pom.xml'), /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.core<\/artifactId>\s+<version>\${project.version}<\/version>/);
      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.apps<\/artifactId>\s+<version>\${project.version}<\/version>\s+<type>zip<\/type>/
      );
      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.config<\/artifactId>\s+<version>\${project.version}<\/version>\s+<type>zip<\/type>/
      );
      // Result.assertFileContent(
      //   path.join(fullPath, 'pom.xml'),
      //   /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.content<\/artifactId>\s+<version>\${project.version}<\/version>\s+<type>zip<\/type>/
      // );
    });
});

test('writing/installing - merges existing pom', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'all');

  await helpers
    .create(AllWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.all',
        name: 'Test Module - All Package',
        appId: 'test',
        analyserVersion: '1.4.16',
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
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'core' }] }, { module: [{ '#text': 'ui.apps' }] }, { module: [{ '#text': 'ui.config' }] }, { module: [{ '#text': 'ui.content' }] }]);

      fs.copyFileSync(fixturePath('projects', 'cloud', 'all', 'pom.xml'), path.join(fullPath, 'pom.xml'));

      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'core', 'pom.xml'), path.join(temporaryDir, 'core', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'core', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': { artifactId: 'test.core' } }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault'), { recursive: true });
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps', 'pom.xml'), path.join(temporaryDir, 'ui.apps', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-apps': { artifactId: 'test.ui.apps' } }));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
        path.join(temporaryDir, 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml')
      );

      fs.mkdirSync(path.join(temporaryDir, 'ui.config'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.config', 'pom.xml'), path.join(temporaryDir, 'ui.config', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.config', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-config': { artifactId: 'test.ui.config' } }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault'), { recursive: true });
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.content', 'pom.xml'), path.join(temporaryDir, 'ui.content', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.content', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-content': { artifactId: 'test.ui.content' } }));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
        path.join(temporaryDir, 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml')
      );
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>all<\/module>/);
      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.all', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - All Package', 'Name set.');

      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.core<\/artifactId>\s+<target>\/apps\/test-packages\/application\/install<\/target>/
      );
      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.apps<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-packages\/application\/install<\/target>/
      );
      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.config<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-packages\/application\/install<\/target>/
      );
      // Result.assertFileContent(
      //   path.join(fullPath, 'pom.xml'),
      //   /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.content<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-packages\/application\/install<\/target>/
      // );
      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>org.apache.commons<\/groupId>\s+<artifactId>commons-lang3<\/artifactId>\s+<target>\/apps\/test-vendor-packages\/application\/install<\/target>/
      );

      result.assertFileContent(path.join(fullPath, 'pom.xml'), /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.core<\/artifactId>\s+<version>\${project.version}<\/version>/);
      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.apps<\/artifactId>\s+<version>\${project.version}<\/version>\s+<type>zip<\/type>/
      );
      result.assertFileContent(
        path.join(fullPath, 'pom.xml'),
        /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.config<\/artifactId>\s+<version>\${project.version}<\/version>\s+<type>zip<\/type>/
      );
      // Result.assertFileContent(
      //   path.join(fullPath, 'pom.xml'),
      //   /<groupId>com.adobe.test<\/groupId>\s+<artifactId>test.ui.content<\/artifactId>\s+<version>\${project.version}<\/version>\s+<type>zip<\/type>/
      // );
      result.assertFileContent(path.join(fullPath, 'pom.xml'), /<groupId>org.apache.commons<\/groupId>\s+<artifactId>commons-lang3<\/artifactId>\s+<version>3.11<\/version>/);

      result.assertFileContent(path.join(fullPath, 'pom.xml'), /<id>precompiledScripts<\/id>/);
    });
});
