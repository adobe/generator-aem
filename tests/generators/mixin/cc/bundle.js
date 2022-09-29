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

import { fixturePath, generatorPath, addDependenciesToPom, addPropertyToPom } from '../../../fixtures/helpers.js';
import { init, writeInstall } from '../../../fixtures/generators/wrappers.js';

import { bundleGav, testGav, versionStruct } from '../../../../generators/mixin-cc/index.js';
import BundleModuleCoreComponentMixin from '../../../../generators/mixin-cc/bundle/index.js';

const resolved = generatorPath('mixin-cc', 'bundle', 'index.js');
const CCBundleInit = init(BundleModuleCoreComponentMixin, resolved);
const CCBundleWrite = writeInstall(BundleModuleCoreComponentMixin, resolved);

test('initializing', async (t) => {
  t.plan(1);
  await helpers
    .create(CCBundleInit)
    .withOptions({
      generateInto: 'core',
      aemVersion: 'cloud',
    })
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, { aemVersion: 'cloud' }, 'Properties set.');
    });
});

test('writing - cloud', async (t) => {
  t.plan(1);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'core');

  await helpers
    .create(CCBundleWrite)
    .withOptions({
      props: {
        aemVersion: 'cloud',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));

      addPropertyToPom(temporaryDir, 'core.wcm.components.version', '2.20.2');
      addDependenciesToPom(temporaryDir, [{ dependency: [...bundleGav, versionStruct] }, { dependency: [...testGav, versionStruct] }]);

      fs.writeFileSync(
        path.join(temporaryDir, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem': {
            aemVersion: 'cloud',
          },
        })
      );

      fs.copyFileSync(fixturePath('projects', 'cloud', 'core', 'pom.xml'), path.join(fullPath, 'pom.xml'));
      fs.writeFileSync(
        path.join(fullPath, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem:bundle': {
            package: 'com.adobe.test',
          },
        })
      );
    })
    .run()
    .then((result) => {
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.core<\/artifactId>\s+<scope>test/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.testing\.aem-mock-plugin<\/artifactId>\s+<scope>test/);
      result.assertFile(path.join('src', 'test', 'java', 'com', 'adobe', 'test', 'testcontext', 'AppAemContext.java'));

      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore', cwd: path.join(temporaryDir, 'core') });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});

test('writing - v6.5', async (t) => {
  t.plan(1);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'core');

  await helpers
    .create(CCBundleWrite)
    .withOptions({
      props: {
        aemVersion: '6.5',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'v6.5', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      addPropertyToPom(temporaryDir, 'core.wcm.components.version', '2.20.2');
      addDependenciesToPom(temporaryDir, [{ dependency: [...bundleGav, versionStruct] }, { dependency: [...testGav, versionStruct] }]);

      fs.writeFileSync(
        path.join(temporaryDir, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem': {
            aemVersion: '6.5',
          },
        })
      );

      fs.copyFileSync(fixturePath('projects', 'v6.5', 'core', 'pom.xml'), path.join(fullPath, 'pom.xml'));
      fs.writeFileSync(
        path.join(fullPath, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem:bundle': {
            package: 'com.adobe.other.test',
          },
        })
      );
    })
    .run()
    .then((result) => {
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.testing\.aem-mock-plugin<\/artifactId>\s+<scope>test/);
      result.assertFile(path.join('src', 'test', 'java', 'com', 'adobe', 'other', 'test', 'testcontext', 'AppAemContext.java'));

      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore', cwd: fullPath });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});
