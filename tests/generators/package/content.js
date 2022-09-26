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
import sinon from 'sinon/pkg/sinon-esm.js';

import { XMLParser } from 'fast-xml-parser';

import ContentPackageGenerator from '../../../generators/package-content/index.js';
import { init, prompt, config, wrapDefault, writeInstall } from '../../fixtures/generators/wrappers.js';
import { generatorPath, fixturePath, addModulesToPom, cloudSdkApiMetadata, aem65ApiMetadata } from '../../fixtures/helpers.js';
import { generatorName as bundleGeneratorName } from '../../../generators/bundle/index.js';
import { generatorName as appsGeneratorName } from '../../../generators/package-apps/index.js';
import { generatorName as configGeneratorName } from '../../../generators/package-config/index.js';

const resolved = generatorPath('package-content', 'index.js');
const ContentInit = init(ContentPackageGenerator, resolved);
const ContentPrompt = prompt(ContentPackageGenerator, resolved);
const ContentConfig = config(ContentPackageGenerator, resolved);
const ContentDefault = wrapDefault(ContentPackageGenerator, resolved);
const ContentWriteInstall = writeInstall(ContentPackageGenerator, resolved);

test('initializing - no options', async (t) => {
  t.plan(1);
  await helpers
    .create(ContentInit)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, {}, 'Properties set.');
    });
});

