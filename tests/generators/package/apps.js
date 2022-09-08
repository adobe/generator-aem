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

import AppsPackageGenerator from '../../../generators/package-apps/index.js';
import { init, prompt, config, writeInstall } from '../../fixtures/generators/wrappers.js';
import { generatorPath, fixturePath, addModulesToPom, cloudSdkApiMetadata, aem65ApiMetadata } from '../../fixtures/helpers.js';
import { generatorName as bundleGeneratorName } from '../../../generators/bundle/index.js';
import { generatorName as frontendGeneratorName } from '../../../generators/frontend-general/index.js';

const resolved = generatorPath('package-apps', 'index.js');
const AppsInit = init(AppsPackageGenerator, resolved);
const AppsPrompt = prompt(AppsPackageGenerator, resolved);
const AppsConfig = config(AppsPackageGenerator, resolved);
const AppsWriteInstall = writeInstall(AppsPackageGenerator, resolved);

test('initializing - no options', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsInit)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, {}, 'Properties set.');
    });
});

test('initializing - defaults', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsInit)
    .withOptions({
      defaults: true,
      props: {
        appId: 'test',
      },
    })
    .run()
    .then((result) => {
      const expected = {
        appId: 'test',
        precompileScripts: true,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('initializing - options', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsInit)
    .withOptions({
      defaults: true,
      appId: 'test',
      bundleRef: 'core',
      frontendRef: 'ui.frontend',
      structureRef: 'ui.apps.structure',
      errorHandler: true,
    })
    .run()
    .then((result) => {
      const expected = {
        precompileScripts: true,
        bundle: 'core',
        frontend: 'ui.frontend',
        structure: 'ui.apps.structure',
        errorHandler: true,
      };
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test.serial('initializing - lookups modules', async (t) => {
  t.plan(2);

  const bundles = [{ path: 'core', artifactId: 'test.core' }];
  const frontends = [{ path: 'ui.frontend', artifactId: 'test.ui.frontend' }];
  sinon.restore();
  const stub = sinon.stub(AppsInit.prototype, '_findModules');
  stub.withArgs(bundleGeneratorName).returns(bundles);
  stub.withArgs(frontendGeneratorName).returns(frontends);

  await helpers
    .create(AppsInit)
    .run()
    .then((result) => {
      stub.restore();
      t.deepEqual(result.generator.availableBundles, bundles, 'Set bundle list.');
      t.deepEqual(result.generator.availableFrontends, frontends, 'Set frontend list.');
    });
});

test('prompting - bundleRef - bundle set', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsPrompt)
    .run()
    .then(async (result) => {
      result.generator.props.bundle = 'test.core';
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'bundleRef' });
      t.false(await prompt.when(), 'Does not prompt.');
    });
});

test('prompting - bundleRef - choices', async (t) => {
  t.plan(1);

  class Mock extends AppsPrompt {
    prompting() {
      this.availableBundles = [
        { path: 'core', artifactId: 'test.core' },
        { path: 'bundle', artifactId: 'test.bundle' },
      ];
      super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'bundleRef' });
      t.deepEqual(await prompt.choices(), ['None', 'test.core', 'test.bundle'], 'List matches.');
    });
});

test('prompting - bundleRef - post processing - None', async (t) => {
  t.plan(2);

  await helpers
    .create(AppsPrompt)
    .withOptions({
      defaults: true,
      props: { bundleRef: 'selected' },
    })
    .withPrompts({
      bundleRef: 'None',
    })
    .run()
    .then(async (result) => {
      t.is(result.generator.props.bundleRef, undefined, 'Deletes Bundle Ref');
      t.is(result.generator.props.bundle, undefined, 'Bundle not set');
    });
});

test('prompting - bundleRef - post processing - selected', async (t) => {
  t.plan(2);

  class Mock extends AppsPrompt {
    prompting() {
      this.availableBundles = [
        { path: 'core', artifactId: 'test.core' },
        { path: 'bundle', artifactId: 'test.bundle' },
      ];
      super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({
      defaults: true,
      props: { bundleRef: 'selected' },
    })
    .withPrompts({
      bundleRef: 'test.core',
    })
    .run()
    .then(async (result) => {
      t.is(result.generator.props.bundleRef, undefined, 'Deletes Bundle Ref');
      t.is(result.generator.props.bundle, 'test.core', 'Sets Bundle');
    });
});

test('prompting - frontendRef - defaults', async (t) => {
  t.plan(1);

  await helpers
    .create(AppsPrompt)
    .run()
    .then(async (result) => {
      result.generator.props.frontend = 'test.ui.frontend';
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'frontendRef' });
      t.false(await prompt.when(), 'Does not prompt.');
    });
});

test('prompting - frontendRef - choices', async (t) => {
  t.plan(1);

  class Mock extends AppsPrompt {
    prompting() {
      this.availableFrontends = [
        { path: 'ui.frontend', artifactId: 'test.ui.frontend' },
        { path: 'ui.spa', artifactId: 'test.ui.spa' },
      ];
      super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .run()
    .then(async (result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'frontendRef' });
      t.deepEqual(await prompt.choices(), ['None', 'test.ui.frontend', 'test.ui.spa'], 'List matches.');
    });
});

