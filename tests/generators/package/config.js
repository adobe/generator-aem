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

import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import ConfigPackageGenerator from '../../../generators/package-config/index.js';
import { Config, WriteInstall } from '../../fixtures/generators/wrappers.js';
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata, addModulesToPom } from '../../fixtures/helpers.js';

const resolved = generatorPath('package-config', 'index.js');
const ConfigConfig = Config(ConfigPackageGenerator, resolved);
const ConfigWriteInstall = WriteInstall(ConfigPackageGenerator, resolved);

test('configuring', async (t) => {
  t.plan(1);

  const expected = { config: 'to be saved' };
  await helpers
    .create(ConfigConfig)
    .withOptions({ props: expected })
    .run()
    .then((result) => {
      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc, { '@adobe/generator-aem:package-config': expected }, 'Config saved.');
    });
});

test('writing/installing - one content package', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.config');

  await helpers
    .create(ConfigWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.config',
        name: 'Test Module - Apps Config Package',
        appId: 'config',
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
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'ui.apps' }] }, { module: [{ '#text': 'ui.content' }] }, { module: [{ '#text': 'ui.apps.structure' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault'), { recursive: true });
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps', 'pom.xml'), path.join(temporaryDir, 'ui.apps', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-apps': { appId: 'test' } }));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
        path.join(temporaryDir, 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml')
      );

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({
        '@adobe/generator-aem:package-structure': {
          appId: 'test',
          artifactId: 'test.ui.apps.structure'
        }
      }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault'), { recursive: true });
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.content', 'pom.xml'), path.join(temporaryDir, 'ui.content', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.content', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-content': { appId: 'test' } }));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
        path.join(temporaryDir, 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml')
      );

    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.config<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.config', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - Apps Config Package', 'Name set.');

      const osgiDir = path.join('src', 'main', 'content', 'jcr_root', 'apps', 'config', 'osgiconfig');
      result.assertFile(path.join(osgiDir, 'config.publish', 'org.apache.sling.jcr.resource.internal.JcrResourceResolverFactoryImpl.cfg.json'));
      result.assertFileContent(path.join(osgiDir, 'config.publish', 'org.apache.sling.jcr.resource.internal.JcrResourceResolverFactoryImpl.cfg.json'), /"\/content\/test\/<\/"/);
      result.assertFileContent(path.join(osgiDir, 'config.publish', 'org.apache.sling.jcr.resource.internal.JcrResourceResolverFactoryImpl.cfg.json'), /"\/:\/"/);

      result.assertFileContent(path.join('src', 'main', 'content', 'jcr_root', 'apps', 'test', 'osgiconfig', 'config', 'org.apache.sling.jcr.repoinit.RepositoryInitializer~test.cfg.json'), /\/content\/dam\/test/);
      result.assertFileContent(path.join('src', 'main', 'content', 'jcr_root', 'apps', 'test', 'osgiconfig', 'config.author', 'com.adobe.granite.cors.impl.CORSPolicyImpl~test.cfg.json'), /\/\(content\|conf\)\/test/);
    });
});

test('writing/installing - multiple content packages', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.config');

  await helpers
    .create(ConfigWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.config',
        name: 'Test Module - Apps Config Package',
        appId: 'other',
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
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'ui.apps' }] }, { module: [{ '#text': 'ui.content' }] }, { module: [{ '#text': 'ui.content.other' }] }, { module: [{ '#text': 'ui.apps.structure' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault'), { recursive: true });
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps', 'pom.xml'), path.join(temporaryDir, 'ui.apps', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-apps': { appId: 'test' } }));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
        path.join(temporaryDir, 'ui.apps', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml')
      );

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({
        '@adobe/generator-aem:package-structure': {
          appId: 'test',
          artifactId: 'test.ui.apps.structure'
        }
      }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault'), { recursive: true });
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.content', 'pom.xml'), path.join(temporaryDir, 'ui.content', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.content', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-content': { appId: 'test' } }));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
        path.join(temporaryDir, 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml')
      );

      fs.mkdirSync(path.join(temporaryDir, 'ui.content.other', 'src', 'main', 'content', 'META-INF', 'vault'), { recursive: true });
      const options = {
        ignoreAttributes: false,
        ignoreDeclaration: false,
      };
      const pom = new XMLParser(options).parse(fs.readFileSync(path.join(temporaryDir, 'ui.content', 'pom.xml'), { encoding: 'utf8' }));
      pom.project.artifactId = 'test.ui.content.other';
      fs.writeFileSync(path.join(temporaryDir, 'ui.content.other', 'pom.xml'), new XMLBuilder(options).build(pom));
      fs.writeFileSync(path.join(temporaryDir, 'ui.content.other', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-content': { appId: 'other' } }));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.content', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
        path.join(temporaryDir, 'ui.content.other', 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml')
      );

    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.config<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.config', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - Apps Config Package', 'Name set.');

      const osgiDir = path.join('src', 'main', 'content', 'jcr_root', 'apps', 'other', 'osgiconfig');
      result.assertFile(path.join(osgiDir, 'config.publish', 'org.apache.sling.jcr.resource.internal.JcrResourceResolverFactoryImpl.cfg.json'));
      result.assertFileContent(path.join(osgiDir, 'config.publish', 'org.apache.sling.jcr.resource.internal.JcrResourceResolverFactoryImpl.cfg.json'), /"\/content\/test\/<\/"/);
      result.assertFileContent(path.join(osgiDir, 'config.publish', 'org.apache.sling.jcr.resource.internal.JcrResourceResolverFactoryImpl.cfg.json'), /"\/content\/other\/<\/"/);
      result.assertFileContent(path.join(osgiDir, 'config.publish', 'org.apache.sling.jcr.resource.internal.JcrResourceResolverFactoryImpl.cfg.json'), /"\/:\/"/);

      result.assertFileContent(path.join('src', 'main', 'content', 'jcr_root', 'apps', 'test', 'osgiconfig', 'config', 'org.apache.sling.jcr.repoinit.RepositoryInitializer~test.cfg.json'), /\/content\/dam\/test/);
      result.assertFileContent(path.join('src', 'main', 'content', 'jcr_root', 'apps', 'test', 'osgiconfig', 'config.author', 'com.adobe.granite.cors.impl.CORSPolicyImpl~test.cfg.json'), /\/\(content\|conf\)\/test/);
      result.assertFileContent(path.join('src', 'main', 'content', 'jcr_root', 'apps', 'other', 'osgiconfig', 'config', 'org.apache.sling.jcr.repoinit.RepositoryInitializer~other.cfg.json'), /\/content\/dam\/other/);
      result.assertFileContent(path.join('src', 'main', 'content', 'jcr_root', 'apps', 'other', 'osgiconfig', 'config.author', 'com.adobe.granite.cors.impl.CORSPolicyImpl~other.cfg.json'), /\/\(content\|conf\)\/other/);

    });
});