test('initializing - defaults', async (t) => {
  t.plan(1);
  await helpers
    .create(ContentInit)
    .withOptions({ defaults: true })
    .run()
    .then((result) => {
      const expected = {
        templates: true,
        singleCountry: true,
        language: 'en',
      };

      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('initializing - options', async (t) => {
  t.plan(1);

  await helpers
    .create(ContentInit)
    .withOptions({
      templates: false,
      bundleRef: 'core',
      appsRef: 'ui.apps',
      singleCountry: false,
      language: 'pt',
      country: 'br',
    })
    .run()
    .then((result) => {
      const expected = {
        templates: false,
        bundle: 'core',
        apps: 'ui.apps',
        singleCountry: false,
        language: 'pt',
        country: 'br',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test.serial('initializing - lookups & sets modules ', async (t) => {
  t.plan(3);

  const bundles = [{ path: 'core', artifactId: 'test.core' }];
  const apps = [{ path: 'ui.apps', artifactId: 'test.ui.apps' }];
  sinon.restore();
  const stub = sinon.stub(ContentInit.prototype, '_findModules');
  stub.withArgs(bundleGeneratorName).returns(bundles);
  stub.withArgs(appsGeneratorName).returns(apps);

  await helpers
    .create(ContentInit)
    .run()
    .then((result) => {
      stub.restore();
      t.deepEqual(result.generator.availableBundles, bundles, 'Set bundle list.');
      t.deepEqual(result.generator.availableApps, apps, 'Set apps list.');
      t.deepEqual(result.generator.props, { bundle: 'test.core', apps: 'test.ui.apps' }, 'Set references.');
    });
});

test.serial('initializing - lookups & but does not set modules > 1 ', async (t) => {
  t.plan(3);

  const bundles = [
    { path: 'core', artifactId: 'test.core' },
    { path: 'core', artifactId: 'test.bundle' },
  ];
  const apps = [
    { path: 'ui.apps', artifactId: 'test.ui.apps' },
    { path: 'ui.apps', artifactId: 'test.ui.apps.other' },
  ];
  sinon.restore();
  const stub = sinon.stub(ContentInit.prototype, '_findModules');
  stub.withArgs(bundleGeneratorName).returns(bundles);
  stub.withArgs(appsGeneratorName).returns(apps);

  await helpers
    .create(ContentInit)
    .run()
    .then((result) => {
      stub.restore();
      t.deepEqual(result.generator.availableBundles, bundles, 'Set bundle list.');
      t.deepEqual(result.generator.availableApps, apps, 'Set apps list.');
      t.deepEqual(result.generator.props, {}, 'Does not set references.');
    });
});

test('prompting - templates', async (t) => {
  t.plan(4);

  await helpers
    .create(ContentPrompt)
    .withOptions({
      props: {
        bundle: 'prompted',
        apps: 'prompted',
      },
    })
    .run()
    .then(async (result) => {
      delete result.generator.props.templates;
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'templates' });
      t.true(prompt.default, 'Default is set.');
      t.true(await prompt.when(), 'Prompts.');

      result.generator.options.defaults = true;
      t.false(await prompt.when(), 'Does not prompt.');

      result.generator.props.templates = true;
      delete result.generator.options.defaults;
      t.false(await prompt.when(), 'Does not prompt.');
    });
});

test('prompting - bundleRef', async (t) => {
  t.plan(3);

  await helpers
    .create(ContentPrompt)
    .withOptions({
      props: {
        bundle: 'prompted',
        apps: 'prompted',
      },
    })
    .run()
    .then(async (result) => {
      delete result.generator.props.bundle;
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'bundleRef' });
      t.true(await prompt.when(), 'Prompts.');

      result.generator.props.bundle = 'test.core';
      t.false(await prompt.when(), 'Does not prompt.');

      // Choices
      result.generator.availableBundles = [
        { path: 'core', artifactId: 'test.core' },
        { path: 'bundle', artifactId: 'test.bundle' },
      ];

      t.deepEqual(await prompt.choices(), ['test.core', 'test.bundle'], 'List matches.');
    });
});

test('prompting - appsRef', async (t) => {
  t.plan(3);

  await helpers
    .create(ContentPrompt)
    .withOptions({
      props: {
        bundle: 'prompted',
        apps: 'prompted',
      },
    })
    .run()
    .then(async (result) => {
      delete result.generator.props.apps;
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'appsRef' });
      t.true(await prompt.when(), 'Prompts.');

      result.generator.props.apps = 'test.ui.apps';
      t.false(await prompt.when(), 'Does not prompt.');

      // Choices
      result.generator.availableBundles = [
        { path: 'ui.apps', artifactId: 'test.ui.apps' },
        { path: 'other.apps', artifactId: 'test.other.apps' },
      ];

      t.deepEqual(await prompt.choices(), ['test.ui.apps', 'test.other.apps'], 'List matches.');
    });
});

test('prompting - singleCountry', async (t) => {
  t.plan(4);

  await helpers
    .create(ContentPrompt)
    .withOptions({
      props: {
        bundle: 'prompted',
        apps: 'prompted',
      },
    })
    .run()
    .then(async (result) => {
      delete result.generator.props.singleCountry;
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'singleCountry' });
      t.true(prompt.default, 'Default is set.');
      t.true(await prompt.when(), 'Prompts.');

      result.generator.options.defaults = true;
      t.false(await prompt.when(), 'Does not prompt.');

      result.generator.props.singleCountry = true;
      delete result.generator.options.defaults;
      t.false(await prompt.when(), 'Does not prompt.');
    });
});

test('prompting - language', async (t) => {
  t.plan(4);

  await helpers
    .create(ContentPrompt)
    .withOptions({
      props: {
        bundle: 'prompted',
        apps: 'prompted',
      },
    })
    .run()
    .then(async (result) => {
      delete result.generator.props.language;
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'language' });
      t.is(prompt.default, 'en', 'Default is set.');
      t.true(await prompt.when(), 'Prompts.');

      result.generator.props.language = 'pt';
      t.false(await prompt.when(), 'Does not prompt.');

      result.generator.options.defaults = true;
      delete result.generator.props.language;
      t.false(await prompt.when(), 'Does not prompt.');
    });
});

