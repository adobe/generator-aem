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

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import PomUtils from '../../lib/pom-utils.js';
import fs from 'node:fs';

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
    modules.push(...toAdd);
  } else {
    modules = { modules: toAdd };
    proj.splice(7, 0, modules);
  }
  fs.writeFileSync(pom, PomUtils.fixXml(builder.build(pomData)));
}


const helpers = {
  cloudSdkApiMetadata,
  aem65ApiMetadata,
  projectRoot,
  generatorPath,
  fixturePath,
  addModulesToPom
};

export default helpers;
