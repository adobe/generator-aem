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
import crypto from 'node:crypto';
import tempDirectory from 'temp-dir';

import _ from 'lodash';

import test from 'ava';
import helpers from 'yeoman-test';
import sinon from 'sinon/pkg/sinon-esm.js';
import nock from 'nock';

import ModuleMixins from '../../../lib/module-mixins.js';
import { generatorName as bundleGeneratorName } from '../../../generators/bundle/index.js';
import { generatorName as appsGeneratorName } from '../../../generators/package-apps/index.js';
import { generatorName as contentGeneratorName } from '../../../generators/package-content/index.js';
import { generatorName as allGeneratorName } from '../../../generators/package-all/index.js';

import { generatorPath, fixturePath } from '../../fixtures/helpers.js';
import { init, config, writeInstall } from '../../fixtures/generators/wrappers.js';

import CoreComponentMixinGenerator from '../../../generators/mixin-cc/index.js';
import BundleModuleCoreComponentMixin from '../../../generators/mixin-cc/bundle/index.js';
import AppsPackageModuleCoreComponentMixin from '../../../generators/mixin-cc/apps/index.js';
import ContentPackageModuleCoreComponentMixin from '../../../generators/mixin-cc/content/index.js';
import AllPackageModuleCoreComponentMixin from '../../../generators/mixin-cc/all/index.js';

const resolved = generatorPath('mixin-cc', 'index.js');
const CCInit = init(CoreComponentMixinGenerator, resolved);
const CCConfig = config(CoreComponentMixinGenerator, resolved);
const CCWriteInstall = writeInstall(CoreComponentMixinGenerator, resolved);

class CCPrompt extends CoreComponentMixinGenerator {
  constructor(args, options, features) {
    super(args, options, features);
    this.props = this.options.props || {};
    this.options = this.options || {};
    this.availableBundles = this.options.availableBundles || [];
    this.availableApps = this.options.availableApps || [];
    this.availableContents = this.options.availableContents || [];

    this.prompt = function (prompts) {
      this.prompts = prompts;
      return new Promise((resolve) => {
        resolve({});
      });
    };
  }

  prompting() {
    return super.prompting();
  }
}

test('initializing - no yorc found - errors', async (t) => {
  t.plan(2);

  const error = await t.throwsAsync(helpers.create(CCInit).run());
  t.regex(error.message, /Generator cannot be use outside existing project context./, 'Error message was correct.');
});

test('initializing - no parent yorc found - errors', async (t) => {
  t.plan(2);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'ui.apps');

  const error = await t.throwsAsync(
    helpers
      .create(CCInit)
      .inDir(fullPath, () => {
        fs.writeFileSync(path.join(fullPath, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:package-apps': { artifactId: 'test.ui.apps' } }));
      })
      .run()
  );
  t.regex(error.message, /Generator cannot be use outside existing project context./, 'Error message was correct.');
});

test.serial('initializing - no apps package - errors', async (t) => {
  t.plan(2);
  sinon.restore();
  const stub = sinon.stub(ModuleMixins, '_findModules');
  stub.withArgs(bundleGeneratorName).returns([]);
  stub.withArgs(appsGeneratorName).returns([]);
  stub.withArgs(contentGeneratorName).returns([]);

  const error = await t.throwsAsync(
    helpers
      .create(CCInit)
      .inTmpDir((dir) => {
        fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));
      })
      .run()
      .then(() => {
        stub.restore();
      })
  );

  t.regex(error.message, /Project must have at least one UI Apps module to use Core Component mixin\./);
});

test.serial('initializing - no options', async (t) => {
  t.plan(1);

  sinon.restore();
  const stub = sinon.stub(ModuleMixins, '_findModules');
  stub.withArgs(bundleGeneratorName).returns([{ path: 'core', artifactId: 'test.core' }]);
  stub.withArgs(appsGeneratorName).returns([{ path: 'ui.apps', artifactId: 'test.ui.apps' }]);
  stub.withArgs(contentGeneratorName).returns([{ path: 'ui.content', artifactId: 'test.ui.content' }]);

  await helpers
    .create(CCInit)
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        bundles: [],
        apps: [],
        contents: [],
      };
      t.deepEqual(result.generator.props, expected, 'Properties Set');
    });
});

