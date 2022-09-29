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

import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import ContentPackageGenerator from '../../../generators/package-content/index.js';
import PomUtils, { filevaultPlugin } from '../../../lib/pom-utils.js';
import { init, prompt, config, wrapDefault, writeInstall } from '../../fixtures/generators/wrappers.js';
import { generatorPath, fixturePath, addModulesToPom, cloudSdkApiMetadata } from '../../fixtures/helpers.js';
import { generatorName as bundleGeneratorName } from '../../../generators/bundle/index.js';
import { generatorName as appsGeneratorName } from '../../../generators/package-apps/index.js';

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
      t.true(await prompt.when(), 'Prompts.');
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
        addModulesToPom(temporaryDir, ['ui.apps.structure']);
        fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
        fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-config': {} }));
      })
      .run()
  );
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
        examples: false,
        templates: false,
        language: 'en',
        country: 'us',
        enableDynamicMedia: false,
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
      addModulesToPom(temporaryDir, ['ui.apps.structure']);

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-config': { artifactId: 'test.ui.apps.structure' } }));
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
      const wcm = path.join(root, 'conf', 'test', 'settings', 'wcm');

      result.assertFile(path.join(root, 'conf', 'test', '_sling_configs', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'cloudconfigs', '.content.xml'));
      result.assertFile(path.join(root, 'conf', 'test', 'settings', 'dam', '.content.xml'));
      result.assertFile(path.join(wcm, '.content.xml'));
      result.assertFile(path.join(wcm, 'policies', '.content.xml'));
      result.assertFile(path.join(wcm, 'segments', '.content.xml'));
      result.assertFile(path.join(wcm, 'template-types', '.content.xml'));
      result.assertFile(path.join(wcm, 'templates', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'test', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'dam', 'test', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'experience-fragments', 'test', '.content.xml'));
      result.assertFile(path.join('src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));

      result.assertFile(path.join('target', 'test.ui.content-1.0.0-SNAPSHOT.zip'));
    });
});

test('writing/installing - cloud - templates, no examples', async () => {
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
        templates: true,
        examples: false,
        singleCountry: true,
        language: 'en',
        country: 'us',
        enableDynamicMedia: false,
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
      addModulesToPom(temporaryDir, ['ui.apps.structure']);

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } }));
    })
    .run()
    .then((result) => {
      const root = result.generator.destinationPath('src', 'main', 'content', 'jcr_root');
      const wcm = path.join(root, 'conf', 'test', 'settings', 'wcm');

      result.assertFile(path.join(wcm, 'template-types', 'page', '.content.xml'));
      result.assertFile(path.join(wcm, 'template-types', 'xf', '.content.xml'));

      result.assertFile(path.join(wcm, 'templates', 'page-content', '.content.xml'));
      result.assertFile(path.join(wcm, 'templates', 'xf-web-variation', '.content.xml'));

      result.assertFileContent(path.join(wcm, 'policies', 'test', 'components', 'image', 'content', '.content.xml'), /enableAssetDelivery="true"/);

      result.assertFile(path.join('target', 'test.ui.content-1.0.0-SNAPSHOT.zip'));
    });
});

test('writing/installing - v6.5 - single site', async () => {
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
        templates: true,
        examples: true,
        singleCountry: true,
        language: 'pt',
        country: 'br',
        enableDynamicMedia: true,
      },
      parentProps: {
        name: 'Test Project',
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: cloudSdkApiMetadata,
        aemVersion: 'cloud',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      addModulesToPom(temporaryDir, ['ui.apps.structure']);

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } }));
    })
    .run()
    .then((result) => {
      const country = new Intl.DisplayNames(['pt'], { type: 'region' }).of('BR');
      const language = new Intl.DisplayNames(['pt'], { type: 'language' }).of('pt');

      const root = result.generator.destinationPath('src', 'main', 'content', 'jcr_root');
      const wcm = path.join(root, 'conf', 'test', 'settings', 'wcm');

      result.assertNoFile(path.join(root, 'content', 'test', 'language-masters', '.content.xml'));

      result.assertFileContent(path.join(wcm, 'templates', 'page-content', 'structure', '.content.xml'), /fragmentVariationPath="\/content\/experience-fragments\/test\/br\/pt\/site\/header\/master"/);
      result.assertFileContent(path.join(wcm, 'templates', 'page-content', 'structure', '.content.xml'), /fragmentVariationPath="\/content\/experience-fragments\/test\/br\/pt\/site\/footer\/master"/);

      result.assertNoFileContent(path.join(root, 'content', 'test', '.content.xml'), /<langauge-masters \/>/);
      result.assertFileContent(path.join(root, 'content', 'test', '.content.xml'), /<br \/>/);

      result.assertFileContent(path.join(root, 'content', 'test', 'br', '.content.xml'), new RegExp(`jcr:title="${country}"`));
      result.assertFileContent(path.join(root, 'content', 'test', 'br', 'pt', '.content.xml'), new RegExp(`jcr:title="${language}"`));
      result.assertNoFileContent(path.join(root, 'content', 'test', 'br', 'pt', '.content.xml'), /cq:LiveRelationship/);
      result.assertNoFileContent(path.join(root, 'content', 'test', 'br', 'pt', '.content.xml'), /cq:LiveSyncConfig/);

      result.assertNoFileContent(path.join(root, 'content', 'experience-fragments', 'test', '.content.xml'), /<langauge-masters \/>/);
      result.assertFileContent(path.join(root, 'content', 'experience-fragments', 'test', '.content.xml'), /<br \/>/);
      result.assertFileContent(path.join(root, 'content', 'experience-fragments', 'test', 'br', '.content.xml'), new RegExp(`jcr:title="${country}"`));
      result.assertFileContent(path.join(root, 'content', 'experience-fragments', 'test', 'br', 'pt', '.content.xml'), new RegExp(`jcr:title="${language}"`));

      result.assertFile(path.join('target', 'test.ui.content-1.0.0-SNAPSHOT.zip'));
    });
});

