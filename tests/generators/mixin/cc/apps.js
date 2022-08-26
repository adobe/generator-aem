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

import { fixturePath, generatorPath, addModulesToPom, addDependenciesToPom } from '../../../fixtures/helpers.js';
import { init, writeInstall } from '../../../fixtures/generators/wrappers.js';

import { bundleGav, contentGav, configGav, versionStruct } from '../../../../generators/mixin-cc/index.js';
import PomUtils from '../../../../lib/pom-utils.js';
import AppsPackageModuleCoreComponentMixin from '../../../../generators/mixin-cc/apps/index.js';

const resolved = generatorPath('mixin-cc', 'apps', 'index.js');
const CCAppsInit = init(AppsPackageModuleCoreComponentMixin, resolved);
const CCAppsWrite = writeInstall(AppsPackageModuleCoreComponentMixin, resolved);

test('initializing', async (t) => {
  t.plan(1);
  await helpers
    .create(CCAppsInit)
    .withOptions({
      generateInto: 'core',
      aemVersion: 'cloud',
      version: '2.20.2',
    })
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, { aemVersion: 'cloud', version: '2.20.2', }, 'Properties set.');
    });
});

test('writing - cloud', async (t) => {
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  t.plan(1);

  await helpers
    .create(CCAppsWrite)
    .withOptions({
      props: {
        aemVersion: 'cloud',
        version: '2.20.2',
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

      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'ui.apps' }] }]);

      fs.writeFileSync(
        path.join(temporaryDir, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem': {
            aemVersion: '6.5',
            name: 'Test Project',
          },
        })
      );

      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps', 'pom.xml'), path.join(fullPath, 'pom.xml'));
      fs.cpSync(fixturePath('projects', 'cloud', 'ui.apps', 'src'), path.join(fullPath, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(fullPath, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem:package-apps': {
            appId: 'test',
          },
        })
      );
    })
    .run()
    .then((result) => {
      verifyAppsFiles(result);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.content<\/artifactId>\s+<type>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.content<\/artifactId>\s+<\/dependency>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.config<\/artifactId>\s+<type>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.config<\/artifactId>\s+<\/dependency>/);

      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore', cwd: temporaryDir });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});

test('writing - v6.5', async (t) => {
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  t.plan(1);

  await helpers
    .create(CCAppsWrite)
    .withOptions({
      props: {
        aemVersion: '6.5',
        version: '2.20.2',
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

      addModulesToPom(temporaryDir, [{ module: [{ '#text': 'ui.apps' }] }]);
      addDependenciesToPom(temporaryDir, [{ dependency: [...bundleGav, versionStruct] }, { dependency: [...contentGav, versionStruct] }, { dependency: [...configGav, versionStruct] }]);

      fs.writeFileSync(
        path.join(temporaryDir, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem': {
            aemVersion: '6.5',
            name: 'Test Project',
          },
        })
      );

      fs.copyFileSync(fixturePath('projects', 'cloud', 'ui.apps', 'pom.xml'), path.join(temporaryDir, 'ui.apps', 'pom.xml'));
      fs.cpSync(fixturePath('projects', 'cloud', 'ui.apps', 'src'), path.join(fullPath, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(temporaryDir, 'ui.apps', '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem:package-apps': {
            appId: 'test',
          },
        })
      );
    })
    .run()
    .then((result) => {
      verifyAppsFiles(result);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.content<\/artifactId>\s+<type>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.content<\/artifactId>\s+<\/dependency>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.config<\/artifactId>\s+<type>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.config<\/artifactId>\s+<\/dependency>/);

      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore', cwd: temporaryDir });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});

function verifyAppsFiles(result) {
  const componentsFolder = result.generator.destinationPath('src', 'main', 'content', 'jcr_root', 'apps', 'test', 'components');

  result.assertFile(path.join(componentsFolder, 'accordion', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'accordion', '.content.xml'), 'cq:isContainer="{Boolean}true"');
  result.assertFile(path.join(componentsFolder, 'accordion', 'new', '.content.xml'));
  result.assertFile(path.join(componentsFolder, 'accordion', '_cq_template', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'accordion', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/accordion\/v1/);
  result.assertFileContent(path.join(componentsFolder, 'accordion', '.content.xml'), /Test Project - Content/);

  result.assertFile(path.join(componentsFolder, 'breadcrumb', '.content.xml'));
  result.assertNoFileContent(path.join(componentsFolder, 'breadcrumb', '.content.xml'), 'cq:isContainer="{Boolean}true"');
  result.assertFileContent(path.join(componentsFolder, 'breadcrumb', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/breadcrumb\/v3/);
  result.assertFileContent(path.join(componentsFolder, 'breadcrumb', '.content.xml'), /Test Project - Content/);

  result.assertFile(path.join(componentsFolder, 'button', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'button', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/button\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'button', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'carousel', '.content.xml'));
  result.assertFile(path.join(componentsFolder, 'carousel', 'new', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'carousel', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/carousel\/v1/);
  result.assertFileContent(path.join(componentsFolder, 'carousel', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'container', '.content.xml'));
  result.assertFile(path.join(componentsFolder, 'container', 'new', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'container', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/container\/v1/);
  result.assertFileContent(path.join(componentsFolder, 'container', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'contentfragment', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'contentfragment', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/contentfragment\/v1/);
  result.assertFileContent(path.join(componentsFolder, 'contentfragment', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'contentfragmentlist', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'contentfragmentlist', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/contentfragmentlist\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'contentfragmentlist', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'download', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'download', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/download\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'download', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'embed', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'embed', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/embed\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'embed', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'experiencefragment', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'experiencefragment', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/experiencefragment\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'experiencefragment', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'image', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'image', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/image\/v3/);
  result.assertFileContent(path.join(componentsFolder, 'image', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'languagenavigation', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'languagenavigation', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/languagenavigation\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'languagenavigation', '.content.xml'), /Test Project - Structure/);
  result.assertFile(path.join(componentsFolder, 'list', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'list', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/list\/v3/);
  result.assertFileContent(path.join(componentsFolder, 'list', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'navigation', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'navigation', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/navigation\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'navigation', '.content.xml'), /Test Project - Structure/);
  result.assertFile(path.join(componentsFolder, 'page', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'page', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/page\/v3/);
  result.assertFileContent(path.join(componentsFolder, 'page', '.content.xml'), /.hidden/);
  result.assertFile(path.join(componentsFolder, 'page', 'body.html'));
  result.assertFile(path.join(componentsFolder, 'page', 'customfooterlibs.html'));
  result.assertFile(path.join(componentsFolder, 'page', 'customheaderlibs.html'));

  result.assertFile(path.join(componentsFolder, 'pdfviewer', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'pdfviewer', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/pdfviewer\/v1/);
  result.assertFileContent(path.join(componentsFolder, 'pdfviewer', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'progressbar', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'progressbar', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/progressbar\/v1/);
  result.assertFileContent(path.join(componentsFolder, 'progressbar', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'remotepage', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'remotepage', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/page\/v3/);
  result.assertFileContent(path.join(componentsFolder, 'remotepage', '.content.xml'), /.hidden/);
  result.assertFile(path.join(componentsFolder, 'search', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'search', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/search\/v1/);
  result.assertFileContent(path.join(componentsFolder, 'search', '.content.xml'), /Test Project - Structure/);
  result.assertFile(path.join(componentsFolder, 'separator', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'separator', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/separator\/v1/);
  result.assertFileContent(path.join(componentsFolder, 'separator', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'tabs', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'tabs', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/tabs\/v1/);
  result.assertFileContent(path.join(componentsFolder, 'tabs', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'teaser', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'teaser', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/teaser\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'teaser', '.content.xml'), /Test Project - Content/);
  result.assertFileContent(path.join(componentsFolder, 'teaser', '.content.xml'), /imageDelegate="test\/components\/image/);
  result.assertFile(path.join(componentsFolder, 'text', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'text', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/text\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'text', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'text', '_cq_dialog.xml'));
  result.assertFile(path.join(componentsFolder, 'title', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'title', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/title\/v3/);
  result.assertFileContent(path.join(componentsFolder, 'title', '.content.xml'), /Test Project - Content/);
  result.assertFile(path.join(componentsFolder, 'xfpage', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'xfpage', '.content.xml'), /sling:resourceSuperType="cq\/experience-fragments\/components\/xfpage/);
  result.assertFileContent(path.join(componentsFolder, 'xfpage', '.content.xml'), /hidden/);
  result.assertFile(path.join(componentsFolder, 'xfpage', 'body.html'));
  result.assertFile(path.join(componentsFolder, 'xfpage', 'content.html'));
  result.assertFile(path.join(componentsFolder, 'xfpage', 'customfooterlibs.html'));
  result.assertFile(path.join(componentsFolder, 'xfpage', 'customheaderlibs.html'));

  result.assertFile(path.join(componentsFolder, 'form', 'button', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'form', 'button', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/form\/button\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'form', 'button', '.content.xml'), /Test Project - Form/);
  result.assertFile(path.join(componentsFolder, 'form', 'container', '.content.xml'));
  result.assertFile(path.join(componentsFolder, 'form', 'container', 'new', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'form', 'container', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/form\/container\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'form', 'container', '.content.xml'), /Test Project - Form/);
  result.assertFile(path.join(componentsFolder, 'form', 'hidden', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'form', 'hidden', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/form\/hidden\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'form', 'hidden', '.content.xml'), /Test Project - Form/);
  result.assertFile(path.join(componentsFolder, 'form', 'options', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'form', 'options', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/form\/options\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'form', 'options', '.content.xml'), /Test Project - Form/);
  result.assertFile(path.join(componentsFolder, 'form', 'text', '.content.xml'));
  result.assertFileContent(path.join(componentsFolder, 'form', 'text', '.content.xml'), /sling:resourceSuperType="core\/wcm\/components\/form\/text\/v2/);
  result.assertFileContent(path.join(componentsFolder, 'form', 'text', '.content.xml'), /Test Project - Form/);
}
