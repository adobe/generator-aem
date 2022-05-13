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

import _ from 'lodash';
import { fixturePath } from '../../fixtures/helpers.js';
import ModuleMixins from '../../../lib/module-mixins.js';

test('finds files', (t) => {
  t.plan(3);
  const generator = {
    relativePath: 'output',
    templatePath: fixturePath,
    destinationPath: fixturePath,
  };

  const filenames = ['.gitignore', 'sdk-api-metadata.xml', 'uber-jar-metadata.xml'];

  const files = ModuleMixins._listTemplates.call(generator, 'files');

  _.each(filenames, (name) => {
    const entry = _.find(files, { src: fixturePath('files', name) });
    t.is(entry.dest, fixturePath('output', name));
  });
});