test('writing/installing - one bundle', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.config');

  await helpers
    .create(ConfigWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.config',
        name: 'Test Module - Apps Config Package',
        appId: 'config',
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
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'core' }] }, { module: [{ '#text': 'ui.apps.structure' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'core', 'pom.xml'), path.join(temporaryDir, 'core', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'core', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': { appId: 'test', package: 'com.adobe.test' } }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({
        '@adobe/generator-aem:package-structure': {
          appId: 'test',
          artifactId: 'test.ui.apps.structure'
        }
      }));

    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.config<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.config', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - Apps Config Package', 'Name set.');

      const osgiDir = path.join('src', 'main', 'content', 'jcr_root', 'apps');
      result.assertFileContent(path.join(osgiDir, 'test', 'osgiconfig', 'config', 'org.apache.sling.commons.log.LogManager.factory.config~test.cfg.json'), /"org.apache.sling.commons.log.names": "\[com.adobe.test]",/);
      result.assertFileContent(path.join(osgiDir, 'test', 'osgiconfig', 'config.stage', 'org.apache.sling.commons.log.LogManager.factory.config~test.cfg.json'), /"org.apache.sling.commons.log.names": "\[com.adobe.test]",/);
      result.assertFileContent(path.join(osgiDir, 'test', 'osgiconfig', 'config.prod', 'org.apache.sling.commons.log.LogManager.factory.config~test.cfg.json'), /"org.apache.sling.commons.log.names": "\[com.adobe.test]",/);
    });
});

test('writing/installing - multiple bundles', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.config');

  await helpers
    .create(ConfigWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.config',
        name: 'Test Module - Apps Config Package',
        appId: 'config',
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
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'core' }] }, { module: [{ '#text': 'core.other' }] }, { module: [{ '#text': 'ui.apps.structure' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'core', 'pom.xml'), path.join(temporaryDir, 'core', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'core', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': { appId: 'test', package: 'com.adobe.test' } }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({
        '@adobe/generator-aem:package-structure': {
          appId: 'test',
          artifactId: 'test.ui.apps.structure'
        }
      }));

      fs.mkdirSync(path.join(temporaryDir, 'core.other'));
      const options = {
        ignoreAttributes: false,
        ignoreDeclaration: false,
      };
      const pom = new XMLParser(options).parse(fs.readFileSync(path.join(temporaryDir, 'core', 'pom.xml'), { encoding: 'utf8' }));
      pom.project.artifactId = 'test.core.other';
      fs.writeFileSync(path.join(temporaryDir, 'core.other', 'pom.xml'), new XMLBuilder(options).build(pom));
      fs.writeFileSync(path.join(temporaryDir, 'core.other', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': { appId: 'other', package: 'com.adobe.other' } }));

    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.config<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.config', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - Apps Config Package', 'Name set.');

      const osgiDir = path.join('src', 'main', 'content', 'jcr_root', 'apps');
      result.assertFileContent(path.join(osgiDir, 'test', 'osgiconfig', 'config', 'org.apache.sling.commons.log.LogManager.factory.config~test.cfg.json'), /"org.apache.sling.commons.log.names": "\[com.adobe.test]",/);
      result.assertFileContent(path.join(osgiDir, 'test', 'osgiconfig', 'config.stage', 'org.apache.sling.commons.log.LogManager.factory.config~test.cfg.json'), /"org.apache.sling.commons.log.names": "\[com.adobe.test]",/);
      result.assertFileContent(path.join(osgiDir, 'test', 'osgiconfig', 'config.prod', 'org.apache.sling.commons.log.LogManager.factory.config~test.cfg.json'), /"org.apache.sling.commons.log.names": "\[com.adobe.test]",/);

      result.assertFileContent(path.join(osgiDir, 'other', 'osgiconfig', 'config', 'org.apache.sling.commons.log.LogManager.factory.config~other.cfg.json'), /"org.apache.sling.commons.log.names": "\[com.adobe.other]",/);
      result.assertFileContent(path.join(osgiDir, 'other', 'osgiconfig', 'config.stage', 'org.apache.sling.commons.log.LogManager.factory.config~other.cfg.json'), /"org.apache.sling.commons.log.names": "\[com.adobe.other]",/);
      result.assertFileContent(path.join(osgiDir, 'other', 'osgiconfig', 'config.prod', 'org.apache.sling.commons.log.LogManager.factory.config~other.cfg.json'), /"org.apache.sling.commons.log.names": "\[com.adobe.other]",/);
    });
});
