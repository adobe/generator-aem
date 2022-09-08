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

import { addDependenciesToPom, addModulesToPom, fixturePath, generatorPath } from '../../../fixtures/helpers.js';
import { init, writeInstall } from '../../../fixtures/generators/wrappers.js';

import { bundleGav, contentGav, configGav, versionStruct, exampleConfigGav, exampleAppsGav, exampleContentGav } from '../../../../generators/mixin-cc/index.js';
import PomUtils from '../../../../lib/pom-utils.js';
import AllPackageModuleCoreComponentMixin from '../../../../generators/mixin-cc/all/index.js';

const resolved = generatorPath('mixin-cc', 'all', 'index.js');
const CCAllInit = init(AllPackageModuleCoreComponentMixin, resolved);
const CCAllWrite = writeInstall(AllPackageModuleCoreComponentMixin, resolved);

test('initializing', async (t) => {
  t.plan(1);
  await helpers
    .create(CCAllInit)
    .withOptions({
      examples: true,
      aemVersion: 'cloud',
    })
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, { aemVersion: 'cloud', examples: true }, 'Properties set.');
    });
});

test('writing - cloud - examples', async (t) => {
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'all');

  await helpers
    .create(CCAllWrite)
    .withOptions({
      props: {
        examples: true,
        aemVersion: 'cloud',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      const parser = new XMLParser(PomUtils.xmlOptions);
      const builder = new XMLBuilder(PomUtils.xmlOptions);
      const pom = path.join(temporaryDir, 'pom.xml');
      const pomData = parser.parse(fs.readFileSync(pom, PomUtils.fileOptions));
      const proj = PomUtils.findPomNodeArray(pomData, 'project');
      const pomProperties = PomUtils.findPomNodeArray(proj, 'properties');
      pomProperties.push({ 'core.wcm.components.version': [{ '#text': '2.20.2' }] });
      fs.writeFileSync(pom, PomUtils.fixXml(builder.build(pomData)));
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'all' }] }]);
      addDependenciesToPom(temporaryDir, [
        { dependency: [...bundleGav, versionStruct] },
        { dependency: [...contentGav, versionStruct] },
        { dependency: [...configGav, versionStruct] },
        { dependency: [...exampleConfigGav, versionStruct] },
        { dependency: [...exampleAppsGav, versionStruct] },
        { dependency: [...exampleContentGav, versionStruct] },
      ]);

      fs.copyFileSync(fixturePath('projects', 'cloud', 'all', 'pom.xml'), path.join(fullPath, 'pom.xml'));
      fs.writeFileSync(
        path.join(fullPath, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem:package-all': {
            appId: 'test',
          },
        })
      );
    })
    .run()
    .then((result) => {
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.core<\/artifactId>\s+<target>\/apps\/test-vendor-packages/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.content<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.content<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.config<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.config<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);

      result.assertFileContent('pom.xml', /core\.wcm\.components\.examples.ui.config<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.examples.ui.config<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.examples.ui.apps<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.examples.ui.apps<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.examples.ui.content<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.examples.ui.content<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);

      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore', cwd: temporaryDir });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});

test('writing - v6.5 - no examples', async (t) => {
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'all');

  await helpers
    .create(CCAllWrite)
    .withOptions({
      props: {
        aemVersion: '6.5',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'v6.5', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
      const parser = new XMLParser(PomUtils.xmlOptions);
      const builder = new XMLBuilder(PomUtils.xmlOptions);
      const pom = path.join(temporaryDir, 'pom.xml');
      const pomData = parser.parse(fs.readFileSync(pom, PomUtils.fileOptions));
      const proj = PomUtils.findPomNodeArray(pomData, 'project');
      const pomProperties = PomUtils.findPomNodeArray(proj, 'properties');
      pomProperties.push({ 'core.wcm.components.version': [{ '#text': '2.20.2' }] });
      fs.writeFileSync(pom, PomUtils.fixXml(builder.build(pomData)));
      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'all' }] }]);
      addDependenciesToPom(temporaryDir, [
        { dependency: [...bundleGav, versionStruct] },
        { dependency: [...contentGav, versionStruct] },
        { dependency: [...configGav, versionStruct] },
        { dependency: [...exampleConfigGav, versionStruct] },
        { dependency: [...exampleAppsGav, versionStruct] },
        { dependency: [...exampleContentGav, versionStruct] },
      ]);

      fs.copyFileSync(fixturePath('projects', 'cloud', 'all', 'pom.xml'), path.join(fullPath, 'pom.xml'));
      fs.writeFileSync(
        path.join(fullPath, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem:package-all': {
            appId: 'test',
          },
        })
      );
    })
    .run()
    .then((result) => {
      result.assertFileContent('pom.xml', /core\.wcm\.components\.core<\/artifactId>\s+<target>\/apps\/test-vendor-packages/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.content<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.content<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.config<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.config<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);

      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.examples.ui.config<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.examples.ui.config<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.examples.ui.apps<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.examples.ui.apps<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.examples.ui.content<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.examples.ui.content<\/artifactId>\s+<type>zip<\/type>\s+<\/dependency>/);

      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore', cwd: temporaryDir });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});
