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
import helpers from 'yeoman-test';

import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { generatorPath, fixturePath, aem65ApiMetadata, cloudSdkApiMetadata } from '../../fixtures/helpers.js';
import { Config, WriteInstall } from '../../fixtures/generators/wrappers.js';

import StructurePackageGenerator from '../../../generators/package-structure/index.js';
import PomUtils from '../../../lib/pom-utils.js';

const resolved = generatorPath('package-structure', 'index.js');
const StructureConfig = Config(StructurePackageGenerator, resolved);
const StructureWriteInstall = WriteInstall(StructurePackageGenerator, resolved);

test('configuring - generates appId list', async (t) => {
  t.plan(1);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps.structure');

  await helpers
    .create(StructureConfig)
    .withOptions({ props: { appId: 'passed' } })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      const parser = new XMLParser(PomUtils.xmlOptions);
      const builder = new XMLBuilder(PomUtils.xmlOptions);
      const pom = path.join(temporaryDir, 'pom.xml');
      const pomData = parser.parse(fs.readFileSync(pom, PomUtils.fileOptions));
      const proj = PomUtils.findPomNodeArray(pomData, 'project');
      const modules = {
        modules: [{ module: [{ '#text': 'ui.apps' }] }, { module: [{ '#text': 'ui.config' }] }, { module: [{ '#text': 'ui.content' }] }],
      };
      proj.splice(7, 0, modules);
      fs.writeFileSync(pom, PomUtils.fixXml(builder.build(pomData)));

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-apps': { appId: 'test' } }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.config'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.config', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-config': { appId: 'config' } }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.content'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.content', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-content': { appId: 'test' } }));
    })
    .run()
    .then((result) => {
      const expected = {
        appId: 'passed',
        appIds: ['passed', 'test', 'config'],
      };
      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc, { '@adobe/generator-aem:package-structure': expected }, 'Config saved.');
    });
});

test('writing/installing', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps.structure');

  await helpers
    .create(StructureWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.apps.structure',
        name: 'Test Module - Apps Structure',
        appIds: ['test', 'other'],
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: cloudSdkApiMetadata,
        aemVersion: '6.5',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.apps.structure<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.apps.structure', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - Apps Structure', 'Name set.');

      result.assertFileContent('pom.xml', /<filter><root>\/apps\/test<\/root><\/filter>/);
      result.assertFileContent('pom.xml', /<filter><root>\/apps\/other<\/root><\/filter>/);
      result.assertFileContent('pom.xml', /<filter><root>\/content\/dam\/test<\/root><\/filter>/);
      result.assertFileContent('pom.xml', /<filter><root>\/content\/dam\/other<\/root><\/filter>/);
      result.assertFile(path.join('target', 'test.ui.apps.structure-1.0.0-SNAPSHOT.zip'));
    });
});

test('writing/installing - merges existing filters', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps.structure');

  await helpers
    .create(StructureWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'new.ui.apps.structure',
        name: 'Test Module - Apps Structure',
        appIds: ['new', 'other'],
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: cloudSdkApiMetadata,
        aemVersion: '6.5',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(fullPath, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.apps.structure<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'new.ui.apps.structure', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - Apps Structure', 'Name set.');

      result.assertFileContent('pom.xml', /<filter><root>\/apps\/new<\/root><\/filter>/);
      result.assertFileContent('pom.xml', /<filter><root>\/apps\/other<\/root><\/filter>/);
      result.assertFileContent('pom.xml', /<filter><root>\/apps\/test<\/root><\/filter>/);
      result.assertFileContent('pom.xml', /<filter><root>\/content\/dam\/new<\/root><\/filter>/);
      result.assertFileContent('pom.xml', /<filter><root>\/content\/dam\/other<\/root><\/filter>/);
      result.assertFileContent('pom.xml', /<filter><root>\/content\/dam\/test<\/root><\/filter>/);
      result.assertFile(path.join('target', 'new.ui.apps.structure-1.0.0-SNAPSHOT.zip'));
    });
});