test.serial('initializing - defaults', async (t) => {
  t.plan(1);
  sinon.restore();
  const stub = sinon.stub(ModuleMixins, '_findModules');
  stub.withArgs(bundleGeneratorName).returns([{ path: 'core', artifactId: 'test.core' }]);
  stub.withArgs(appsGeneratorName).returns([{ path: 'ui.apps', artifactId: 'test.ui.apps' }]);
  stub.withArgs(contentGeneratorName).returns([{ path: 'ui.content', artifactId: 'test.ui.content' }]);

  await helpers
    .create(CCInit)
    .withOptions({ defaults: true })
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        version: 'latest',
        bundles: [],
        apps: [],
        contents: [],
        dataLayer: true,
      };
      t.deepEqual(result.generator.props, expected, 'Properties Set');
    });
});

test.serial('initializing - options', async (t) => {
  t.plan(1);
  sinon.restore();
  const stub = sinon.stub(ModuleMixins, '_findModules');
  stub.withArgs(bundleGeneratorName).returns([{ path: 'core', artifactId: 'test.core' }]);
  stub.withArgs(appsGeneratorName).returns([{ path: 'ui.apps', artifactId: 'test.ui.apps' }]);
  stub.withArgs(contentGeneratorName).returns([{ path: 'ui.content', artifactId: 'test.ui.content' }]);

  await helpers
    .create(CCInit)
    .withOptions({ examples: true, version: '2.3.22', dataLayer: true, bundlePath: 'core', appsPath: 'ui.apps', contentPath: 'ui.content' })
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        examples: true,
        version: '2.3.22',
        dataLayer: true,
        bundles: ['core'],
        apps: ['ui.apps'],
        contents: ['ui.content'],
      };
      t.deepEqual(result.generator.props, expected, 'Properties Set');
    });
});

test.serial('initializing - merges from config - no options/props', async (t) => {
  t.plan(1);
  sinon.restore();
  const stub = sinon.stub(ModuleMixins, '_findModules');
  stub.withArgs(bundleGeneratorName).returns([{ path: 'core', artifactId: 'test.core' }]);
  stub.withArgs(appsGeneratorName).returns([{ path: 'ui.apps', artifactId: 'test.ui.apps' }]);
  stub.withArgs(contentGeneratorName).returns([{ path: 'ui.content', artifactId: 'test.ui.content' }]);
  await helpers
    .create(CCInit)
    .inTmpDir((dir) => {
      fs.writeFileSync(
        path.join(dir, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem': {},
          '@adobe/generator-aem:mixin-cc': {
            version: '1.2.33',
            bundles: ['bundle'],
            apps: ['ui.apps.other'],
            contents: ['ui.content.other'],
          },
        })
      );
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        version: '1.2.33',
        bundles: ['bundle'],
        apps: ['ui.apps.other'],
        contents: ['ui.content.other'],
      };
      t.deepEqual(result.generator.props, expected, 'Properties Set');
    });
});

test.serial('initializing - merges from config - passed refs', async (t) => {
  t.plan(1);
  sinon.restore();
  const stub = sinon.stub(ModuleMixins, '_findModules');
  stub.withArgs(bundleGeneratorName).returns([{ path: 'core', artifactId: 'test.core' }]);
  stub.withArgs(appsGeneratorName).returns([{ path: 'ui.apps', artifactId: 'test.ui.apps' }]);
  stub.withArgs(contentGeneratorName).returns([{ path: 'ui.content', artifactId: 'test.ui.content' }]);
  await helpers
    .create(CCInit)
    .withOptions({ version: '2.3.22', bundlePath: 'core', appsPath: 'ui.apps', contentPath: 'ui.content' })
    .inTmpDir((dir) => {
      fs.writeFileSync(
        path.join(dir, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem': {},
          '@adobe/generator-aem:mixin-cc': {
            version: '1.2.33',
            dataLayer: true,
            bundles: ['bundle'],
            apps: ['ui.apps.other'],
            contents: ['ui.content.other'],
          },
        })
      );
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        version: '2.3.22',
        dataLayer: true,
        bundles: ['core', 'bundle'],
        apps: ['ui.apps', 'ui.apps.other'],
        contents: ['ui.content', 'ui.content.other'],
      };
      t.deepEqual(result.generator.props, expected, 'Properties Set');
    });
});

