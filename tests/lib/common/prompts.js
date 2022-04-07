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

test('examples - default not set', async (t) => {
  t.plan(2);

  const generator = {};

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'examples' });
  t.false(prompt.default, 'Example default true');
  t.true(await prompt.when(), 'Example prompts');
});

test('examples - defaults set', async (t) => {
  t.plan(2);

  const generator = { props: { defaults: true } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'examples' });
  t.false(prompt.default, 'Example default true');
  t.false(await prompt.when(), 'Example does not prompt');
});

test('examples - examples set', async (t) => {
  t.plan(2);

  const generator = { props: { examples: true } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'examples' });
  t.false(prompt.default, 'Example default true');
  t.false(await prompt.when(), 'Example does not prompt');
});

test('name - not specified', async (t) => {
  t.plan(3);

  const generator = {};

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'name' });
  t.true(prompt.when, 'Name prompts');
  t.is(await prompt.validate(), 'Name must be provided.', 'Validate no name.');
  t.is(await prompt.validate(''), 'Name must be provided.', 'Validate blank name');
});

test('name - specified', async (t) => {
  t.plan(2);

  const generator = { props: { name: 'MySite' } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'name' });
  t.false(prompt.when, 'Name does not prompt');
  t.is(await prompt.validate('My Site'), true, 'Validate name.');
});

test('appId - not specified', async (t) => {
  t.plan(3);

  const generator = {};

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'appId' });
  t.true(prompt.when, 'appId prompts');
  t.is(await prompt.validate(), 'AppId must be provided.', 'Validate no appId.');
  t.is(await prompt.validate(''), 'AppId must be provided.', 'Validate blank appId');
});

test('appId - specified', async (t) => {
  t.plan(2);

  const generator = { props: { appId: 'AppId' } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'appId' });
  t.false(prompt.when, 'appId does not prompt');
  t.is(await prompt.validate('mysite'), true, 'Validate appId.');
});

test('artifactId - not specified', async (t) => {
  t.plan(3);

  const generator = {};

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.true(await prompt.when(), 'artifactId prompts');
  t.is(await prompt.validate(), 'ArtifactId must be provided.', 'Validate no artifactId.');
  t.is(await prompt.validate(''), 'ArtifactId must be provided.', 'Validate blank artifactId');
});

test('artifactId - specified', async (t) => {
  t.plan(3);

  const generator = { props: { artifactId: 'ArtifactId' } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.false(await prompt.when(), 'artifactId does not prompt');
  t.is(await prompt.validate('Not/Allowed'), 'ArtifactId must only contain letters or periods (.).', 'Validate invalid artifactId.');
  t.true(await prompt.validate('mysite'), 'Validate artifactId');
});

test('artifactId - defaults set', async (t) => {
  t.plan(1);

  const generator = { props: { defaults: true } };

  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.false(await prompt.when(), 'artifactId does not prompt');
});

test('artifactId - default - appId answered', async (t) => {
  t.plan(1);

  const generator = {};
  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.is(await prompt.default({ appId: 'answer' }), 'answer', 'Default uses AppId answer');
});

test('artifactId - default - property fallback', async (t) => {
  t.plan(1);

  const generator = { props: { appId: 'property' } };
  const prompts = GeneratorCommons.prompts(generator);

  const prompt = _.find(prompts, { name: 'artifactId' });
  t.is(await prompt.default({ appId: 'property' }), 'property', 'Default uses AppId answer');
});

test('artifactId - default - module generate folder appended', async (t) => {
  t.plan(2);

  const generator = { options: { generateInto: 'module' } };
  let prompts = GeneratorCommons.prompts(generator);

  let prompt = _.find(prompts, { name: 'artifactId' });
  t.is(await prompt.default({ appId: 'answer' }), 'answer.module', 'Answer & Generate Into default');

  generator.props = { appId: 'property' };
  prompts = GeneratorCommons.prompts(generator);
  prompt = _.find(prompts, { name: 'artifactId' });
  t.is(await prompt.default({}), 'property.module', 'Property & Generate Into default');
});

test('processAnswers - defaults', (t) => {
  t.plan(1);
  const generator = { props: { defaults: true } };
  const answers = { appId: 'defaults' };
  GeneratorCommons.processAnswers(generator, answers);
  t.is(answers.artifactId, 'defaults', 'Defaults artifactId');
});

test('processAnswers - defaults - appId from properties', (t) => {
  t.plan(1);
  const generator = { props: { defaults: true, appId: 'appId' } };
  const answers = {};
  GeneratorCommons.processAnswers(generator, answers);
  t.is(answers.artifactId, 'appId', 'Defaults artifactId');
});

test('processAnswers - defaults - generateInto', (t) => {
  t.plan(1);
  const generator = { props: { defaults: true }, options: { generateInto: 'generateInto' } };
  const answers = { appId: 'defaults' };
  GeneratorCommons.processAnswers(generator, answers);
  t.is(answers.artifactId, 'defaults.generateInto', 'Defaults artifactId');
});

test('processAnswers - defaults - appId from properties && generateInto', (t) => {
  t.plan(1);
  const generator = { props: { defaults: true, appId: 'appId' }, options: { generateInto: 'generateInto' } };
  const answers = {};
  GeneratorCommons.processAnswers(generator, answers);
  t.is(answers.artifactId, 'appId.generateInto', 'Defaults artifactId');
});
