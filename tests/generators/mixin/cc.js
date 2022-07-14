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
import nock from 'nock';
import helpers from 'yeoman-test';

import { Octokit } from '@octokit/rest';

import { generatorPath, aem65ApiMetadata, fixturePath } from '../../fixtures/helpers.js';

import CoreComponentMixinGenerator from '../../../generators/mixin-cc/index.js';
import ParentPomGenerator from '../../../generators/app/pom/index.js';

// test('no apps package - errors', async (t) => {
//   t.plan(2);
//
//   const error = await t.throwsAsync(
//     helpers
//       .create(generatorPath('app'))
//       .withGenerators([[CoreComponentMixinGenerator, '@adobe/aem:mixin-cc', generatorPath('mixin-cc', 'index.js')]])
//       .withOptions({
//         defaults: true,
//         generateInto: 'test',
//         groupId: 'com.adobe.test',
//         appId: 'test',
//         name: 'Test',
//         modules: 'mixin-cc',
//       })
//       .run()
//   );
//
//   t.regex(error.message, /Project must have at least one UI Apps module to use Core Component mixin\./);
// });
//
// test('invalid apps package - errors', async (t) => {
//   t.plan(2);
//
//   const error = await t.throwsAsync(
//     helpers
//       .create(generatorPath('mixin-cc'))
//       .inTmpDir((temporary) => {
//         fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
//         const data = JSON.parse(fs.readFileSync(path.join(temporary, '.yo-rc.json')));
//         delete data['@adobe/generator-aem']['ui.apps'];
//         fs.writeFileSync(path.join(temporary, '.yo-rc.json'), JSON.stringify(data, null, 2));
//
//       })
//       .withOptions({
//         apps: 'ui.config,tests.it',
//       })
//       .run()
//   );
//
//   t.regex(error.message, /Project must have at least one UI Apps module to use Core Component mixin\./);
// });
//
// test.serial('retrieve version error', async (t) => {
//   t.plan(2);
//   nock('https://api.github.com').get('/repos/adobe/aem-core-wcm-components/releases').reply(500);
//
//   const error = await t.throwsAsync(
//     helpers
//       .create(generatorPath('mixin-cc'))
//       .inTmpDir((temporary) => {
//         fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
//       })
//       .run()
//   );
//
//   t.regex(error.message, /Unable to retrieve Core Component versions, error was:/);
//   nock.cleanAll();
//   nock.enableNetConnect();
// });
//
// test.serial('ignores missing bundle - defaults to only apps modules', async (t) => {
//   /* eslint-disable camelcase */
//   nock('https://api.github.com')
//     .get('/repos/adobe/aem-core-wcm-components/releases')
//     .reply(200, [{ tag_name: '2.20.0' }, { tag_name: '2.19.2' }, { tag_name: '2.19.0' }, { tag_name: '2.18.6' }, { tag_name: '2.18.4' }, { tag_name: '2.18.2' }, { tag_name: '2.18.0' }]);
//   /* eslint-enable camelcase */
//
//   await helpers
//     .create(generatorPath('mixin-cc'))
//     .inTmpDir((temporary) => {
//       fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
//       const data = JSON.parse(fs.readFileSync(path.join(temporary, '.yo-rc.json')));
//       delete data['@adobe/generator-aem'].core;
//       fs.writeFileSync(path.join(temporary, '.yo-rc.json'), JSON.stringify(data, null, 2));
//     })
//     .withOptions({ version: 'latest' })
//     .run()
//     .then((result) => {
//       nock.cleanAll();
//       nock.enableNetConnect();
//
//       result.assertFileContent('pom.xml', /core.wcm.components.version>2\.20\.0/);
//       result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.core<\/artifactId>/);
//
//       verifyAppsFiles(result);
//       const appsPom = result.generator.destinationPath('ui.apps', 'pom.xml');
//       result.assertNoFileContent(appsPom, /core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/);
//       result.assertNoFileContent(appsPom, /core\.wcm\.components\.content<\/artifactId>\s+<type>/);
//       result.assertNoFileContent(appsPom, /core\.wcm\.components\.content<\/artifactId>\s+<\/dependency>/);
//       result.assertNoFileContent(appsPom, /core\.wcm\.components\.config<\/artifactId>\s+<type>/);
//       result.assertNoFileContent(appsPom, /core\.wcm\.components\.config<\/artifactId>\s+<\/dependency>/);
//       const corePom = result.generator.destinationPath('core', 'pom.xml');
//       result.assertNoFileContent(corePom, /<artifactId>core\.wcm\.components\.core<\/artifactId>/);
//     });
//   nock.cleanAll();
//   nock.enableNetConnect();
// });

