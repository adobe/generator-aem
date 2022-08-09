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

import AppsPackageGenerator from '../../../generators/package-apps/index.js';
import { Init, Prompt, Config, WriteInstall } from '../../fixtures/generators/wrappers.js';
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata } from '../../fixtures/helpers.js';
import _ from 'lodash';
import PomUtils from '../../../lib/pom-utils.js';

const resolved = generatorPath('package-apps', 'index.js');
const AppsInit = Init(AppsPackageGenerator, resolved);
const AppsPrompt = Prompt(AppsPackageGenerator, resolved);
const AppsWriteInstall = WriteInstall(AppsPackageGenerator, resolved);

test('initialize - no options', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsInit)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, {}, 'Properties set.');
    });
});

test('initialize - options - refs dont exist', async (t) => {
  t.plan(1);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  await helpers
    .create(AppsInit)
    .withOptions({ bundleRef: 'core', frontendRef: 'ui.frontend', precompileScripts: true })
    .inDir(fullPath, () => {
      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.mkdirSync(path.join(temporaryDir, 'ui.frontend'));
      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.writeFileSync(path.join(temporaryDir, 'core', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:frontend-general': {} }));
      fs.writeFileSync(path.join(temporaryDir, 'ui.frontend', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': {} }));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-apps': {} }));
    })
    .run()
    .then((result) => {
      const expected = { bundle: undefined, frontend: undefined, precompileScripts: true };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('initialize - options - refs exist - yorc', async (t) => {
  t.plan(1);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  await helpers
    .create(AppsInit)
    .withOptions({ bundleRef: 'test.core', frontendRef: 'test.ui.frontend', structureRef: 'test.ui.apps.structure', precompileScripts: true })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.mkdirSync(path.join(temporaryDir, 'ui.frontend'));
      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.writeFileSync(
        path.join(temporaryDir, 'core', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:bundle': { artifactId: 'test.core' } })
      );
      fs.writeFileSync(
        path.join(temporaryDir, 'ui.frontend', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:frontend-general': { artifactId: 'test.ui.frontend' } })
      );
      fs.writeFileSync(
        path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } })
      );
      addModulesToPom(temporaryDir, [
        { module: [{ '#text': 'core' }] },
        { module: [{ '#text': 'ui.frontend' }] },
        { module: [{ '#text': 'ui.apps.structure' }] }
      ]);
    })
    .run()
    .then((result) => {
      const expected = {
        bundle: {
          ref: 'core',
          artifactId: 'test.core',
        },
        frontend: {
          ref: 'ui.frontend',
          artifactId: 'test.ui.frontend',
        },
        structure: {
          ref: 'ui.apps.structure',
          artifactId: 'test.ui.apps.structure',
        },
        precompileScripts: true
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('initialize - options - refs exist - poms', async (t) => {
  t.plan(1);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');
  await helpers
    .create(AppsInit)
    .withOptions({ bundleRef: 'test.core', frontendRef: 'test.ui.frontend', structureRef: 'test.ui.apps.structure', precompileScripts: true })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.mkdirSync(path.join(temporaryDir, 'ui.frontend'));
      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'core', 'pom.xml'),
        path.join(temporaryDir, 'core', 'pom.xml')
      );
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.frontend', 'pom.xml'),
        path.join(temporaryDir, 'ui.frontend', 'pom.xml')
      );
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'),
        path.join(temporaryDir, 'ui.apps.structure', 'pom.xml')
      );
      addModulesToPom(temporaryDir, [
        { module: [{ '#text': 'core' }] },
        { module: [{ '#text': 'ui.frontend' }] },
        { module: [{ '#text': 'ui.apps.structure' }] }
      ]);
    })
    .run()
    .then((result) => {
      const expected = {
        bundle: {
          ref: 'core',
          artifactId: 'test.core',
        },
        frontend: {
          ref: 'ui.frontend',
          artifactId: 'test.ui.frontend',
        },
        structure: {
          ref: 'ui.apps.structure',
          artifactId: 'test.ui.apps.structure',
        },
        precompileScripts: true
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('prompting - bundleRef - defaults', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsPrompt)
    .run()
    .then(async (result) => {
      result.generator.options.defaults = true;
      result.generator.props.bundle = { ref: 'core', artifactId: 'test.core' };
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'bundleRef' });
      t.false(await prompt.when(), 'Does not prompt.');
    });
});

test('prompting - bundleRef - defaults - but did not exist', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsPrompt)
    .withOptions({
      defaults: true,
    })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'bundleRef' });
      t.true(await prompt.when(), 'Prompts');
    });
});