test('writing/installing - cloud - multi site', async () => {
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
        templates: true,
        examples: true,
        singleCountry: false,
        language: 'pt',
        country: 'br',
        enableDynamicMedia: true,
        apps: 'test.ui.apps',
      },
      parentProps: {
        name: 'Test Project',
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aem: cloudSdkApiMetadata,
        aemVersion: 'cloud',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      addModulesToPom(temporaryDir, ['ui.apps.structure', 'ui.apps']);

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } }));

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps'));
      fs.cpSync(fixturePath('projects', 'cloud', 'ui.apps'), path.join(temporaryDir, 'ui.apps'), { recursive: true });

      const pomFile = path.join(temporaryDir, 'ui.apps', 'pom.xml');
      const parsedPom = new XMLParser(PomUtils.xmlOptions).parse(fs.readFileSync(pomFile));
      const deps = PomUtils.findPomNodeArray(parsedPom, 'project', 'dependencies');
      /* eslint-disable no-template-curly-in-string */

      PomUtils.addDependencies(deps, [
        {
          dependency: [
            { groupId: [{ '#text': '${project.groupId}' }] },
            { artifactId: [{ '#text': 'test.ui.apps.structure' }] },
            { version: [{ '#text': '${project.version}' }] },
            { type: [{ '#text': 'zip' }] },
          ],
        },
      ]);
      /* eslint-enable no-template-curly-in-string */

      // Filevault Plugin Logic
      const plugins = PomUtils.findPomNodeArray(parsedPom, 'project', 'build', 'plugins');
      const fvPlugin = _.find(plugins, (plugin) => {
        if (!plugin.plugin) {
          return false;
        }

        return _.find(plugin.plugin, (def) => {
          return def.artifactId && def.artifactId[0]['#text'] === filevaultPlugin;
        });
      }).plugin;
      const fvPluginConfig = PomUtils.findPomNodeArray(fvPlugin, 'configuration');
      /* eslint-disable no-template-curly-in-string */
      fvPluginConfig.push({
        repositoryStructurePackages: [
          {
            repositoryStructurePackage: [{ groupId: [{ '#text': '${project.groupId}' }] }, { artifactId: [{ '#text': 'test.ui.apps.structure' }] }],
          },
        ],
      });
      /* eslint-enable no-template-curly-in-string */

      fs.writeFileSync(pomFile, PomUtils.fixXml(new XMLBuilder(PomUtils.xmlOptions).build(parsedPom)));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-apps': { artifactId: 'test.ui.apps' } }));
    })
    .run()
    .then((result) => {
      const country = new Intl.DisplayNames(['pt'], { type: 'region' }).of('BR');
      const language = new Intl.DisplayNames(['pt'], { type: 'language' }).of('pt');

      const root = result.generator.destinationPath('src', 'main', 'content', 'jcr_root');
      const wcm = path.join(root, 'conf', 'test', 'settings', 'wcm');

      result.assertFile(path.join(root, 'content', 'test', 'language-masters', '.content.xml'));
      result.assertFile(path.join(root, 'content', 'test', 'language-masters', 'pt', '.content.xml'));

      result.assertFileContent(
        path.join(wcm, 'templates', 'page-content', 'structure', '.content.xml'),
        /fragmentVariationPath="\/content\/experience-fragments\/test\/language-masters\/pt\/site\/header\/master"/
      );
      result.assertFileContent(
        path.join(wcm, 'templates', 'page-content', 'structure', '.content.xml'),
        /fragmentVariationPath="\/content\/experience-fragments\/test\/language-masters\/pt\/site\/footer\/master"/
      );

      result.assertFileContent(path.join(root, 'content', 'test', 'br', '.content.xml'), new RegExp(`jcr:title="${country}"`));
      result.assertFileContent(path.join(root, 'content', 'test', 'br', 'pt', '.content.xml'), new RegExp(`jcr:title="${language}"`));

      result.assertFileContent(path.join(root, 'content', 'test', 'br', 'pt', '.content.xml'), /cq:LiveRelationship/);

      result.assertFileContent(path.join(root, 'content', 'test', 'br', 'pt', '.content.xml'), /cq:LiveSyncConfig/);

      const appDir = path.join(path.dirname(result.generator.destinationPath()), 'ui.apps');
      result.assertFile(path.join(appDir, 'src', 'main', 'content', 'jcr_root', 'apps', 'msm', 'test_blueprint', '.content.xml'));
      result.assertFileContent(path.join(appDir, 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'), /<filter root="\/apps\/msm\/test_blueprint" mode="merge"\/>/);

      result.assertFile(path.join('target', 'test.ui.content-1.0.0-SNAPSHOT.zip'));
    });
});