test('prompting - country', async (t) => {
  t.plan(4);

  await helpers
    .create(ContentPrompt)
    .withOptions({
      props: {
        bundle: 'prompted',
        apps: 'prompted',
      },
    })
    .run()
    .then(async (result) => {
      delete result.generator.props.singleCountry;
      delete result.generator.props.country;

      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'country' });
      t.is(prompt.default, 'us', 'Default is set.');
      t.true(await prompt.when(), 'Prompts.');

      result.generator.props.country = 'br';
      t.false(await prompt.when(), 'Does not prompt.');

      result.generator.props.singleCountry = true;
      delete result.generator.props.country;
      t.false(await prompt.when(), 'Does not prompt.');
    });
});

test('prompting - post-processing', async (t) => {
  t.plan(1);
  await helpers
    .create(ContentPrompt)
    .withPrompts({
      templates: false,
      bundleRef: 'prompted',
      appsRef: 'prompted',
      singleCountry: false,
      language: 'es',
      country: 'mx',
    })
    .run()
    .then((result) => {
      const expected = {
        templates: false,
        bundle: 'prompted',
        apps: 'prompted',
        singleCountry: false,
        language: 'es',
        country: 'mx',
      };
      t.deepEqual(result.generator.props, expected, 'Properties correct.');
    });
});

test('configuring', async (t) => {
  t.plan(1);

  const expected = { config: 'to be saved' };
  await helpers
    .create(ContentConfig)
    .withOptions({ props: expected })
    .run()
    .then((result) => {
      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc, { '@adobe/generator-aem:package-content': expected }, 'Config saved.');
    });
});

