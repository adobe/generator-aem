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

import _ from 'lodash';
import test from 'ava';

import GeneratorCommons from '../../../lib/common.js';

test('examples - default not set', (t) => {
  t.plan(2);

  const generator = {};

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'examples' });
  t.false(prompt.default, 'Example default true');
  t.true(prompt.when(), 'Example prompts');
});

test('examples - defaults set', (t) => {
  t.plan(2);

  const generator = { props: { defaults: true } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'examples' });
  t.false(prompt.default, 'Example default true');
  t.false(prompt.when(), 'Example does not prompt');
});

test('examples - examples set', (t) => {
  t.plan(2);

  const generator = { props: { examples: true } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'examples' });
  t.false(prompt.default, 'Example default true');
  t.false(prompt.when(), 'Example does not prompt');
});

test('name - not specified', (t) => {
  t.plan(1);

  const generator = {};

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'name' });
  t.true(prompt.when, 'Name prompts');
});

test('name - specified', (t) => {
  t.plan(1);

  const generator = { props: { name: 'MySite' } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'name' });
  t.false(prompt.when, 'Name does not prompt');
});

test('appId - not specified', (t) => {
  t.plan(1);

  const generator = {};

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'appId' });
  t.true(prompt.when, 'appId prompts');
});

test('appId - specified', (t) => {
  t.plan(1);

  const generator = { props: { appId: 'AppId' } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'appId' });
  t.false(prompt.when, 'appId does not prompt');
});

test('artifactId - not specified', (t) => {
  t.plan(1);

  const generator = {};

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.true(prompt.when(), 'artifactId prompts');
});

test('artifactId - specified', (t) => {
  t.plan(1);

  const generator = { props: { artifactId: 'ArtifactId' } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.false(prompt.when(), 'artifactId does not prompt');
});

test('artifactId - defaults set', (t) => {
  t.plan(1);

  const generator = { props: { defaults: true } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.false(prompt.when(), 'artifactId does not prompt');
});

test('artifactId - default - appId answered', (t) => {
  t.plan(1);

  const generator = {};
  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.is(prompt.default({ appId: 'answer' }), 'answer', 'Default uses AppId answer');
});

test('artifactId - default - property fallback', (t) => {
  t.plan(1);

  const generator = { props: { appId: 'property' } };
  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.is(prompt.default({ appId: 'property' }), 'property', 'Default uses AppId answer');
});

test('artifactId - default - module generate folder appended', (t) => {
  t.plan(2);

  const generator = { options: { generateInto: 'module' } };
  let prompts = GeneratorCommons.prompts(generator);

  let prompt = _.find(prompts, { name: 'artifactId' });
  t.is(prompt.default({ appId: 'answer' }), 'answer.module', 'Answer & Generate Into default');

  generator.props = { appId: 'property' };
  prompts = GeneratorCommons.prompts(generator);
  prompt = _.find(prompts, { name: 'artifactId' });
  t.is(prompt.default({}), 'property.module', 'Property & Generate Into default');
});