test.serial('initializing - finds all available modules', async (t) => {
  t.plan(3);

  sinon.restore();
  const stub = sinon.stub(ModuleMixins, '_findModules');
  const bundles = [
    { path: 'core', artifactId: 'test.core' },
    { path: 'bundle', artifactId: 'test.bundle' },
  ];
  const apps = [
    { path: 'ui.apps', artifactId: 'test.ui.apps' },
    { path: 'ui.apps.other', artifactId: 'test.ui.apps.other' },
  ];
  const contents = [[{ path: 'ui.content', artifactId: 'test.ui.content' }][{ path: 'ui.content.other', artifactId: 'test.ui.content.other' }]];

  stub.withArgs(bundleGeneratorName).returns(bundles);
  stub.withArgs(appsGeneratorName).returns(apps);
  stub.withArgs(contentGeneratorName).returns(contents);

  await helpers
    .create(CCInit)
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));
    })
    .run()
    .then((result) => {
      stub.restore();
      t.deepEqual(result.generator.availableBundles, bundles, 'Available Bundles set.');
      t.deepEqual(result.generator.availableApps, apps, 'Available App packages set.');
      t.deepEqual(result.generator.availableContents, contents, 'Available Content packages set.');
    });
});

test('prompting - examples - default not set', async (t) => {
  t.plan(2);

  await helpers
    .create(CCPrompt)
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'examples' });
      t.false(prompt.default, 'Example default false');
      t.true(await prompt.when(), 'Example prompts');
    });
});

test('prompting - examples - defaults set', async (t) => {
  t.plan(2);

  await helpers
    .create(CCPrompt)
    .withOptions({ defaults: true })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'examples' });
      t.false(prompt.default, 'Example default false');
      t.false(await prompt.when(), 'Example does not prompt');
    });
});

test('prompting - examples - examples set', async (t) => {
  t.plan(2);

  await helpers
    .create(CCPrompt)
    .withOptions({ props: { examples: true } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'examples' });
      t.false(prompt.default, 'Example default false');
      t.false(await prompt.when(), 'Example does not prompt');
    });
});

test('prompting - latest - default set', async (t) => {
  t.plan(2);

  await helpers
    .create(CCPrompt)
    .withOptions({ defaults: true })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'latest' });
      t.false(await prompt.when(), 'Latest does not prompt');
      t.true(prompt.default, 'Latest default true');
    });
});

test('prompting - latest - property set', async (t) => {
  t.plan(2);

  await helpers
    .create(CCPrompt)
    .withOptions({ props: { version: '2.1.33' } })
    .run()
    .then(async (result) => {
      result.generator.props.version = '2.1.33';
      const prompt = _.find(result.generator.prompts, { name: 'latest' });
      t.false(await prompt.when(), 'Latest does not prompt');
      t.true(prompt.default, 'Latest default true');
    });
});

test('prompting - latest - nothing set', async (t) => {
  t.plan(2);

  await helpers
    .create(CCPrompt)
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'latest' });
      t.true(await prompt.when(), 'Latest prompts');
      t.true(prompt.default, 'Latest default true');
    });
});

test('prompting - version - latest wanted', async (t) => {
  t.plan(1);

  await helpers
    .create(CCPrompt)
    .withOptions({ defaults: true })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'ccVersion' });
      t.false(await prompt.when({ latest: true }), 'Version does not prompt');
    });
});

test.serial('prompting - version - specific version wanted', async (t) => {
  t.plan(2);
  sinon.restore();
  const versions = ['1.2', '2.3', '2.20'];
  const stub = sinon.stub(CoreComponentMixinGenerator.prototype, '_listVersions');
  stub.resolves(versions);

  await helpers
    .create(CCPrompt)
    .run()
    .then(async (result) => {
      stub.restore();
      const prompt = _.find(result.generator.prompts, { name: 'ccVersion' });
      t.true(await prompt.when({ latest: false }), 'Version prompts');
      t.deepEqual(await prompt.choices(), versions, 'List was correct.');
    });
});

test('prompting - dataLayer - default not set', async (t) => {
  t.plan(2);

  await helpers
    .create(CCPrompt)
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'dataLayer' });
      t.true(prompt.default, 'Data Layer default false');
      t.true(await prompt.when(), 'Data Layer prompts');
    });
});

test('prompting - dataLayer - defaults set', async (t) => {
  t.plan(1);

  await helpers
    .create(CCPrompt)
    .withOptions({ defaults: true })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'dataLayer' });
      t.false(await prompt.when(), 'Data Layer does not prompt');
    });
});

