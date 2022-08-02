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

import _ from 'lodash';

import test from 'ava';
import { XMLBuilder } from 'fast-xml-parser';

import PomUtils from '../../lib/pom-utils.js';
import { fixturePath } from '../fixtures/helpers.js';

const pomStruct = [
  {
    properties: [{ 'java.version': [{ '#text': '11' }] }, { 'aem.version': [{ '#text': '6.5.12' }] }, { 'some.property': [{ '#text': 'value' }] }],
  },
  {
    plugins: [
      {
        plugin: [{ artifactId: [{ '#text': 'filevault-package-maven-plugin' }] }, { version: [{ '#text': '3.2.1' }] }, { extensions: [{ '#text': 'true' }] }],
      },
      {
        plugin: [{ groupId: [{ '#text': 'org.apache.maven.plugins' }] }, { artifactId: [{ '#text': 'maven-release-plugin' }] }],
      },
      {
        plugin: [{ groupId: [{ '#text': 'com.test' }] }, { artifactId: [{ '#text': 'plugin' }] }],
      },
    ],
  },
  {
    dependencies: [
      {
        dependency: [{ groupId: [{ '#text': 'com.adobe.aem' }] }, { artifactId: [{ '#text': 'uber-jar' }] }, { version: [{ '#text': '1.2.3' }] }],
      },
      {
        dependency: [{ groupId: [{ '#text': 'com.adobe.aem' }] }, { artifactId: [{ '#text': 'aem-sdk-api' }] }, { version: [{ '#text': '3.2.1' }] }],
      },
      {
        dependency: [{ groupId: [{ '#text': 'com.test' }] }, { artifactId: [{ '#text': 'otherdep' }] }, { version: [{ '#text': '1.99' }] }],
      },
    ],
  },
  {
    profiles: [
      {
        profile: [{ id: [{ '#text': 'autoInstallPackage' }] }, { activation: [{ '#text': 'this is ignored' }] }],
      },
      {
        profile: [{ id: [{ '#text': 'autoInstallPackagePublish' }] }, { activation: [{ '#text': 'this is ignored' }] }],
      },
      {
        profile: [{ id: [{ '#text': 'custom-profile' }] }, { activation: [{ '#text': 'this is ignored' }] }],
      },
    ],
  },
];

test('readPom - exists', (t) => {
  t.plan(1);

  const generator = {
    destinationPath(pom) {
      return fixturePath('pom', 'full', pom);
    },

    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
    },
  };

  t.truthy(PomUtils.readPom(generator)[2].project, 'Read Pom.');
});

test('readPom - does not exist', (t) => {
  t.plan(1);

  const generator = {
    destinationPath(pom) {
      return fixturePath('files', pom);
    },

    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
    },
  };

  t.deepEqual(PomUtils.readPom(generator), {}, 'Pom not found.');
});

test('findPomNodeArray - does not exist', (t) => {
  t.plan(1);
  t.is(PomUtils.findPomNodeArray(pomStruct, 'dependency'), undefined, 'Not found');
});

test('findPomNodeArray - does not exist at depth', (t) => {
  t.plan(1);
  t.is(PomUtils.findPomNodeArray(pomStruct, 'dependencies', 'groupId'), undefined, 'Not found');
});

test('findPomNodeArray - does not recurse incorrectly', (t) => {
  t.plan(1);
  t.is(PomUtils.findPomNodeArray(pomStruct, 'groupId', 'dependencies'), undefined, 'Not found');
});

test('findPomNodeArray - single', (t) => {
  t.plan(1);
  t.is(PomUtils.findPomNodeArray(pomStruct, 'dependencies').length, 3, 'Found Node.');
});

test('findPomNodeArray - depth of 2', (t) => {
  t.plan(1);
  t.is(PomUtils.findPomNodeArray(pomStruct, 'dependencies', 'dependency').length, 3, 'Found Node.');
});

test('findPomNodeArray - depth of 3', (t) => {
  t.plan(1);
  t.is(PomUtils.findPomNodeArray(pomStruct, 'dependencies', 'dependency', 'groupId')[0]['#text'], 'com.adobe.aem', 'Found Node.');
});

test('fixXml', (t) => {
  t.plan(2);
  const builder = new XMLBuilder(PomUtils.xmlOptions);
  const xml = builder.build(pomStruct);

  t.regex(xml, /groupId>\n\s+com.adobe.aem\n\s+<\/groupId/, 'Built XML has space.');
  t.regex(PomUtils.fixXml(xml), /groupId>com.adobe.aem<\/groupId/, 'Fixed XML has no space.');
});

test('propertyPredicate - first', (t) => {
  t.plan(1);
  t.truthy(PomUtils.propertyPredicate(pomStruct[0].properties, { 'java.version': [{ '#text': '8' }] }), 'Property found');
});