test.serial('adds bundle content - cloud', async (t) => {
  /* eslint-disable camelcase */
  nock('https://api.github.com')
    .get('/repos/adobe/aem-core-wcm-components/releases')
    .reply(200, [{ tag_name: '2.20.0' }, { tag_name: '2.19.2' }, { tag_name: '2.19.0' }, { tag_name: '2.18.6' }, { tag_name: '2.18.4' }, { tag_name: '2.18.2' }, { tag_name: '2.18.0' }]);
  /* eslint-enable camelcase */

  await helpers
    .create(generatorPath('mixin-cc'))
    .inTmpDir((temporary) => {
      fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
    })
    .withOptions({ version: 'latest' })
    .run()
    .then((result) => {
      nock.cleanAll();
      nock.enableNetConnect();

      result.assertFileContent('pom.xml', /core.wcm.components.version>2\.20\.0/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.core<\/artifactId>/);

      verifyAppsFiles(result);
      const appsPom = result.generator.destinationPath('ui.apps', 'pom.xml');
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/)
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.content<\/artifactId>\s+<type>/)
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.content<\/artifactId>\s+<\/dependency>/)
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.config<\/artifactId>\s+<type>/)
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.config<\/artifactId>\s+<\/dependency>/)

      const corePom = result.generator.destinationPath('core', 'pom.xml');
      result.assertFileContent(corePom, /<artifactId>core\.wcm\.components\.core<\/artifactId>\s+<scope>/);

    });
  nock.cleanAll();
  nock.enableNetConnect();
});


test.serial('adds all module content - v6.5', async (t) => {
  /* eslint-disable camelcase */
  nock('https://api.github.com')
    .get('/repos/adobe/aem-core-wcm-components/releases')
    .reply(200, [{ tag_name: '2.20.0' }, { tag_name: '2.19.2' }, { tag_name: '2.19.0' }, { tag_name: '2.18.6' }, { tag_name: '2.18.4' }, { tag_name: '2.18.2' }, { tag_name: '2.18.0' }]);
  /* eslint-enable camelcase */

  await helpers
    .create(generatorPath('mixin-cc'))
    .inTmpDir((temporary) => {
      fs.cpSync(fixturePath('projects'), temporary, { recursive: true });
    })
    .withOptions({ version: 'latest' })
    .run()
    .then((result) => {
      nock.cleanAll();
      nock.enableNetConnect();

      result.assertFileContent('pom.xml', /core.wcm.components.version>2\.20\.0/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.core<\/artifactId>/);

      verifyAppsFiles(result);
      const appsPom = result.generator.destinationPath('ui.apps', 'pom.xml');
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/)
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.content<\/artifactId>\s+<type>/)
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.content<\/artifactId>\s+<\/dependency>/)
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.config<\/artifactId>\s+<type>/)
      result.assertNoFileContent(appsPom, /core\.wcm\.components\.config<\/artifactId>\s+<\/dependency>/)

      const corePom = result.generator.destinationPath('core', 'pom.xml');
      result.assertFileContent(corePom, /<artifactId>core\.wcm\.components\.core<\/artifactId>\s+<scope>/);

    });
  nock.cleanAll();
  nock.enableNetConnect();
});


function verifyAppsFiles(result) {
  const componentsFolder = result.generator.destinationPath('ui.apps', 'src', 'main', 'content', 'jcr_root', 'apps', 'test', 'components');

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
