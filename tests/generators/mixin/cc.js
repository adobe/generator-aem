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

import { generatorPath, fixturePath } from '../../fixtures/helpers.js';
import { init, config, writeInstall } from '../../fixtures/generators/wrappers.js';

import CoreComponentMixinGenerator from '../../../generators/mixin-cc/index.js';
import BundleModuleCoreComponentMixin from '../../../generators/mixin-cc/bundle/index.js';
import AppsPackageModuleCoreComponentMixin from '../../../generators/mixin-cc/apps/index.js';
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

test('initializing - no apps package - errors', async (t) => {
  t.plan(2);
  sinon.restore();
  const stub = sinon.stub(ModuleMixins, '_findModules');
  stub.withArgs(bundleGeneratorName).returns([]);
  stub.withArgs(appsGeneratorName).returns([]);

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

  await helpers
    .create(CCInit)
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        version: undefined,
        bundles: [],
        apps: [],
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
        bundles: [],
        apps: [],
        version: 'latest',
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

  await helpers
    .create(CCInit)
    .withOptions({ bundlePath: 'core', appsPath: 'ui.apps', version: '2.3.22' })
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        bundles: ['core'],
        apps: ['ui.apps'],
        version: '2.3.22',
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
          },
        })
      );
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        bundles: ['bundle'],
        apps: ['ui.apps.other'],
        version: '1.2.33',
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
  await helpers
    .create(CCInit)
    .withOptions({ bundlePath: 'core', appsPath: 'ui.apps', version: '2.3.22' })
    .inTmpDir((dir) => {
      fs.writeFileSync(
        path.join(dir, '.yo-rc.json'),
        JSON.stringify({
          '@adobe/generator-aem': {},
          '@adobe/generator-aem:mixin-cc': {
            version: '1.2.33',
            bundles: ['bundle'],
            apps: ['ui.apps.other'],
          },
        })
      );
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        bundles: ['core', 'bundle'],
        apps: ['ui.apps', 'ui.apps.other'],
        version: '2.3.22',
      };
      t.deepEqual(result.generator.props, expected, 'Properties Set');
    });
});

test.serial('initializing - finds all available modules', async (t) => {
  t.plan(2);

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

  stub.withArgs(bundleGeneratorName).returns(bundles);
  stub.withArgs(appsGeneratorName).returns(apps);

  await helpers
    .create(CCInit)
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': {} }));
    })
    .run()
    .then((result) => {
      stub.restore();
      t.deepEqual(result.generator.availableBundles, bundles, 'Available Bundles set.');
      t.deepEqual(result.generator.availableApps, apps, 'Available Apps set.');
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

test('prompting - bundles - defaults set', async (t) => {
  t.plan(1);

  await helpers
    .create(CCPrompt)
    .withOptions({ defaults: true })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'bundles' });
      t.false(await prompt.when(), 'Bundle does not prompt');
    });
});

test('prompting - bundles - no bundle modules', async (t) => {
  t.plan(1);

  await helpers
    .create(CCPrompt)
    .withOptions({ props: { bundles: [] } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'bundles' });
      t.false(await prompt.when(), 'Bundles does not prompt');
    });
});

test('prompting - bundles - bundles prop populated', async (t) => {
  t.plan(1);

  await helpers
    .create(CCPrompt)
    .withOptions({ props: { bundles: ['core'] } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'bundles' });
      t.false(await prompt.when(), 'Bundles does not prompt');
    });
});

test('prompting - bundles - available modules', async (t) => {
  t.plan(2);
  const bundles = [
    { path: 'core', artifactId: 'test.core' },
    { path: 'bundle', artifactId: 'test.bundle' },
  ];
  await helpers
    .create(CCPrompt)
    .withOptions({ availableBundles: bundles, props: { bundles: [] } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'bundles' });
      t.true(await prompt.when(), 'Bundles prompts');
      t.deepEqual(await prompt.choices(), ['core', 'bundle'], 'Choices match.');
    });
});

test('prompting - apps - apps prop populated', async (t) => {
  t.plan(1);

  await helpers
    .create(CCPrompt)
    .withOptions({ props: { apps: ['ui.apps'] } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'apps' });
      t.false(await prompt.when(), 'Apps does not prompt');
    });
});

