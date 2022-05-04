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

import test from 'ava';
import { fixturePath } from '../../fixtures/helpers.js';

import ModuleMixins from '../../../lib/module-mixins.js';

test('pom not found', (t) => {
  t.plan(1);
  t.deepEqual(ModuleMixins._readPom('.'), {}, 'Properties empty');
});

test('reads', (t) => {
  t.plan(1);

  const actual = ModuleMixins._readPom(fixturePath('pom', 'full'));
  const expected = {
    groupId: 'com.test.pom.groupid',
    artifactId: 'pom.artifactid',
    version: '1.0-POM',
    name: 'Pom Name',
    pomProperties: {
      'java.version': 8,
      'aem.version': 'pom',
      'node.version': 'pom',
      'npm.version': 'pom',
    },
  };
  t.deepEqual(actual, expected, 'Properties match');
});

test('reads partial', (t) => {
  t.plan(1);

  const actual = ModuleMixins._readPom(fixturePath('pom', 'partial'));
  const expected = {
    groupId: 'com.test.pom.groupid',
    artifactId: 'pom.artifactid',
  };
  t.deepEqual(actual, expected, 'Properties match');
});