test('default - no templates', async (t) => {
  t.plan(1);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.content');

  await t.notThrowsAsync(
    helpers
      .create(ContentDefault)
      .withOptions({ props: { templates: false } })
      .inDir(fullPath, () => {
        fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
        addModulesToPom(temporaryDir, ['ui.config']);
        fs.mkdirSync(path.join(temporaryDir, 'ui.config'));
        fs.writeFileSync(path.join(temporaryDir, 'ui.config', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-config': {} }));
      })
      .run()
  );
});

test('default - examples fails on no bundle module', async (t) => {
  t.fail('Not Implemented');
});

test('default - templates fails on no apps module', async (t) => {
  t.plan(2);

  const error = await t.throwsAsync(
    helpers
      .create(ContentDefault)
      .withOptions({ props: { templates: true } })
      .run()
  );
  t.regex(error.message, /Unable to create Content Package, Apps Package module not specified\./, 'Error thrown.');
});

test('default - fails on no config module', async (t) => {
  t.plan(2);
  const error = await t.throwsAsync(helpers.create(ContentDefault).withOptions({ props: {} }).run());
  t.regex(error.message, /Unable to create Content Package, no Config Module found\./, 'Error thrown.');
});

test('default - templates fails on no core components', async (t) => {
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.content');

  const error = await t.throwsAsync(
    helpers
      .create(ContentDefault)
      .withOptions({ props: { apps: 'ui.apps', templates: true } })
      .inDir(fullPath, () => {
        fs.writeFileSync(path.join(temporaryDir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));
      })
      .run()
  );
  t.regex(error.message, /Unable to create Content Package, Core Components Mixin not found\./, 'Error thrown.');
});

test('default - templates fails on apps module no core components ', async (t) => {
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.content');

  const error = await t.throwsAsync(
    helpers
      .create(ContentDefault)
      .withOptions({ props: { apps: 'ui.apps', templates: true } })
      .inDir(fullPath, () => {
        fs.writeFileSync(path.join(temporaryDir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:mixin-cc': { apps: ['notfound'] } }));
      })
      .run()
  );
  t.regex(error.message, /Unable to create Content Package, Core Components Mixin not configured for Apps Module\./, 'Error thrown.');
});

test('writing/installing - cloud - no examples', async (t) => {
  t.plan(5);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.content');
  await helpers
    .create(ContentWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.content',
        name: 'Test Module - Content Package',
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
      addModulesToPom(temporaryDir, ['ui.config']);

      fs.mkdirSync(path.join(temporaryDir, 'ui.config'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.config', 'pom.xml'), path.join(temporaryDir, 'ui.config', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.config', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-config': { artifactId: 'test.ui.config' } }));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.content<\/module>/);
      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), { encoding: 'utf8' });
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.content', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - Content Package', 'Name set.');

      const root = result.generator.destinationPath('src', 'main', 'content', 'jcr_root');
      result.assertFile(path.join(root, 'conf', 'test', '_sling_configs', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'cloudconfigs', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'dam', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', 'policies', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', 'segments', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', 'template-types', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', 'templates', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'test', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'dam', 'test', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'experience-fragments', 'test', '.content.xml'));
      result.assertFile(path.join('src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));

      result.assertFile(path.join('target', 'test.ui.content-1.0.0-SNAPSHOT.zip'));
    });
});


test('writing/installing - cloud - templates, no examples', async (t) => {
  t.plan(5);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.content');
  await helpers
    .create(ContentWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.content',
        name: 'Test Module - Content Package',
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
      addModulesToPom(temporaryDir, ['ui.config']);

      fs.mkdirSync(path.join(temporaryDir, 'ui.config'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.config', 'pom.xml'), path.join(temporaryDir, 'ui.config', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.config', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-config': { artifactId: 'test.ui.config' } }));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.content<\/module>/);
      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), { encoding: 'utf8' });
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.content', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Module - Content Package', 'Name set.');

      const root = result.generator.destinationPath('src', 'main', 'content', 'jcr_root');
      result.assertFile(path.join(root, 'conf', 'test', '_sling_configs', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'cloudconfigs', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'dam', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', 'policies', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', 'segments', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', 'template-types', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'wcm', 'templates', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'test', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'dam', 'test', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'experience-fragments', 'test', '.content.xml'));
      result.assertFile(path.join('src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));

      result.assertFile(path.join('target', 'test.ui.content-1.0.0-SNAPSHOT.zip'));
    });
});

test('writing/installing - v6.5 - single site', async (t) => {
  t.plan(5);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.content');
  await helpers
    .create(ContentWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        artifactId: 'test.ui.content',
        name: 'Test Module - Content Package',
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
      addModulesToPom(temporaryDir, ['ui.config']);

      fs.mkdirSync(path.join(temporaryDir, 'ui.config'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.config', 'pom.xml'), path.join(temporaryDir, 'ui.config', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.config', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-config': { artifactId: 'test.ui.config' } }));
    })
    .run()
    .then((result) => {
    });
});

test('writing/installing - cloud - multi site', async (t) => {
  t.fail('Not Implemented');
  // TODO: Test for adding MSM folder to ui.apps module.
});

// Test.serial('via @adobe/generator-aem - v6.5 - no references', async (t) => {
//   t.plan(5);
//   // I think this test is to fail package creation if no apps or no config project found.
//   sinon.restore();
//   const stub = sinon.stub().resolves(aem65ApiMetadata);
//   sinon.replace(ParentPomGenerator.prototype, '_latestRelease', stub);
//
//   await helpers
//     .create(generatorPath('app'))
//     .withGenerators([[ContentPackageGenerator, '@adobe/aem:package-content', generatorPath('package-content', 'index.js')]])
//     .withOptions({
//       defaults: true,
//       examples: true,
//       appId: 'test',
//       name: 'Test Project',
//       groupId: 'com.adobe.test',
//       aemVersion: '6.5',
//       modules: 'package-content',
//       showBuildOutput: false,
//     })
//     .run()
//     .then((result) => {
//       sinon.restore();
//       const properties = result.generator.props;
//       const outputRoot = result.generator.destinationPath();
//       const moduleDir = path.join(outputRoot, 'ui.content');
//       result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>ui\.content<\/module>/);
//
//       const pom = path.join(moduleDir, 'pom.xml');
//       result.assertFile(pom);
//       const pomString = fs.readFileSync(pom, { encoding: 'utf8' });
//       const parser = new XMLParser({
//         ignoreAttributes: true,
//         ignoreDeclaration: true,
//       });
//
//       const pomData = parser.parse(pomString);
//       t.is(pomData.project.parent.groupId, properties.groupId, 'Parent groupId set.');
//       t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
//       t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
//       t.is(pomData.project.artifactId, 'test.ui.content', 'ArtifactId set.');
//       t.is(pomData.project.name, 'Test Project - UI Content Package', 'Name set.');
//
//       const confPath = path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'conf', 'test');
//       const contentPath = path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'content', 'test');
//       const damPath = path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'content', 'dam', 'test');
//       const xfPath = path.join(moduleDir, 'src', 'main', 'content', 'jcr_root', 'content', 'experience-fragments', 'test');
//
//       const filter = path.join(moduleDir, 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml');
//       result.assertFileContent(filter, /\/conf\/test/);
//       result.assertFileContent(filter, /\/content\/test/);
//       result.assertFileContent(filter, /\/content\/dam\/test/);
//       result.assertFileContent(filter, /\/content\/experience-fragments\/test/);
//       result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.ui.content-${properties.version}.zip`));
//     });
// });
//
// test('no apps module - errors', async (t) => {
//   t.plan(2);
//
//   const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
//   const fullPath = path.join(temporaryDir, 'test');
//
//   const error = await t.throwsAsync(
//     helpers
//       .create(generatorPath('package-content'))
//       .withOptions({
//         generateInto: 'ui.content',
//         name: 'Test Content',
//         appId: 'test',
//       })
//       .inDir(fullPath, (temporary) => {
//         fs.cpSync(fixturePath('projects', 'cloud'), temporary, { recursive: true });
//         // Delete additional things to reduce context
//         const data = JSON.parse(fs.readFileSync(path.join(temporary, '.yo-rc.json')));
//         delete data['@adobe/generator-aem'].all;
//         delete data['@adobe/generator-aem'].core;
//         delete data['@adobe/generator-aem']['ui.apps'];
//         delete data['@adobe/generator-aem']['ui.config'];
//         delete data['@adobe/generator-aem']['ui.apps.structure'];
//         delete data['@adobe/generator-aem']['it.tests'];
//         delete data['@adobe/generator-aem']['ui.frontend'];
//         delete data['@adobe/generator-aem'].dispatcher;
//         fs.writeFileSync(path.join(temporary, '.yo-rc.json'), JSON.stringify(data, null, 2));
//       })
//       .run()
//   );
//
//   t.regex(error.message, /Unable to create Content Package, no Apps Module found\./);
// });
//
// test('no config module - errors', async (t) => {
//   t.plan(2);
//
//   const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
//   const fullPath = path.join(temporaryDir, 'test');
//
//   const error = await t.throwsAsync(
//     helpers
//       .create(generatorPath('package-content'))
//       .withOptions({
//         generateInto: 'ui.content',
//         name: 'Test Content',
//         appId: 'test',
//       })
//       .withPrompts({ appsRef: 'ui.apps' })
//       .inDir(fullPath, (temporary) => {
//         fs.cpSync(fixturePath('projects', 'cloud'), temporary, { recursive: true });
//         // Delete additional things to reduce context
//         const data = JSON.parse(fs.readFileSync(path.join(temporary, '.yo-rc.json')));
//         delete data['@adobe/generator-aem'].all;
//         delete data['@adobe/generator-aem'].core;
//         delete data['@adobe/generator-aem']['ui.config'];
//         delete data['@adobe/generator-aem']['ui.apps.structure'];
//         delete data['@adobe/generator-aem']['it.tests'];
//         delete data['@adobe/generator-aem']['ui.frontend'];
//         delete data['@adobe/generator-aem'].dispatcher;
//         fs.writeFileSync(path.join(temporary, '.yo-rc.json'), JSON.stringify(data, null, 2));
//       })
//       .run()
//   );
//
//   t.regex(error.message, /Unable to create Content Package, no Config Module found\./);
// });
