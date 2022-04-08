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

import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';

import got from 'got';
import project from '../../fixtures/helpers.js';
import Utils from '../../../lib/utils.js';

test.serial('AEM 6.5', async (t) => {
  t.plan(5);

  const metadata = fs.readFileSync(path.join(project.fixturesRoot, 'files', 'uber-jar-metadata.xml'));
  const fake = sinon.fake.resolves(metadata);
  sinon.replace(got, 'get', fake);

  await Utils.latestApi('6.5').then((data) => {
    t.is(data.groupId, 'com.adobe.aem', 'Group Id');
    t.is(data.artifactId, 'uber-jar', 'Artifact Id');
    t.is(data.version, '6.5.12', 'Version');
    t.is(data.path, 'com/adobe/aem/uber-jar', 'Repo Path');

    t.is(fake.firstArg, `https://repo1.maven.org/maven2/${data.path}/maven-metadata.xml`);
    sinon.restore();
  });
});

test.serial('AEMaaCS', async (t) => {
  t.plan(5);

  const metadata = fs.readFileSync(path.join(project.fixturesRoot, 'files', 'sdk-api-metadata.xml'));
  const fake = sinon.fake.resolves(metadata);
  sinon.replace(got, 'get', fake);

  await Utils.latestApi('cloud').then((data) => {
    t.is(data.groupId, 'com.adobe.aem', 'Group Id');
    t.is(data.artifactId, 'aem-sdk-api', 'Artifact Id');
    t.is(data.version, '2022.3.6698.20220318T233218Z-220400', 'Version');
    t.is(data.path, 'com/adobe/aem/aem-sdk-api', 'Repo Path');

    t.is(fake.firstArg, `https://repo1.maven.org/maven2/${data.path}/maven-metadata.xml`);
    sinon.restore();
  });
});
