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

import ModuleMixins from '../../../lib/module-mixins.js';

test('no existing config - no parent', (t) => {
  const generator = {
    relativePath: 'configuring',
    config: new Map(),
    props: {
      module: 'test',
    },
  };

  ModuleMixins._configuring.call(generator);
  t.deepEqual(generator.config.get('configuring'), { module: 'test' }, 'Saved Config');
});

test('config set - parent data', (t) => {
  const generator = {
    relativePath: 'configuring',
    config: new Map(),
    props: {
      module: 'test',
      parent: {
        groupId: 'com.adobe.test',
        artifactId: 'artifact',
      },
    },
  };

  ModuleMixins._configuring.call(generator);
  t.deepEqual(generator.config.get('configuring'), { module: 'test' }, 'Saved Config');
});
