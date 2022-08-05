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
import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';

import ModuleMixins from '../../../lib/module-mixins.js';

const tplProps = {
  pathProperty: 'pathreplacement',
};

test.afterEach(() => {
  sinon.restore();
});

test('default options', (t) => {
  t.plan(5);

  const copyTplStub = sinon.stub();
  const generator = {
    fs: {
      copyTpl: copyTplStub,
    },
  };

  const templates = [
    {
      src: path.join('/', 'source', 'path', 'parent', '__pathProperty__', 'file'),
      dest: path.join('/', 'target', 'path', 'parent', '__pathProperty__', 'file'),
    },
  ];

  ModuleMixins._writing.call(generator, templates, tplProps);
  t.is(copyTplStub.callCount, 1, 'Stub Called correctly.');
  const [src, dest, props, options] = copyTplStub.getCall(0).args;
  t.is(path.join('/', 'source', 'path', 'parent', '__pathProperty__', 'file'), src, 'Source parameter correct.');
  t.is(path.join('/', 'target', 'path', 'parent', 'pathreplacement', 'file'), dest, 'Destination parameter correct');
  t.deepEqual(props, { pathProperty: 'pathreplacement' }, 'Property parameter correct.');
  t.deepEqual(options, { delimiter: '%' }, 'Options correct.');
});

test('custom delimiter', (t) => {
  t.plan(11);

  const copyTplStub = sinon.stub();
  const generator = {
    fs: {
      copyTpl: copyTplStub,
    },
  };

  const templates = [
    {
      src: path.join('/', 'source', 'path', 'parent', '__pathProperty__', 'file'),
      dest: path.join('/', 'target', 'path', 'parent', '__pathProperty__', 'file'),
    },
    {
      src: path.join('/', 'source', 'path', '__pathProperty__', 'file'),
      dest: path.join('/', 'target', 'path', '__pathProperty__', 'file'),
    },
    {
      src: path.join('/', 'source', 'path', 'notmodified', 'file'),
      dest: path.join('/', 'target', 'path', 'notmodified', 'file'),
    },
  ];

  ModuleMixins._writing.call(generator, templates, tplProps,{ delimiter: '$' });
  t.is(copyTplStub.callCount, 3, 'Stub Called correctly.');
  let [src, dest, props, options] = copyTplStub.getCall(0).args;
  t.is(path.join('/', 'source', 'path', 'parent', '__pathProperty__', 'file'), src, 'Source parameter correct.');
  t.is(path.join('/', 'target', 'path', 'parent', 'pathreplacement', 'file'), dest, 'Destination parameter correct');
  t.deepEqual(props, { pathProperty: 'pathreplacement' }, 'Property parameter correct.');
  t.deepEqual(options, { delimiter: '$' }, 'Options correct.');
  [src, dest, props, options] = copyTplStub.getCall(1).args;
  t.is(path.join('/', 'source', 'path', '__pathProperty__', 'file'), src, 'Source parameter correct.');
  t.is(path.join('/', 'target', 'path', 'pathreplacement', 'file'), dest, 'Destination parameter correct');
  t.deepEqual(props, { pathProperty: 'pathreplacement' }, 'Property parameter correct.');
  t.deepEqual(options, { delimiter: '$' }, 'Options correct.');
  [src, dest] = copyTplStub.getCall(2).args;
  t.is(path.join('/', 'source', 'path', 'notmodified', 'file'), src, 'Source parameter correct.');
  t.is(path.join('/', 'target', 'path', 'notmodified', 'file'), dest, 'Destination parameter correct');
});