test('propertyPredicate - middle', (t) => {
  t.plan(1);
  t.truthy(PomUtils.propertyPredicate(pomStruct[0].properties, { 'aem.version': [{ '#text': 'cloud' }] }), 'Property found');
});

test('propertyPredicate - last', (t) => {
  t.plan(1);
  t.truthy(PomUtils.propertyPredicate(pomStruct[0].properties, { 'some.property': [{ '#text': 'bar' }] }), 'Property found');
});

test('propertyPredicate - not found', (t) => {
  t.plan(1);
  t.falsy(PomUtils.propertyPredicate(pomStruct[0].properties, { 'some.other.property': [{ '#text': 'value' }] }), 'Property not found.');
});

test('pluginPredicate - first', (t) => {
  t.plan(1);

  const toFind = {
    plugin: [
      { groupId: [{ '#text': 'org.apache.jackrabbit' }] },
      { artifactId: [{ '#text': 'filevault-package-maven-plugin' }] },
      { version: [{ '#text': '1.2.3' }] },
      { extensions: [{ '#text': 'true' }] },
    ],
  };
  t.truthy(PomUtils.pluginPredicate(pomStruct[1].plugins, toFind), 'Plugin found');
});

test('pluginPredicate - middle', (t) => {
  t.plan(1);

  const toFind = {
    plugin: [{ artifactId: [{ '#text': 'maven-release-plugin' }] }],
  };
  t.truthy(PomUtils.pluginPredicate(pomStruct[1].plugins, toFind), 'Plugin found');
});

test('pluginPredicate - last', (t) => {
  t.plan(1);

  const toFind = {
    plugin: [{ groupId: [{ '#text': 'com.test' }] }, { artifactId: [{ '#text': 'plugin' }] }, { version: [{ '#text': '99.99' }] }],
  };
  t.truthy(PomUtils.pluginPredicate(pomStruct[1].plugins, toFind), 'Plugin found');
});

test('pluginPredicate - not found', (t) => {
  t.plan(1);

  const toFind = {
    plugin: [{ groupId: [{ '#text': 'com.test' }] }, { artifactId: [{ '#text': 'aotherplugin' }] }, { version: [{ '#text': '99.99' }] }],
  };
  t.falsy(PomUtils.pluginPredicate(pomStruct[1].plugins, toFind), 'Plugin not found');
});

test('pluginPredicate - not a plugin', (t) => {
  t.plan(1);

  const toFind = {
    '#comment': [{ '#text': 'This is a comment structure' }],
  };
  t.falsy(PomUtils.pluginPredicate(pomStruct[1].plugins, toFind), 'Plugin not found');
});

test('dependencyPredicate - first', (t) => {
  t.plan(1);

  const toFind = {
    dependency: [{ groupId: [{ '#text': 'com.adobe.aem' }] }, { artifactId: [{ '#text': 'uber-jar' }] }, { version: [{ '#text': '1.0.0' }] }],
  };
  t.truthy(PomUtils.dependencyPredicate(pomStruct[2].dependencies, toFind), 'Dependency found');
});

test('dependencyPredicate - middle', (t) => {
  t.plan(1);

  const toFind = {
    dependency: [{ groupId: [{ '#text': 'com.adobe.aem' }] }, { artifactId: [{ '#text': 'aem-sdk-api' }] }],
  };
  t.truthy(PomUtils.dependencyPredicate(pomStruct[2].dependencies, toFind), 'Dependency found');
});

test('dependencyPredicate - last', (t) => {
  t.plan(1);

  const toFind = {
    dependency: [{ groupId: [{ '#text': 'com.test' }] }, { artifactId: [{ '#text': 'otherdep' }] }, { version: [{ '#text': '99.99' }] }],
  };
  t.truthy(PomUtils.dependencyPredicate(pomStruct[2].dependencies, toFind), 'Dependency found');
});

test('dependencyPredicate - not found', (t) => {
  t.plan(1);

  const toFind = {
    dependency: [{ groupId: [{ '#text': 'com.test' }] }, { artifactId: [{ '#text': 'anotherdep' }] }, { version: [{ '#text': '99.99' }] }],
  };
  t.falsy(PomUtils.dependencyPredicate(pomStruct[2].dependencies, toFind), 'Dependency not found');
});

test('dependencyPredicate - not a dependency', (t) => {
  t.plan(1);

  const toFind = {
    '#comment': [{ '#text': 'This is a comment structure' }],
  };
  t.falsy(PomUtils.dependencyPredicate(pomStruct[2].dependencies, toFind), 'Dependency not found');
});

