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

import ModuleMixins from '../../../lib/module-mixins.js';

test('examples - default not set', async (t) => {
  t.plan(2);

  const generator = {
    options: {},
    props: {},
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'examples' });
      t.false(prompt.default, 'Example default true');
      t.true(await prompt.when(), 'Example prompts');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };

  await ModuleMixins._prompting.call(generator);
});

test('examples - defaults set', async (t) => {
  t.plan(2);

  const generator = {
    options: { defaults: true },
    props: {},
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'examples' });
      t.false(prompt.default, 'Example default true');
      t.false(await prompt.when(), 'Example does not prompt');

      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('examples - examples set', async (t) => {
  t.plan(2);

  const generator = {
    options: {},
    props: { examples: true },
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'examples' });
      t.false(prompt.default, 'Example default true');
      t.false(await prompt.when(), 'Example does not prompt');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('name - not specified', async (t) => {
  t.plan(3);

  const generator = {
    options: {},
    props: {},
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'name' });
      t.true(prompt.when, 'Name prompts');
      t.is(await prompt.validate(), 'Name must be provided.', 'Validate no name.');
      t.is(await prompt.validate(''), 'Name must be provided.', 'Validate blank name');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('name - specified', async (t) => {
  t.plan(2);

  const generator = {
    options: {},
    props: { name: 'MySite' },
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'name' });
      t.false(prompt.when, 'Name does not prompt');
      t.is(await prompt.validate('My Site'), true, 'Validate name.');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('appId - not specified', async (t) => {
  t.plan(3);

  const generator = {
    options: {},
    props: {},
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'appId' });
      t.true(prompt.when, 'appId prompts');
      t.is(await prompt.validate(), 'AppId must be provided.', 'Validate no appId.');
      t.is(await prompt.validate(''), 'AppId must be provided.', 'Validate blank appId');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('appId - specified', async (t) => {
  t.plan(2);

  const generator = {
    options: {},
    props: { appId: 'AppId' },
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'appId' });
      t.false(prompt.when, 'appId does not prompt');
      t.is(await prompt.validate('mysite'), true, 'Validate appId.');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('artifactId - not specified', async (t) => {
  t.plan(3);

  const generator = {
    options: {},
    props: {},
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'artifactId' });
      t.true(await prompt.when(), 'artifactId prompts');
      t.is(await prompt.validate(), 'ArtifactId must be provided.', 'Validate no artifactId.');
      t.is(await prompt.validate(''), 'ArtifactId must be provided.', 'Validate blank artifactId');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('artifactId - specified', async (t) => {
  t.plan(3);

  const generator = {
    options: {},
    props: { artifactId: 'ArtifactId' },
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'artifactId' });
      t.false(await prompt.when(), 'artifactId does not prompt');
      t.is(await prompt.validate('Not/Allowed'), 'ArtifactId must only contain letters, hyphens, or periods (.).', 'Validate invalid artifactId.');
      t.true(await prompt.validate('mysite'), 'Validate artifactId');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('artifactId - defaults set', async (t) => {
  t.plan(1);

  const generator = {
    options: { defaults: true },
    props: {},
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'artifactId' });
      t.false(await prompt.when(), 'artifactId does not prompt');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('artifactId - default - appId answered', async (t) => {
  t.plan(1);

  const generator = {
    options: {},
    props: {},
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'artifactId' });
      t.is(await prompt.default({ appId: 'answer' }), 'answer', 'Default uses AppId answer');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('artifactId - default - property fallback', async (t) => {
  t.plan(1);

  const generator = {
    options: {},
    props: { appId: 'property' },
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'artifactId' });
      t.is(await prompt.default({ appId: 'property' }), 'property', 'Default uses AppId answer');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
});

test('artifactId - default - module generate folder appended', async (t) => {
  t.plan(2);

  const generator = {
    options: { generateInto: 'module' },
    props: {},
    async prompt(prompts) {
      const prompt = _.find(prompts, { name: 'artifactId' });
      t.is(await prompt.default({ appId: 'answer' }), 'answer.module', 'Answer & Generate Into default');
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);

  generator.props = { appId: 'property' };
  generator.prompt = async function(prompts) {
    const prompt = _.find(prompts, { name: 'artifactId' });
    t.is(await prompt.default({}), 'property.module', 'Property & Generate Into default');
    return new Promise((resolve) => {
      resolve({});
    });
  };

  await ModuleMixins._prompting.call(generator);
});

test('processAnswers - defaults', async (t) => {
  t.plan(1);
  const answers = { appId: 'defaults' };

  const generator = {
    options: { defaults: true },
    props: {},
    async prompt() {
      return new Promise((resolve) => {
        resolve(answers);
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
  t.is(generator.props.artifactId, 'defaults', 'Defaults artifactId');
});

test('processAnswers - defaults - appId from properties', async (t) => {
  t.plan(1);
  const generator = {
    options: { defaults: true },
    props: { appId: 'appId' },
    async prompt() {
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
  t.is(generator.props.artifactId, 'appId', 'Defaults artifactId');
});

test('processAnswers - defaults - generateInto', async (t) => {
  t.plan(1);
  const answers = { appId: 'defaults' };
  const generator = {
    options: { defaults: true, generateInto: 'generateInto' },
    props: {},
    async prompt() {
      return new Promise((resolve) => {
        resolve(answers);
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
  t.is(generator.props.artifactId, 'defaults.generateInto', 'Defaults artifactId');
});

test('processAnswers - defaults - appId from properties && generateInto', async (t) => {
  t.plan(1);

  const generator = {
    options: { defaults: true, generateInto: 'generateInto' },
    props: { appId: 'appId' },
    async prompt() {
      return new Promise((resolve) => {
        resolve({});
      });
    },
  };
  await ModuleMixins._prompting.call(generator);
  t.is(generator.props.artifactId, 'appId.generateInto', 'Defaults artifactId');
});
