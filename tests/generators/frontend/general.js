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

import { XMLParser } from 'fast-xml-parser';
import { generatorPath, fixturePath } from '../../fixtures/helpers.js';

import GeneralFEGenerator from '../../../generators/frontend-general/index.js';
import { WriteInstall} from '../../fixtures/generators/wrappers.js';

const resolved = generatorPath('frontend-general', 'index.js');
const GeneralWriteInstall = WriteInstall(GeneralFEGenerator, resolved);

test('writing/installing - v6.5', async (t) => {
  t.plan(5);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.frontend');


  await helpers
    .create(GeneralWriteInstall)
    .withOptions({
      defaults: true,
      showBuildOutput: false,
      props: {
        examples: true,
        appId: 'test',
        artifactId: 'test.ui.frontend',
        name: 'Test Project - UI Frontend',
      },
      parentProps: {
        groupId: 'com.adobe.test',
        artifactId: 'test',
        version: '1.0.0-SNAPSHOT',
        aemVersion: '6.5',
      },
    })
    .inDir(fullPath, () => {
      fs.copyFileSync(fixturePath('projects', 'v6.5', 'pom.xml'), path.join(temporaryDir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFileContent(path.join(temporaryDir, 'pom.xml'), /<module>ui\.frontend<\/module>/);

      const pomString = fs.readFileSync(path.join(fullPath, 'pom.xml'), 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.frontend', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - UI Frontend', 'Name set.');

      result.assertFile('.babelrc');
      result.assertFile('.eslintrc.json');
      result.assertFile('.gitignore');
      result.assertFile('assembly.xml');

      result.assertFileContent('clientlib.config.cjs', /'apps', 'test', 'clientlibs'/);
      result.assertFileContent('package.json', /"name": "test.ui.frontend"/);
      result.assertFileContent('package.json', /"version": "1.0.0-SNAPSHOT"/);

      result.assertFile('README.md');

      result.assertFile('tsconfig.json');
      result.assertFile('webpack.common.js');
      result.assertFile('webpack.dev.js');
      result.assertFile('webpack.prod.js');

      result.assertFile(path.join('src', 'main', 'webpack', 'static', 'index.html'));

      // Build was successful
      result.assertFile(path.join('dist', 'clientlib-site', 'site.js'));
      result.assertFile(path.join('src', 'main', 'content', 'jcr_root', 'apps', 'test', 'clientlibs', 'clientlib-dependencies', '.content.xml'));
      result.assertFile(path.join('src', 'main', 'content', 'jcr_root', 'apps', 'test', 'clientlibs', 'clientlib-site', '.content.xml'));
      result.assertFile(path.join('src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'));

      result.assertFile(path.join('target', 'test.ui.frontend-1.0.0-SNAPSHOT.zip'));
    });
})