test('prompting - apps - available modules', async (t) => {
  t.plan(5);
  const apps = [
    { path: 'ui.apps', artifactId: 'test.ui.apps' },
    { path: 'ui.apps.other', artifactId: 'test.ui.apps.other' },
  ];
  await helpers
    .create(CCPrompt)
    .withOptions({ availableApps: apps, props: { apps: [] } })
    .run()
    .then(async (result) => {
      const prompt = _.find(result.generator.prompts, { name: 'apps' });
      t.true(await prompt.when(), 'Apps prompts');
      t.deepEqual(await prompt.choices(), ['ui.apps', 'ui.apps.other'], 'Choices match.');
      t.is(await prompt.validate(), 'At least one Apps module reference must be provided.', 'Message correct.');
      t.is(await prompt.validate([]), 'At least one Apps module reference must be provided.', 'Message correct.');
      t.is(await prompt.validate(['ui.apps']), true);
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
    }

    prompting() {
      return super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .withPrompts({
      latest: true,
      bundles: [],
      apps: ['ui.apps'],
    })
    .run()
    .then((result) => {
      const expected = {
        version: 'latest',
        bundles: [],
        apps: ['ui.apps'],
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
    })
    .run()
    .then((result) => {
      stub.restore();
      const expected = {
        version: '2.20',
        bundles: ['core', 'bundle'],
        apps: ['ui.apps', 'ui.apps.other'],
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
  const findModules = sinon.stub(ModuleMixins, '_findModules');
  findModules.returns({ path: 'all', artifactId: 'test.all' });
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
        apps: ['ui.apps', 'ui.apps.other'],
      },
    })
    .inTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem': { aemVersion: '6.5' } }));
    })
    .run();

  findModules.restore();
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
        Generator: AllPackageModuleCoreComponentMixin,
        path: generatorPath('mixin-cc', 'all', 'index.js'),
      },
      options: {
        generateInto: 'all',
      },
    },
    'Parameters correct'
  );
});

test.serial('default - compose with - bundles - cloud', async (t) => {
  t.plan(3);
  sinon.restore();
  const findModules = sinon.stub(ModuleMixins, '_findModules');
  findModules.returns({ path: 'all.other', artifactId: 'test.all.other' });
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

  t.is(composed.length, 2, 'Correct number of calls');
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
});

test('writing/installing - cloud - latest', async () => {
  await helpers
    .create(CCWriteInstall)
    .withOptions({
      showBuildOutput: false,
      props: { aemVersion: 'cloud', resolvedVersion: '2.20.2' },
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
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.content<\/artifactId>\s+<\/dependency>/);
      result.assertNoFileContent('pom.xml', /core\.wcm\.components\.config<\/artifactId>\s+<\/dependency>/);
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
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.content<\/artifactId>/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.config<\/artifactId>/);
      result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.testing\.aem-mock-plugin<\/artifactId>/);
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

//
// test.serial('adds all module content - v6.5', async (t) => {
//   t.plan(1);
//
//   /* eslint-disable camelcase */
//   nock('https://api.github.com')
//     .get('/repos/adobe/aem-core-wcm-components/releases')
//     .reply(200, [{ tag_name: 'core-wcm-components-reactor-2.20.0' }, { tag_name: 'core-wcm-components-reactor-2.19.2' }, { tag_name: 'core-wcm-components-reactor-2.19.0' }, { tag_name: 'core-wcm-components-reactor-2.18.6' }, { tag_name: 'core-wcm-components-reactor-2.18.4' }, { tag_name: 'core-wcm-components-reactor-2.18.2' }, { tag_name: 'core-wcm-components-reactor-2.18.0' }]);
//   /* eslint-enable camelcase */
//
//   await helpers
//     .create(generatorPath('mixin-cc'))
//     .inTmpDir((temporary) => {
//       fs.cpSync(fixturePath('projects', 'v6.5'), temporary, { recursive: true });
//     })
//     .withOptions({ version: 'latest' })
//     .run()
//     .then(async (result) => {
//       nock.cleanAll();
//       nock.enableNetConnect();
//
//       result.assertFileContent('pom.xml', /core.wcm.components.version>2\.20\.0/);
//       result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.core<\/artifactId>/);
//       result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.content<\/artifactId>/);
//       result.assertFileContent('pom.xml', /<artifactId>core\.wcm\.components\.config<\/artifactId>/);
//
//       verifyAppsFiles(result);
//       const appsPom = result.generator.destinationPath('ui.apps', 'pom.xml');
//       result.assertFileContent(appsPom, /core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/);
//       result.assertFileContent(appsPom, /core\.wcm\.components\.content<\/artifactId>\s+<type>/);
//       result.assertFileContent(appsPom, /core\.wcm\.components\.config<\/artifactId>\s+<type>/);
//
//       const corePom = result.generator.destinationPath('core', 'pom.xml');
//       result.assertNoFileContent(corePom, /<artifactId>core\.wcm\.components\.core<\/artifactId>\s+<scope>/);
//       result.assertFileContent(corePom, /<artifactId>core\.wcm\.components\.core<\/artifactId>\s+<\/dependency>/);
//
//       const allPom = result.generator.destinationPath('all', 'pom.xml');
//       result.assertFileContent(allPom, /<artifactId>core\.wcm\.components\.core<\/artifactId>\s+<target>\/apps\/test-vendor-packages/);
//       result.assertFileContent(allPom, /<artifactId>core\.wcm\.components\.content<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
//       result.assertFileContent(allPom, /<artifactId>core\.wcm\.components\.config<\/artifactId>\s+<type>zip<\/type>\s+<target>\/apps\/test-vendor-packages/);
//
//       const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore' });
//       t.is(spawnResult.exitCode, 0, 'Build successful.');
//     });
//   nock.cleanAll();
//   nock.enableNetConnect();
// });
//
//