test('prompting - dataLayer - dataLayer set', async (t) => {
  t.plan(1);

  await helpers
    .create(CCPrompt)
    .withOptions({ props: { dataLayer: false } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'dataLayer' });
      t.false(await prompt.when(), 'Data Layer does not prompt');
    });
});

test('prompting - bundles', async (t) => {
  t.plan(5);

  const availableBundles = [
    { path: 'core', artifactId: 'test.core' },
    { path: 'bundle', artifactId: 'test.bundle' },
  ];

  await helpers
    .create(CCPrompt)
    .withOptions({ props: { bundles: [] } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'bundles' });
      t.false(await prompt.when(), 'Bundles does not prompt');

      result.generator.props.bundles = ['core'];
      result.generator.availableBundles = availableBundles;
      t.true(await prompt.when(), 'Bundles prompts');
      t.deepEqual(await prompt.choices(), ['core', 'bundle'], 'Choices match.');

      result.generator.props.bundles = ['core', 'bundle'];
      t.false(await prompt.when(), 'Bundles does not prompt');
      t.deepEqual(await prompt.choices(), ['core', 'bundle'], 'Choices match.');
    });
});

test('prompting - apps', async (t) => {
  t.plan(10);
  const apps = [
    { path: 'ui.apps', artifactId: 'test.ui.apps' },
    { path: 'ui.apps.other', artifactId: 'test.ui.apps.other' },
  ];
  await helpers
    .create(CCPrompt)
    .withOptions({ props: { apps: [] } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'apps' });
      t.false(await prompt.when(), 'Apps does not prompt');

      result.generator.props.apps = ['ui.apps'];
      result.generator.availableApps = apps;
      t.true(await prompt.when(), 'Apps prompts');
      t.deepEqual(await prompt.default(), ['ui.apps'], 'Correct default list set.');
      t.deepEqual(await prompt.choices(), ['ui.apps', 'ui.apps.other'], 'Choices match.');

      result.generator.props.apps = ['ui.apps', 'ui.apps.other'];
      t.false(await prompt.when(), 'Apps prompts');
      t.deepEqual(await prompt.default(), ['ui.apps', 'ui.apps.other'], 'Correct default list set.');
      t.deepEqual(await prompt.choices(), ['ui.apps', 'ui.apps.other'], 'Choices match.');

      t.is(await prompt.validate(), 'At least one Apps module reference must be provided.', 'Message correct.');
      t.is(await prompt.validate([]), 'At least one Apps module reference must be provided.', 'Message correct.');
      t.is(await prompt.validate(['ui.apps']), true);
    });
});

test('prompting - contents', async (t) => {
  t.plan(8);
  const contents = [
    { path: 'ui.content', artifactId: 'test.ui.content' },
    { path: 'ui.content.other', artifactId: 'test.ui.content.other' },
  ];

  await helpers
    .create(CCPrompt)
    .withOptions({ props: { contents: [] } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'contents' });
      // Data Layer
      t.false(await prompt.when({ dataLayer: false }), 'Contents does not prompt');
      result.generator.props.dataLayer = false;
      t.false(await prompt.when({}), 'Contents does not prompt');

      result.generator.props.dataLayer = true;
      result.generator.props.contents = ['ui.content'];
      result.generator.availableContents = contents;
      t.true(await prompt.when({}), 'Contents prompts.');
      t.deepEqual(await prompt.default(), ['ui.content'], 'Correct default list set.');
      t.deepEqual(await prompt.choices(), ['ui.content', 'ui.content.other'], 'Choices match.');

      result.generator.props.contents = ['ui.content', 'ui.content.other'];
      t.false(await prompt.when({}), 'Content prompts');
      t.deepEqual(await prompt.default(), ['ui.content', 'ui.content.other'], 'Correct default list set.');
      t.deepEqual(await prompt.choices(), ['ui.content', 'ui.content.other'], 'Choices match.');
    });
});

