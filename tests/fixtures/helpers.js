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
import { fileURLToPath } from 'node:url';
import _ from 'lodash';

import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import PomUtils from '../../lib/pom-utils.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const projectRoot = path.join(dirname, '..', '..');

export const cloudSdkApiMetadata = {
  groupId: 'com.adobe.aem',
  artifactId: 'aem-sdk-api',
  version: '2022.3.6698.20220318T233218Z-220400',
};

export const aem65ApiMetadata = {
  groupId: 'com.adobe.aem',
  artifactId: 'uber-jar',
  version: '6.5.12',
};

export function generatorPath(...dest) {
  return path.join(projectRoot, 'generators', ...dest);
}

export function fixturePath(...dest) {
  return path.join(projectRoot, 'tests', 'fixtures', ...dest);
}

export function addModulesToPom(temporaryDir, toAdd = []) {
  const parser = new XMLParser(PomUtils.xmlOptions);
  const builder = new XMLBuilder(PomUtils.xmlOptions);
  const pom = path.join(temporaryDir, 'pom.xml');
  const pomData = parser.parse(fs.readFileSync(pom, PomUtils.fileOptions));
  const proj = PomUtils.findPomNodeArray(pomData, 'project');

  let modules = PomUtils.findPomNodeArray(proj, 'modules');
  if (modules) {
    modules.push(
      ..._.map(toAdd, (m) => {
        return { module: [{ '#text': m }] };
      })
    );
  } else {
    modules = {
      modules: _.map(toAdd, (m) => {
        return { module: [{ '#text': m }] };
      }),
    };
    proj.splice(7, 0, modules);
  }

  fs.writeFileSync(pom, PomUtils.fixXml(builder.build(pomData)));
}

export function addPropertyToPom(temporaryDir, name, value) {
  const parser = new XMLParser(PomUtils.xmlOptions);
  const builder = new XMLBuilder(PomUtils.xmlOptions);
  const pom = path.join(temporaryDir, 'pom.xml');
  const pomData = parser.parse(fs.readFileSync(pom, PomUtils.fileOptions));
  const proj = PomUtils.findPomNodeArray(pomData, 'project');

  const pomProperties = PomUtils.findPomNodeArray(proj, 'properties');
  const temporary = {};
  temporary[name] = [{ '#text': value }];
  pomProperties.push(temporary);
  fs.writeFileSync(pom, PomUtils.fixXml(builder.build(pomData)));
}

export function addDependenciesToPom(temporaryDir, toAdd = []) {
  const parser = new XMLParser(PomUtils.xmlOptions);
  const builder = new XMLBuilder(PomUtils.xmlOptions);
  const pom = path.join(temporaryDir, 'pom.xml');
  const pomData = parser.parse(fs.readFileSync(pom, PomUtils.fileOptions));
  const proj = PomUtils.findPomNodeArray(pomData, 'project');

  let dependencies = PomUtils.findPomNodeArray(proj, 'dependencies');
  if (dependencies) {
    dependencies.push(...toAdd);
  }

  dependencies = PomUtils.findPomNodeArray(proj, 'dependencyManagement', 'dependencies');
  if (dependencies) {
    dependencies.push(...toAdd);
  }

  fs.writeFileSync(pom, PomUtils.fixXml(builder.build(pomData)));
}

const helpers = {
  cloudSdkApiMetadata,
  aem65ApiMetadata,
  projectRoot,
  generatorPath,
  fixturePath,
  addModulesToPom,
  addDependenciesToPom,
};

export default helpers;
