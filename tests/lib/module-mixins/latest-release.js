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

import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';

import got from 'got';
import { fixturePath } from '../../fixtures/helpers.js';
import ModuleMixins from '../../../lib/module-mixins.js';

test.serial('AEM 6.5 - Previous', async (t) => {
  t.plan(5);

  const metadata = fs.readFileSync(fixturePath('files', 'uber-jar-metadata.xml'));
  const fake = sinon.fake.resolves(metadata);
  sinon.replace(got, 'get', fake);

  await ModuleMixins._latestRelease({ groupId: 'com.adobe.aem', artifactId: 'uber-jar' }, true).then((data) => {
    sinon.restore();
    t.is(data.groupId, 'com.adobe.aem', 'Group Id');
    t.is(data.artifactId, 'uber-jar', 'Artifact Id');
    t.is(data.version, '6.5.12', 'Version');
    t.truthy(data.versions, 'Historical versions available');
    t.is(fake.firstArg, 'https://repo1.maven.org/maven2/com/adobe/aem/uber-jar/maven-metadata.xml');
  });
});

test.serial('AEMaaCS - No Previous', async (t) => {
  t.plan(5);

  const metadata = fs.readFileSync(fixturePath('files', 'sdk-api-metadata.xml'));
  const fake = sinon.fake.resolves(metadata);
  sinon.replace(got, 'get', fake);

  await ModuleMixins._latestRelease({ groupId: 'com.adobe.aem', artifactId: 'aem-sdk-api' }).then((data) => {
    sinon.restore();
    t.is(data.groupId, 'com.adobe.aem', 'Group Id');
    t.is(data.artifactId, 'aem-sdk-api', 'Artifact Id');
    t.is(data.version, '2022.3.6698.20220318T233218Z-220400', 'Version');
    t.falsy(data.versions, 'Historical versions not available');
    t.is(fake.firstArg, 'https://repo1.maven.org/maven2/com/adobe/aem/aem-sdk-api/maven-metadata.xml');
  });
});

test('No Coordinates', async (t) => {
  t.plan(2);
  const error = await t.throwsAsync(ModuleMixins._latestRelease);
  t.regex(error.message, /No Coordinates provided\./, 'Error thrown.');
});

test('No Group Id', async (t) => {
  t.plan(2);
  const error = await t.throwsAsync(ModuleMixins._latestRelease({ artifactId: 'test' }));
  t.regex(error.message, /No Coordinates provided\./, 'Error thrown.');
});

test('No Artifact Id', async (t) => {
  t.plan(2);
  const error = await t.throwsAsync(ModuleMixins._latestRelease({ groupId: 'test' }));
  t.regex(error.message, /No Coordinates provided\./, 'Error thrown.');
});

test.serial('Invalid XML', async (t) => {
  t.plan(1);
  const fake = sinon.fake.resolves('Not Parseable XML');
  sinon.replace(got, 'get', fake);

  await t.throwsAsync(ModuleMixins._latestRelease({ groupId: 'test' }));
  sinon.restore();
});

test.serial('Got Fails', async (t) => {
  t.plan(1);
  const fake = sinon.fake.throws(new Error('500 error'));
  sinon.replace(got, 'get', fake);

  await t.throwsAsync(ModuleMixins._latestRelease({ groupId: 'test' }));
  sinon.restore();
});