test('prompting - post process answers', async (t) => {
  t.plan(1);

  class Mock extends CoreComponentMixinGenerator {
    constructor(args, options, features) {
      super(args, options, features);
      this.props = {
        version: undefined,
        bundles: [],
        apps: [],
        contents: [],
      };
      this.options = {};
      this.availableBundles = [
        { path: 'core', artifactId: 'test.core' },
        { path: 'bundle', artifactId: 'test.bundle' },
      ];
      this.availableApps = [
        { path: 'ui.apps', artifactId: 'test.ui.apps' },
        { path: 'ui.apps.other', artifactId: 'test.ui.apps.other' },
      ];
      this.availableContents = [
        { path: 'ui.content', artifactId: 'test.ui.content' },
        { path: 'ui.content.other', artifactId: 'test.ui.content.other' },
      ];
    }

    prompting() {
      return super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .withPrompts({
      examples: true,
      dataLayer: false,
      latest: true,
      bundles: [],
      apps: ['ui.apps'],
      contents: [],
    })
    .run()
    .then((result) => {
      const expected = {
        examples: true,
        dataLayer: false,
        version: 'latest',
        bundles: [],
        apps: ['ui.apps'],
        contents: [],
      };
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test.serial('prompting - post process answers - more selected', async (t) => {
  t.plan(1);

  sinon.restore();
  const versions = ['1.2', '2.3', '2.20'];
  const stub = sinon.stub(CoreComponentMixinGenerator.prototype, '_listVersions');
  stub.resolves(versions);

  class Mock extends CoreComponentMixinGenerator {
    constructor(args, options, features) {
      super(args, options, features);
      this.props = {
        version: undefined,
        bundles: [],
        apps: [],
        contents: [],
      };
      this.options = {};
      this.availableBundles = [
        { path: 'core', artifactId: 'test.core' },
        { path: 'bundle', artifactId: 'test.bundle' },
      ];
      this.availableApps = [
        { path: 'ui.apps', artifactId: 'test.ui.apps' },
        { path: 'ui.apps.other', artifactId: 'test.ui.apps.other' },
      ];
      this.availableContents = [
        { path: 'ui.content', artifactId: 'test.ui.content' },
        { path: 'ui.content.other', artifactId: 'test.ui.content.other' },
      ];
    }

    prompting() {
      return super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .withPrompts({
      latest: false,
      ccVersion: '2.20',
      bundles: ['core', 'bundle'],
      apps: ['ui.apps', 'ui.apps.other'],
      contents: ['ui.content', 'ui.content.other'],
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        examples: false,
        dataLayer: true,
        version: '2.20',
        bundles: ['core', 'bundle'],
        apps: ['ui.apps', 'ui.apps.other'],
        contents: ['ui.content', 'ui.content.other'],
      };
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('configuring', async (t) => {
  t.plan(2);

  const expected = { config: 'to be saved' };
  await helpers
    .create(CCConfig)
    .withOptions({ props: expected })
    .inTmpDir((dir) => {
      fs.writeFileSync(
        path.join(dir, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem': expected,
          '@adobe/generator-aem:mixin-cc': expected,
        })
      );
    })
    .run()
    .then((result) => {
      const yorc = result.generator.fs.readJSON(result.generator.destinationPath('.yo-rc.json'));
      t.deepEqual(yorc['@adobe/generator-aem:mixin-cc'], expected, 'Saved Core Component Config');
      t.deepEqual(yorc['@adobe/generator-aem'], expected, 'Did not edit primary module config.');
    });
});

test.serial('default - compose with - no bundles - v6.5', async (t) => {
  t.plan(4);
  sinon.restore();
  const resolveVersion = sinon.stub(CoreComponentMixinGenerator.prototype, '_resolveVersion');
  resolveVersion.resolves('2.20.2');

  const composed = [];

  class Mock extends CoreComponentMixinGenerator {
    constructor(args, options, features) {
      super(args, options, features);
      this.props = options.props;

      this.composeWith = function (generator, options) {
        composed.push({
          generator,
          options,
        });
      };
    }

    default() {
      super.default();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({
      props: {
        examples: true,
        dataLayer: true,
        apps: ['ui.apps', 'ui.apps.other'],
        contents: ['ui.content'],
      },
    })
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': { aemVersion: '6.5' } }));
    })
    .run();

  resolveVersion.restore();

  t.is(composed.length, 3, 'Correct number of calls');
  t.deepEqual(
    composed[0],
    {
      generator: {
        Generator: AppsPackageModuleCoreComponentMixin,
        path: generatorPath('mixin-cc', 'apps', 'index.js'),
      },
      options: {
        generateInto: 'ui.apps',
        aemVersion: '6.5',
        version: '2.20.2',
      },
    },
    'Parameters correct'
  );
  t.deepEqual(
    composed[1],
    {
      generator: {
        Generator: AppsPackageModuleCoreComponentMixin,
        path: generatorPath('mixin-cc', 'apps', 'index.js'),
      },
      options: {
        generateInto: 'ui.apps.other',
        aemVersion: '6.5',
        version: '2.20.2',
      },
    },
    'Parameters correct'
  );
  t.deepEqual(
    composed[2],
    {
      generator: {
        Generator: ContentPackageModuleCoreComponentMixin,
        path: generatorPath('mixin-cc', 'content', 'index.js'),
      },
      options: {
        generateInto: 'ui.content',
        dataLayer: true,
      },
    },
    'Parameters correct'
  );
});

test.serial('default - compose with - bundles - cloud', async (t) => {
  t.plan(4);
  sinon.restore();
  const findModules = sinon.stub(ModuleMixins, '_findModules');
  findModules.withArgs(allGeneratorName).returns([{ path: 'all', artifactId: 'test.all' }]);
  const resolveVersion = sinon.stub(CoreComponentMixinGenerator.prototype, '_resolveVersion');
  resolveVersion.resolves('2.20.2');

  const composed = [];

  class Mock extends CoreComponentMixinGenerator {
    constructor(args, options, features) {
      super(args, options, features);
      this.props = options.props;

      this.composeWith = function (generator, options) {
        composed.push({
          generator,
          options,
        });
      };
    }

    default() {
      super.default();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({
      props: {
        bundles: ['core'],
        apps: ['ui.apps'],
      },
    })
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': { aemVersion: 'cloud' } }));
    })
    .run();
  findModules.restore();
  resolveVersion.restore();

  t.is(composed.length, 3, 'Correct number of calls');
  t.deepEqual(
    composed[0],
    {
      generator: {
        Generator: BundleModuleCoreComponentMixin,
        path: generatorPath('mixin-cc', 'bundle', 'index.js'),
      },
      options: {
        generateInto: 'core',
        aemVersion: 'cloud',
      },
    },
    'Parameters correct'
  );
  t.deepEqual(
    composed[1],
    {
      generator: {
        Generator: AppsPackageModuleCoreComponentMixin,
        path: generatorPath('mixin-cc', 'apps', 'index.js'),
      },
      options: {
        generateInto: 'ui.apps',
        aemVersion: 'cloud',
        version: '2.20.2',
      },
    },
    'Parameters correct'
  );
  t.deepEqual(
    composed[2],
    {
      generator: {
        Generator: AllPackageModuleCoreComponentMixin,
        path: generatorPath('mixin-cc', 'all', 'index.js'),
      },
      options: {
        generateInto: 'all',
        aemVersion: 'cloud',
      },
    },
    'Parameters correct'
  );
});

test('writing/installing - cloud - latest - examples', async () => {
  await helpers
    .create(CCWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: { examples: true, aemVersion: 'cloud', resolvedVersion: '2.20.2' },
    })
    .inTmpDir((dir) => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(dir, 'pom.xml'));
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': { aemVersion: 'cloud' } }));
    })
    .run()
    .then((result) => {
      result.assertFileContent('pom.xml', /core.wcm.components.version>2\.20\.2/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.core<\/artifactId>/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.testing\.aem-mock-plugin<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>core\.wcm\.components\.content<\/artifactId>\s+<type>zip<\/type>/);
      result.assertNoFileContent('pom.xml', /<artifactId>core\.wcm\.components\.config<\/artifactId>\s+<type>zip<\/type>/);

      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.examples.ui.config<\/artifactId>\s+<version>\${core.wcm.components.version}<\/version>\s+<type>zip<\/type>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.examples.ui.apps<\/artifactId>\s+<version>\${core.wcm.components.version}<\/version>\s+<type>zip<\/type>/);
      result.assertFileContent('pom.xml', /core\.wcm\.components\.examples.ui.content<\/artifactId>\s+<version>\${core.wcm.components.version}<\/version>\s+<type>zip<\/type>/);
    });
});

test('writing/installing - 6.5 - older cc version', async () => {
  await helpers
    .create(CCWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: { aemVersion: '6.5', resolvedVersion: '2.18.6' },
    })
    .inTmpDir((dir) => {
      fs.copyFileSync(fixturePath('projects', 'cloud', 'pom.xml'), path.join(dir, 'pom.xml'));
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': { aemVersion: '6.5' } }));
    })
    .run()
    .then((result) => {
      result.assertFileContent('pom.xml', /core.wcm.components.version>2\.18\.6/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.core<\/artifactId>/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.content<\/artifactId>\s+<version>\${core.wcm.components.version}<\/version>\s+<type>zip<\/type>/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.config<\/artifactId>\s+<version>\${core.wcm.components.version}<\/version>\s+<type>zip<\/type>/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.testing\.aem-mock-plugin<\/artifactId>/);
      result.assertNoFileContent('pom.xml', /<artifactId>core\.wcm\.components\.examples.ui.config<\/artifactId>\s+<version>\${core.wcm.components.version}<\/version>\s+<type>zip<\/type>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.examples.ui.apps<\/artifactId>\s+<version>\${core.wcm.components.version}<\/version>\s+<type>zip<\/type>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.examples.ui.content<\/artifactId>\s+<version>\${core.wcm.components.version}<\/version>\s+<type>zip<\/type>/);
    });
});

test('_listVersions', async (t) => {
  t.plan(1);

  class Mock extends CoreComponentMixinGenerator {
    constructor(args, options, features) {
      super(args, options, features);
      this.resolved = generatorPath('mixin-cc', 'index.js');
    }

    default() {
      // Does nothing
    }
  }

  await helpers
    .create(Mock)
    .run()
    .then(async (result) => {
      const versions = await result.generator._listVersions();
      t.deepEqual(versions, ['2.20', '2.19', '2.18'], 'List was correct');
    });
});

test.serial('_resolveVersion - latest', async (t) => {
  /* eslint-disable camelcase */
  nock('https://api.github.com')
    .get('/repos/adobe/aem-core-wcm-components/releases')
    .reply(200, [
      { tag_name: 'core-wcm-components-reactor-2.20.8' },
      { tag_name: 'core-wcm-components-reactor-2.20.6' },
      { tag_name: 'core-wcm-components-reactor-2.20.4' },
      { tag_name: 'core-wcm-components-reactor-2.20.2' },
      { tag_name: 'core-wcm-components-reactor-2.20.0' },
      { tag_name: 'core-wcm-components-reactor-2.19.2' },
      { tag_name: 'core-wcm-components-reactor-2.19.0' },
      { tag_name: 'core-wcm-components-reactor-2.18.6' },
      { tag_name: 'core-wcm-components-reactor-2.18.4' },
      { tag_name: 'core-wcm-components-reactor-2.18.2' },
      { tag_name: 'core-wcm-components-reactor-2.18.0' },
    ]);

  /* eslint-enable camelcase */
  class Mock extends CoreComponentMixinGenerator {
    constructor(args, options, features) {
      super(args, options, features);
      this.props = {
        version: 'latest',
      };
    }

    default() {
      // Does nothing
    }

    _listVersions() {
      return new Promise((resolve) => {
        resolve(['2.20']);
      });
    }
  }

  await helpers
    .create(Mock)
    .run()
    .then(async (result) => {
      const version = await result.generator._resolveVersion();
      t.is(version, '2.20.8', 'Version was correct');
    });

  nock.cleanAll();
  nock.enableNetConnect();
});

test.serial('_resolveVersion - specific version', async (t) => {
  /* eslint-disable camelcase */
  nock('https://api.github.com')
    .get('/repos/adobe/aem-core-wcm-components/releases')
    .reply(200, [
      { tag_name: 'core-wcm-components-reactor-2.20.8' },
      { tag_name: 'core-wcm-components-reactor-2.20.6' },
      { tag_name: 'core-wcm-components-reactor-2.20.4' },
      { tag_name: 'core-wcm-components-reactor-2.20.2' },
      { tag_name: 'core-wcm-components-reactor-2.20.0' },
      { tag_name: 'core-wcm-components-reactor-2.19.2' },
      { tag_name: 'core-wcm-components-reactor-2.19.0' },
      { tag_name: 'core-wcm-components-reactor-2.18.6' },
      { tag_name: 'core-wcm-components-reactor-2.18.4' },
      { tag_name: 'core-wcm-components-reactor-2.18.2' },
      { tag_name: 'core-wcm-components-reactor-2.18.0' },
    ]);

  /* eslint-enable camelcase */
  class Mock extends CoreComponentMixinGenerator {
    constructor(args, options, features) {
      super(args, options, features);
      this.props = {
        version: '2.18',
      };
    }

    default() {
      // Does nothing
    }
  }

  await helpers
    .create(Mock)
    .run()
    .then(async (result) => {
      const version = await result.generator._resolveVersion();
      t.is(version, '2.18.6', 'Version was correct');
    });

  nock.cleanAll();
  nock.enableNetConnect();
});