test('profilePredicate - first', (t) => {
  t.plan(1);

  const toFind = {
    profile: [{ id: [{ '#text': 'autoInstallPackage' }] }],
  };
  t.truthy(PomUtils.profilePredicate(pomStruct[3].profiles, toFind), 'Profile found');
});

test('profilePredicate - middle', (t) => {
  t.plan(1);

  const toFind = {
    profile: [{ id: [{ '#text': 'autoInstallPackagePublish' }] }, { activation: [{ '#text': 'some rule' }] }],
  };
  t.truthy(PomUtils.profilePredicate(pomStruct[3].profiles, toFind), 'Profile found');
});

test('profilePredicate - last', (t) => {
  t.plan(1);

  const toFind = {
    profile: [{ id: [{ '#text': 'custom-profile' }] }, { build: [{ '#text': 'some stuff' }] }],
  };
  t.truthy(PomUtils.profilePredicate(pomStruct[3].profiles, toFind), 'Profile found');
});

test('profilePredicate - not found', (t) => {
  t.plan(1);

  const toFind = {
    profile: [{ id: [{ '#text': 'adobe-public' }] }],
  };
  t.falsy(PomUtils.profilePredicate(pomStruct[3].profiles, toFind), 'Profile not found');
});

test('profilePredicate - not a dependency', (t) => {
  t.plan(1);

  const toFind = {
    '#comment': [{ '#text': 'This is a comment structure' }],
  };
  t.falsy(PomUtils.profilePredicate(pomStruct[3].profiles, toFind), 'Profile not found');
});

test('mergePomSections - first', (t) => {
  t.plan(3);
  const target = _.cloneDeep(pomStruct[0].properties);
  const additional = [{ 'java.version': [{ '#text': '11' }] }, { 'project.reporting.outputEncoding': [{ '#text': 'UTF-8' }] }, { 'project.build.sourceEncoding': [{ '#text': 'UTF-8' }] }];
  PomUtils.mergePomSection(target, additional, (target, item) => _.find(target, (t) => _.isEqual(t, item)));
  t.is(target.length, 5, 'Items added');
  t.is(target[3]['project.reporting.outputEncoding'][0]['#text'], 'UTF-8', 'Item added to correct spot.');
  t.is(target[4]['project.build.sourceEncoding'][0]['#text'], 'UTF-8', 'Item added to correct spot.');
});

test('mergePomSections - middle', (t) => {
  t.plan(3);
  const target = _.cloneDeep(pomStruct[0].properties);
  const additional = [{ 'project.reporting.outputEncoding': [{ '#text': 'UTF-8' }] }, { 'aem.version': [{ '#text': '6.5.12' }] }, { 'project.build.sourceEncoding': [{ '#text': 'UTF-8' }] }];
  PomUtils.mergePomSection(target, additional, (target, item) => _.find(target, (t) => _.isEqual(t, item)));
  t.is(target.length, 5, 'Items added');
  t.is(target[3]['project.reporting.outputEncoding'][0]['#text'], 'UTF-8', 'Item added to correct spot.');
  t.is(target[4]['project.build.sourceEncoding'][0]['#text'], 'UTF-8', 'Item added to correct spot.');
});

test('mergePomSections - last', (t) => {
  t.plan(3);
  const target = _.cloneDeep(pomStruct[0].properties);
  const additional = [{ 'project.reporting.outputEncoding': [{ '#text': 'UTF-8' }] }, { 'project.build.sourceEncoding': [{ '#text': 'UTF-8' }] }, { 'some.property': [{ '#text': 'value' }] }];
  PomUtils.mergePomSection(target, additional, (target, item) => _.find(target, (t) => _.isEqual(t, item)));
  t.is(target.length, 5, 'Items added');
  t.is(target[3]['project.reporting.outputEncoding'][0]['#text'], 'UTF-8', 'Item added to correct spot.');
  t.is(target[4]['project.build.sourceEncoding'][0]['#text'], 'UTF-8', 'Item added to correct spot.');
});

test('mergePomSections - not found', (t) => {
  t.plan(3);
  const target = _.cloneDeep(pomStruct[0].properties);
  const additional = [{ 'project.reporting.outputEncoding': [{ '#text': 'UTF-8' }] }, { 'project.build.sourceEncoding': [{ '#text': 'UTF-8' }] }];
  PomUtils.mergePomSection(target, additional, (target, item) => _.find(target, (t) => _.isEqual(t, item)));
  t.is(target.length, 5, 'Items not added');
  t.is(target[3]['project.reporting.outputEncoding'][0]['#text'], 'UTF-8', 'Item added to correct spot.');
  t.is(target[4]['project.build.sourceEncoding'][0]['#text'], 'UTF-8', 'Item added to correct spot.');
});