test('prompting - bundleRef - choices', async (t) => {
  t.plan(1);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  class Mock extends AppsPrompt {
    prompting() {
      this.availableBundles = [{ ref: 'core', artifactId: 'test.core' }, { ref: 'bundle', artifactId: 'test.bundle' }];
      super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'core' }] }, { module: [{ '#text': 'bundle' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.mkdirSync(path.join(temporaryDir, 'bundle'));
      fs.writeFileSync(
        path.join(temporaryDir, 'core', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:bundle': { artifactId: 'test.core' } })
      );
      fs.writeFileSync(
        path.join(temporaryDir, 'bundle', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:bundle': { artifactId: 'test.bundle' } }));
    })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'bundleRef' });
      t.deepEqual(await prompt.choices(), ['None', 'test.core', 'test.bundle'], 'List matches.');
    });
});

test('prompting - bundleRef - post processing - None', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsPrompt)
    .withOptions({
      defaults: true,
      props: { bundleRef: 'selected' }
    })
    .withPrompts({
      bundleRef: 'None',
    })
    .run()
    .then(async (result) => {
      t.is(result.generator.props.bundleRef, undefined, 'Deletes Bundle Ref');
    });
});

test('prompting - bundleRef - post processing - selected', async (t) => {
  t.plan(2);

  class Mock extends AppsPrompt {
    prompting() {
      this.availableBundles = [{ ref: 'core', artifactId: 'test.core' }, { ref: 'bundle', artifactId: 'test.bundle' }];
      super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({
      defaults: true,
      props: { bundleRef: 'selected' }
    })
    .withPrompts({
      bundleRef: 'test.core',
    })
    .run()
    .then(async (result) => {
      t.is(result.generator.props.bundleRef, undefined, 'Deletes Bundle Ref');
      t.deepEqual(result.generator.props.bundle, { ref: 'core', artifactId: 'test.core' }, 'Sets Bundle');
    });
});

test('prompting - frontendRef - defaults', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsPrompt)
    .run()
    .then(async (result) => {
      result.generator.options.defaults = true;
      result.generator.props.frontend = { ref: 'ui.frontend', artifactId: 'test.ui.frontend' };
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'frontendRef' });
      t.false(await prompt.when(), 'Does not prompt.');
    });
});

test('prompting - frontendRef - defaults - but did not exist', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsPrompt)
    .withOptions({
      defaults: true,
    })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'frontendRef' });
      t.true(await prompt.when(), 'Prompts.');
    });
});

test('prompting - frontendRef - choices', async (t) => {
  t.plan(1);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  class Mock extends AppsPrompt {
    prompting() {
      this.availableFrontends = [{ ref: 'ui.frontend', artifactId: 'test.ui.frontend' }, { ref: 'ui.spa', artifactId: 'test.ui.spa' }];
      super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'ui.frontend' }] }, { module: [{ '#text': 'ui.spa' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'ui.frontend'));
      fs.mkdirSync(path.join(temporaryDir, 'ui.spa'));
      fs.writeFileSync(
        path.join(temporaryDir, 'ui.frontend', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:frontend-general': { artifactId: 'test.ui.frontend' } }));
      fs.writeFileSync(
        path.join(temporaryDir, 'ui.spa', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:frontend-general': { artifactId: 'test.ui.spa' } }));
    })
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'frontendRef' });
      t.deepEqual(await prompt.choices(), ['None', 'test.ui.frontend', 'test.ui.spa'], 'List matches.');
    });
});

test('prompting - frontendRef - post processing - None', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsPrompt)
    .withOptions({
      defaults: true,
      props: { frontendRef: 'selected' }
    })
    .withPrompts({
      bundleRef: 'None',
    })
    .run()
    .then(async (result) => {
      t.is(result.generator.props.frontendRef, undefined, 'Deletes Frontend Ref');
    });
});

test('prompting - frontendRef - post processing - selected', async (t) => {
  t.plan(2);

  class Mock extends AppsPrompt {
    prompting() {
      this.availableFrontends = [{ ref: 'ui.frontend', artifactId: 'test.ui.frontend' }, { ref: 'ui.spa', artifactId: 'test.ui.spa' }];
      super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({
      defaults: true,
      props: { frontendRef: 'selected' }
    })
    .withPrompts({
      frontendRef: 'test.ui.frontend',
    })
    .run()
    .then(async (result) => {
      t.is(result.generator.props.bundleRef, undefined, 'Deletes Frontend Ref');
      t.deepEqual(result.generator.props.frontend, { ref: 'ui.frontend', artifactId: 'test.ui.frontend' }, 'Sets Frontend');
    });
});

test('prompting - precompileScripts', async (t) => {
  t.plan(2);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  await helpers
    .create(AppsPrompt)
    .withOptions({
      props: { precompileScripts: true },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'precompileScripts' });
      t.false(prompt.when, 'Does not prompt.');
      t.true(prompt.default, 'Default is set');
    });
});