test('prompting - frontendRef - post processing - None', async (t) => {
  t.plan(2);

  await helpers
    .create(AppsPrompt)
    .withOptions({
      defaults: true,
      props: { frontendRef: 'selected' },
    })
    .withPrompts({
      frontendRef: 'None',
    })
    .run()
    .then(async (result) => {
      t.is(result.generator.props.frontendRef, undefined, 'Deletes Frontend Ref');
      t.is(result.generator.props.frontendRef, undefined, 'Frontend not set');
    });
});

test('prompting - frontendRef - post processing - selected', async (t) => {
  t.plan(2);

  class Mock extends AppsPrompt {
    prompting() {
      this.availableFrontends = [
        { path: 'ui.frontend', artifactId: 'test.ui.frontend' },
        { path: 'ui.spa', artifactId: 'test.ui.spa' },
      ];
      super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({
      defaults: true,
      props: { frontendRef: 'selected' },
    })
    .withPrompts({
      frontendRef: 'test.ui.frontend',
    })
    .run()
    .then(async (result) => {
      t.is(result.generator.props.bundleRef, undefined, 'Deletes Frontend Ref');
      t.is(result.generator.props.frontend, 'test.ui.frontend', 'Sets Frontend');
    });
});

test('prompting - precompileScripts', async (t) => {
  t.plan(2);

  await helpers
    .create(AppsPrompt)
    .withOptions({
      props: { precompileScripts: true },
    })
    .run()
    .then((result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'precompileScripts' });
      t.false(prompt.when, 'Does not prompt.');
      t.true(prompt.default, 'Default is set');
    });
});

test('prompting - errorHandler', async (t) => {
  t.plan(2);

  await helpers
    .create(AppsPrompt)
    .withOptions({
      props: { errorHandler: true },
    })
    .run()
    .then((result) => {
      const prompts = result.generator.prompts;
      const prompt = _.find(prompts, { name: 'errorHandler' });
      t.false(prompt.when, 'Does not prompt.');
      t.false(prompt.default, 'Default is set');
    });
});

test('configuring', async (t) => {
  t.plan(1);

  const expected = { config: 'to be saved' };
  await helpers
    .create(AppsConfig)
    .withOptions({ props: expected })
    .run()
    .then((result) => {
      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc, { '@adobe/generator-aem:package-apps': expected }, 'Config saved.');
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
        artifactId: 'test.ui.apps',
        name: 'Name',
        appId: 'test',
        structure: 'test.ui.apps.structure',
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
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } }));
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

test('writing/installing - cloud - error handler', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  await helpers
    .create(AppsWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: {
        examples: false,
        artifactId: 'test.ui.apps',
        name: 'Name',
        appId: 'test',
        structure: 'test.ui.apps.structure',
        errorHandler: true,
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
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } }));
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

      const appsRoot = path.join('src', 'main', 'content', 'jcr_root', 'apps');
      const contentPath = path.join(appsRoot, 'test');

      result.assertFile(path.join(contentPath, 'clientlibs', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', '.content.xml'));
      result.assertFile(path.join(contentPath, 'i18n', '.content.xml'));
      result.assertNoFile(path.join(contentPath, 'components', 'helloworld', 'helloworld.html'));

      result.assertFile(path.join(appsRoot, 'sling', 'servlet', 'errorhandler', '404.html'));
      result.assertFile(path.join(appsRoot, 'sling', 'servlet', 'errorhandler', 'ResponseStatus.java'));

      const vault = path.join('src', 'main', 'content', 'META-INF', 'vault');
      result.assertFile(path.join(vault, 'filter.xml'));
      result.assertFileContent(path.join(vault, 'filter.xml'), /\/apps\/sling/);
      result.assertFile(path.join('target', 'test.ui.apps-1.0.0-SNAPSHOT.zip'));
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
        precompileScripts: true,
        artifactId: 'test.ui.apps',
        name: 'Name',
        appId: 'test',
        structure: 'test.ui.apps.structure',
        bundle: 'test.core',
        frontend: 'test.ui.frontend',
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

      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } }));
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

      result.assertFile(path.join('src', 'main', 'bnd', 'test.ui.apps.bnd'));

      result.assertFile(path.join(contentPath, 'clientlibs', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', '.content.xml'));
      result.assertFile(path.join(contentPath, 'i18n', '.content.xml'));
      result.assertFile(path.join(contentPath, 'components', 'helloworld', 'helloworld.html'));

      result.assertFile(path.join('src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));
      result.assertFile(path.join('target', `test.ui.apps-1.0.0-SNAPSHOT.zip`));
      result.assertFile(path.join('target', 'test.ui.apps-1.0.0-SNAPSHOT-precompiled-scripts.jar'));
    });
});

test('writing/installing - merges existing pom', async (t) => {
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
        structure: 'test.ui.apps.structure',
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
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps', 'pom.xml'), path.join(fullPath, 'pom.xml'));
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'ui.apps.structure' }] }]);

      fs.mkdirSync(path.join(temporaryDir, 'ui.apps.structure'));
      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps.structure', 'pom.xml'), path.join(temporaryDir, 'ui.apps.structure', 'pom.xml'));
      fs.writeFileSync(path.join(temporaryDir, 'ui.apps.structure', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-structure': { artifactId: 'test.ui.apps.structure' } }));
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
      result.assertFileContent('pom.xml', /<artifactId>commons-lang3<\/artifactId>/);
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
