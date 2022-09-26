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

import { addModulesToPom, fixturePath, generatorPath } from '../../../fixtures/helpers.js';
import { init, writeInstall } from '../../../fixtures/generators/wrappers.js';

import ContentPackageModuleCoreComponentMixin from '../../../../generators/mixin-cc/content/index.js';

const resolved = generatorPath('mixin-cc', 'content', 'index.js');
const CCContentInit = init(ContentPackageModuleCoreComponentMixin, resolved);
const CCContentWrite = writeInstall(ContentPackageModuleCoreComponentMixin, resolved);

test('initializing', async (t) => {
  t.plan(1);
  await helpers
    .create(CCContentInit)
    .withOptions({
      dataLayer: true,
    })
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, { dataLayer: true }, 'Properties set.');
    });
});

test('writing - dataLayer set', async (t) => {
  t.plan(1);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.content');

  await helpers
    .create(CCContentWrite)
    .withOptions({
      props: {
        dataLayer: true,
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      addModulesToPom(temporaryDir, ['ui.content']);
      fs.cpSync(fixturePath('projects', 'cloud', 'ui.content'), path.join(fullPath), { recursive: true });
      fs.writeFileSync(
        path.join(fullPath, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem:package-content': {
            appId: 'test',
          },
        })
      );
    })
    .run()
    .then((result) => {
      const outputDir = result.generator.destinationPath('src', 'main', 'content', 'jcr_root', 'conf', 'test', '_sling_config', 'com.adobe.cq.wcm.core.components.internal.DataLayerConfig');
      result.assertFile(path.join(outputDir, '.content.xml'));
      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore', cwd: temporaryDir });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});

test('writing - dataLayer not set', async (t) => {
  t.plan(1);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.content');

  await helpers
    .create(CCContentWrite)
    .withOptions({
      props: {
        dataLayer: false,
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      addModulesToPom(temporaryDir, ['ui.content']);
      fs.cpSync(fixturePath('projects', 'cloud', 'ui.content'), path.join(fullPath), { recursive: true });
      fs.writeFileSync(
        path.join(fullPath, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem:package-content': {
            appId: 'test',
          },
        })
      );
    })
    .run()
    .then((result) => {
      const outputDir = result.generator.destinationPath('src', 'main', 'content', 'jcr_root', 'conf', 'test', '_sling_config', 'com.adobe.cq.wcm.core.components.internal.DataLayerConfig');
      result.assertNoFile(path.join(outputDir, '.content.xml'));
      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore', cwd: temporaryDir });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});