test('writing/installing - v6.5 - examples', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  await helpers
    .create(AppsWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        examples: true,
        package: 'com.adobe.test',
        artifactId: 'test.ui.apps',
        name: 'Name',
        appId: 'test',
        structure: {
          ref: 'ui.apps.structure',
          artifactId: 'test.ui.apps.structure',
        },
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
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'ui.apps.structure' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'),
        path.join(temporaryDir, 'ui.apps.structure', 'pom.xml')
      );
      fs.writeFileSync(
        path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } })
      );
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.apps<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.apps', 'ArtifactId set.');
      t.is(pomData.project.name, 'Name', 'Name set.');

      result.assertFileContent('pom.xml', /<artifactId>uber-jar<\/artifactId>/);
      result.assertFileContent('pom.xml', /<artifactId>cq-wcm-taglib<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>test.core<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>test.ui.frontend<\/artifactId>/);

      const contentPath = path.join('src', 'main', 'content', 'jcr_root', 'apps', 'test');

      result.assertFile(path.join(contentPath, 'clientlibs', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', '.content.xml'));
      result.assertFile(path.join(contentPath, 'i18n', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', 'helloworld', 'helloworld.html'));

      result.assertFile(path.join('src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));
      result.assertFile(path.join('target', `test.ui.apps-1.0.0-SNAPSHOT.zip`));
    });
});

test('writing/installing - cloud - no examples', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  await helpers
    .create(AppsWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        examples: false,
        package: 'com.adobe.test',
        artifactId: 'test.ui.apps',
        name: 'Name',
        appId: 'test',
        structure: {
          ref: 'ui.apps.structure',
          artifactId: 'test.ui.apps.structure',
        },
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
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'ui.apps.structure' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(
        fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'),
        path.join(temporaryDir, 'ui.apps.structure', 'pom.xml')
      );
      fs.writeFileSync(
        path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } })
      );
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.apps<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.apps', 'ArtifactId set.');
      t.is(pomData.project.name, 'Name', 'Name set.');

      result.assertFileContent('pom.xml', /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>cq-wcm-taglib<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>test.core<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>test.ui.frontend<\/artifactId>/);

      const contentPath = path.join('src', 'main', 'content', 'jcr_root', 'apps', 'test');

      result.assertFile(path.join(contentPath, 'clientlibs', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', '.content.xml'));
      result.assertFile(path.join(contentPath, 'i18n', '.content.xml'));
      result.assertNoFile(path.join(contentPath, 'components', 'helloworld', 'helloworld.html'));

      result.assertFile(path.join('src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));
      result.assertFile(path.join('target', `test.ui.apps-1.0.0-SNAPSHOT.zip`));
    });
});

test('writing/installing - bundle & frontend references', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  await helpers
    .create(AppsWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        examples: true,
        package: 'com.adobe.test',
        artifactId: 'test.ui.apps',
        name: 'Name',
        appId: 'test',
        structure: {
          ref: 'ui.apps.structure',
          artifactId: 'test.ui.apps.structure',
        },
        bundle: {
          ref: 'core',
          artifactId: 'test.core',
        },
        frontend: {
          ref: 'ui.frontend',
          artifactId: 'test.ui.frontend',
        },
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
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'ui.apps.structure' }] }, { module: [{ '#text': 'ui.frontend' }] }, { module: [{ '#text': 'core' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'core'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'core', 'pom.xml'), path.join(temporaryDir, 'core', 'pom.xml'));
      fs.mkdirSync(path.join(temporaryDir, 'ui.frontend'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.frontend', 'pom.xml'), path.join(temporaryDir, 'ui.frontend', 'pom.xml'));
      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));

      fs.writeFileSync(
        path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'),
        JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } })
      );
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui.apps<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.apps', 'ArtifactId set.');
      t.is(pomData.project.name, 'Name', 'Name set.');

      result.assertFileContent('pom.xml', /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertFileContent('pom.xml', /<artifactId>test.core<\/artifactId>/);
      result.assertFileContent('pom.xml', /<artifactId>test.ui.frontend<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>cq-wcm-taglib<\/artifactId>/);
      result.assertFileContent('pom.xml', /<directory>\${project\.basedir}\/\.\.\/ui\.frontend\/src\/main\/content\/jcr_root<\/directory>/);

      const contentPath = path.join('src', 'main', 'content', 'jcr_root', 'apps', 'test');

      result.assertFile(path.join(contentPath, 'clientlibs', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', '.content.xml'));
      result.assertFile(path.join(contentPath, 'i18n', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', 'helloworld', 'helloworld.html'));

      result.assertFile(path.join('src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));
      result.assertFile(path.join('target', `test.ui.apps-1.0.0-SNAPSHOT.zip`));
    });
});

function addModulesToPom(temporaryDir, toAdd = []) {
  const parser = new XMLParser(PomUtils.xmlOptions);
  const builder = new XMLBuilder(PomUtils.xmlOptions);
  const pom = path.join(temporaryDir, 'pom.xml');
  const pomData = parser.parse(fs.readFileSync(pom, PomUtils.fileOptions));
  const proj = PomUtils.findPomNodeArray(pomData, 'project');

  let modules = PomUtils.findPomNodeArray(proj, 'modules');
  if (modules) {
    modules.push(...toAdd);
  } else {
    modules = { modules: toAdd };
    proj.splice(7, 0, modules);
  }
  fs.writeFileSync(pom, PomUtils.fixXml(builder.build(pomData)));
}
