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
import { versions } from 'node:process';
import { execFileSync } from 'node:child_process';

import _ from 'lodash';

import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';
import helpers from 'yeoman-test';

import tempDirectory from 'temp-dir';
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata } from '../fixtures/helpers.js';
import TestGenerator from '../fixtures/generators/simple/index.js';

import Bundle, { generatorName as bundleGeneratorName } from '../../generators/bundle/index.js';
import FrontendGeneral, { generatorName as feGeneratorName } from '../../generators/frontend-general/index.js';
import PackageStructure, { generatorName as structureGeneratorName } from '../../generators/package-structure/index.js';
import PackageApps, { generatorName as appsGeneratorName } from '../../generators/package-apps/index.js';
import PackageConfig, { generatorName as configGeneratorName } from '../../generators/package-config/index.js';
import PackageAll, { generatorName as allGeneratorName } from '../../generators/package-all/index.js';
import TestsIt, { generatorName as itGeneratorName } from '../../generators/tests-it/index.js';
import Dispatcher, { generatorName as dispatcherGeneratorName } from '../../generators/dispatcher/index.js';
import CoreComponent, { generatorName as ccGeneratorName } from '../../generators/mixin-cc/index.js';

import { init, config, writeInstall } from '../fixtures/generators/wrappers.js';
import AEMGenerator from '../../generators/app/index.js';
import MavenUtils from '../../lib/maven-utils.js';

const resolved = generatorPath('app', 'index.js');
const AEMAppInit = init(AEMGenerator, resolved);
const AEMAppConfig = config(AEMGenerator, resolved);
const AEMAppWriteInstall = writeInstall(AEMGenerator, resolved);

const nodeVersion = versions.node;
const npmVersion = execFileSync('npm', ['--version'])
  .toString()
  .replaceAll(/\r\n|\n|\r/gm, '');

test('initializing - no options', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, {}, 'Properties set');
      t.deepEqual(result.generator.modules, {}, 'Modules set');
      t.deepEqual(result.generator.mixins, [], 'Mixins set');
    });
});

test('initializing - defaults', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .withOptions({ defaults: true })
    .run()
    .then((result) => {
      const props = {
        defaults: true,
        examples: false,
        version: '1.0.0-SNAPSHOT',
        aemVersion: 'cloud',
        javaVersion: '11',
        nodeVersion,
        npmVersion,
      };

      const modules = {
        bundle: { core: {} },
        'frontend-general': { 'ui.frontend': {} },
        'package-structure': { 'ui.apps.structure': {} },
        'package-apps': { 'ui.apps': {} },
        'package-config': { 'ui.config': {} },
        'package-all': { all: {} },
        'tests-it': { 'it.tests': {} },
        dispatcher: { dispatcher: {} },
      };

      t.deepEqual(result.generator.props, props, 'Properties set');
      t.deepEqual(result.generator.modules, modules, 'Modules set');
      t.deepEqual(result.generator.mixins, ['cc'], 'Mixins set');
    });
});

test('initializing - invalid java/aem version', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .withOptions({ defaults: true, javaVersion: '1.7', aemVersion: '6.4' })
    .run()
    .then((result) => {
      const props = {
        defaults: true,
        examples: false,
        version: '1.0.0-SNAPSHOT',
        aemVersion: 'cloud',
        javaVersion: '11',
        nodeVersion,
        npmVersion,
      };

      const modules = {
        bundle: { core: {} },
        'frontend-general': { 'ui.frontend': {} },
        'package-structure': { 'ui.apps.structure': {} },
        'package-apps': { 'ui.apps': {} },
        'package-config': { 'ui.config': {} },
        'package-all': { all: {} },
        'tests-it': { 'it.tests': {} },
        dispatcher: { dispatcher: {} },
      };
      const mixins = ['cc'];
      t.deepEqual(result.generator.props, props, 'Properties set');
      t.deepEqual(result.generator.modules, modules, 'Modules set');
      t.deepEqual(result.generator.mixins, mixins, 'Mixins set');
    });
});

test('initializing - defaults with module subset', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .withOptions({ defaults: true, modules: 'bundle,package-structure,package-apps,package-all' })
    .run()
    .then((result) => {
      const props = {
        defaults: true,
        examples: false,
        version: '1.0.0-SNAPSHOT',
        aemVersion: 'cloud',
        javaVersion: '11',
        nodeVersion,
        npmVersion,
      };

      const modules = {
        bundle: { core: {} },
        'package-structure': { 'ui.apps.structure': {} },
        'package-apps': { 'ui.apps': {} },
        'package-all': { all: {} },
      };

      const mixins = ['cc'];
      t.deepEqual(result.generator.props, props, 'Properties set');
      t.deepEqual(result.generator.modules, modules, 'Modules set');
      t.deepEqual(result.generator.mixins, mixins, 'Mixins set');
    });
});

test('initialize from pom - no modules', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .inTmpDir((temporary) => {
      fs.copyFileSync(fixturePath('pom', 'full', 'pom.xml'), path.join(temporary, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0-POM',
        javaVersion: '8',
        aemVersion: 'pom',
        nodeVersion: 'pom',
        npmVersion: 'pom',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
      t.deepEqual(result.generator.modules, {}, 'Modules set');
      t.deepEqual(result.generator.mixins, [], 'Mixins set');
    });
});

test('initialize from pom - no modules - generateInto', async (t) => {
  t.plan(3);
  const subdir = 'subdir';

  await helpers
    .create(AEMAppInit)
    .withOptions({ generateInto: subdir })
    .inTmpDir((temporary) => {
      fs.mkdirSync(path.join(temporary, subdir));
      fs.copyFileSync(fixturePath('pom', 'full', 'pom.xml'), path.join(temporary, subdir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0-POM',
        javaVersion: '8',
        aemVersion: 'pom',
        nodeVersion: 'pom',
        npmVersion: 'pom',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
      t.deepEqual(result.generator.modules, {}, 'Modules set');
      t.deepEqual(result.generator.mixins, [], 'Mixins set');
    });
});

test('initialize from pom - with modules', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .inTmpDir((temporary) => {
      fs.cpSync(fixturePath('pom', 'modules'), temporary, { recursive: true });
      fs.writeFileSync(path.join(temporary, '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:mixin-cc': {} }));
    })
    .run()
    .then((result) => {
      const props = {
        name: 'Pom Name',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0-POM',
        javaVersion: '8',
        aemVersion: 'pom',
        nodeVersion: 'pom',
        npmVersion: 'pom',
      };
      const modules = {
        bundle: { core: {} },
        'package-structure': { 'ui.apps.structure': {} },
        'package-apps': { 'ui.apps': {} },
      };

      const mixins = ['cc'];
      t.deepEqual(result.generator.props, props, 'Properties set');
      t.deepEqual(result.generator.modules, modules, 'Modules set');
      t.deepEqual(result.generator.mixins, mixins, 'Mixins set');
    });
});

test('initialize from .yo-rc.json', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .inTmpDir((temporary) => {
      fs.copyFileSync(fixturePath('yo-rc', 'full', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        examples: true,
        name: 'Local Yo',
        appId: 'localyo',
        groupId: 'com.test.localyo',
        artifactId: 'localyo',
        version: '1.0-LOCALYO',
        javaVersion: '8',
        aemVersion: 'localyo',
        nodeVersion: 'localyo',
        npmVersion: 'localyo',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
      t.deepEqual(result.generator.modules, {}, 'Modules set');
      t.deepEqual(result.generator.mixins, [], 'Mixins set');
    });
});

test('initialize from .yo-rc.json - generateInto', async (t) => {
  t.plan(3);
  const subdir = 'subdir';

  await helpers
    .create(AEMAppInit)
    .withOptions({ generateInto: subdir })
    .inTmpDir((temporary) => {
      fs.mkdirSync(path.join(temporary, subdir));
      fs.copyFileSync(fixturePath('yo-rc', 'full', '.yo-rc.json'), path.join(temporary, subdir, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        examples: true,
        name: 'Local Yo',
        appId: 'localyo',
        groupId: 'com.test.localyo',
        artifactId: 'localyo',
        version: '1.0-LOCALYO',
        javaVersion: '8',
        aemVersion: 'localyo',
        nodeVersion: 'localyo',
        npmVersion: 'localyo',
      };
      t.deepEqual(result.generator.props, expected, 'Properties set');
      t.deepEqual(result.generator.modules, {}, 'Modules set');
      t.deepEqual(result.generator.mixins, [], 'Mixins set');
    });
});

test('initialize merge', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .withOptions({ defaults: true, appId: 'options' })
    .inTmpDir((temporary) => {
      fs.copyFileSync(fixturePath('pom', 'partial', 'pom.xml'), path.join(temporary, 'pom.xml'));
      fs.copyFileSync(fixturePath('yo-rc', 'partial', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const props = {
        defaults: true,
        examples: false,
        name: 'Local Yo',
        appId: 'options',
        groupId: 'com.test.pom.groupid',
        artifactId: 'pom.artifactid',
        version: '1.0.0-SNAPSHOT',
        javaVersion: '11',
        aemVersion: 'localyo',
        nodeVersion,
        npmVersion,
      };

      const modules = {
        bundle: { core: {} },
        'frontend-general': { 'ui.frontend': {} },
        'package-structure': { 'ui.apps.structure': {} },
        'package-apps': { 'ui.apps': {} },
        'package-config': { 'ui.config': {} },
        'package-all': { all: {} },
        'tests-it': { 'it.tests': {} },
        dispatcher: { dispatcher: {} },
      };

      const mixins = ['cc'];
      t.deepEqual(result.generator.props, props, 'Properties set');
      t.deepEqual(result.generator.modules, modules, 'Modules set');
      t.deepEqual(result.generator.mixins, mixins, 'Mixins set');
    });
});

test('prompting - defaults', async (t) => {
  t.plan(1);

  const responses = {
    groupId: 'prompted',
    name: 'prompted',
    appId: 'prompted',
  };

  class Mock extends AEMGenerator {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    prompting() {
      this.props = {};
      this.modules = {};
      this.mixins = [];
      return super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({ defaults: true })
    .withPrompts(responses)
    .run()
    .then((result) => {
      const expected = {
        groupId: 'prompted',
        name: 'prompted',
        appId: 'prompted',
        artifactId: 'prompted',
      };

      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('prompting - options passed', async (t) => {
  t.plan(1);

  const options = {
    examples: true,
    name: 'options',
    appId: 'options',
    artifactId: 'options',
    groupId: 'options',
    version: 'options',
    aemVersion: 'options',
    javaVersion: 'options',
    modules: 'bundle,frontend-general,package-structure,package-apps,package-config,package-all,tests-it,dispatcher',
    mixins: 'cc',
    nodeVersion: 'options',
    npmVersion: 'options',
  };

  class Mock extends AEMGenerator {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    /* eslint-disable ava/prefer-async-await */
    prompting() {
      this.props = options;
      this.modules = {};
      this.mixins = [];

      return super.prompting().then((answers) => {
        this.answers = answers;
      });
    }

    /* eslint-enable ava/prefer-async-await */
  }

  const answers = {
    bundle: 'bundle',
    'frontend-general': 'frontend',
    'package-structure': 'structure',
    'package-apps': 'apps',
    'package-config': 'config',
    'package-all': 'alls',
    'tests-it': 'it',
  };

  await helpers
    .create(Mock)
    .withOptions(options)
    .withPrompts(answers)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.answers, answers, 'Properties set');
    });
});

test('prompting - asked', async (t) => {
  t.plan(3);

  const prompts = {
    examples: true,
    name: 'prompted',
    appId: 'prompted',
    artifactId: 'prompted',
    groupId: 'prompted',
    version: 'prompted',
    aemVersion: 'prompted',
    javaVersion: 'prompted',
    moduleSelection: ['bundle', 'frontend', 'package-structure', 'package-apps', 'package-config', 'package-all', 'tests-it', 'dispatcher'],
    frontend: 'frontend-general',
    bundle: 'prompted',
    'frontend-general': 'prompted',
    'package-structure': 'prompted',
    'package-apps': 'prompted',
    'package-config': 'prompted',
    'package-all': 'prompted',
    'tests-it': 'prompted',
    mixins: ['cc'],
    nodeVersion: 'prompted',
    npmVersion: 'prompted',
  };

  class Mock extends AEMGenerator {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    prompting() {
      this.props = {};
      this.modules = {};
      this.mixins = [];
      return super.prompting();
    }
  }

  await helpers
    .create(Mock)
    .withPrompts(prompts)
    .run()
    .then((result) => {
      const props = _.omit(prompts, [
        'moduleSelection',
        'bundle',
        'frontend',
        'package-structure',
        'package-apps',
        'package-config',
        'package-all',
        'tests-it',
        'dispatcher',
        'frontend-general',
        'mixins',
      ]);
      const modules = {
        bundle: {
          prompted: {},
        },
        'frontend-general': {
          prompted: {},
        },
        'package-structure': {
          prompted: {},
        },
        'package-apps': {
          prompted: {},
        },
        'package-config': {
          prompted: {},
        },
        'package-all': {
          prompted: {},
        },
        'tests-it': {
          prompted: {},
        },
        dispatcher: {
          dispatcher: {},
        },
      };
      t.deepEqual(result.generator.props, props, 'Properties set');
      t.deepEqual(result.generator.modules, modules, 'Modules set');
      t.deepEqual(result.generator.mixins, ['cc'], 'Mixins set');
    });
});

test.serial('configuring', async (t) => {
  t.plan(1);
  sinon.restore();
  const fake = sinon.fake.resolves(cloudSdkApiMetadata);
  sinon.replace(MavenUtils, 'latestRelease', fake);

  await helpers
    .create(AEMAppConfig)
    .withOptions({ props: { config: 'config', appId: 'test' } })
    .run()
    .then((result) => {
      sinon.restore();

      const expected = {
        '@adobe/generator-aem': {
          config: 'config',
          appId: 'test',
          aem: cloudSdkApiMetadata,
        },
      };

      const yoData = JSON.parse(fs.readFileSync(result.generator.destinationPath('.yo-rc.json')));
      t.deepEqual(yoData, expected, 'Yeoman Data saved.');
    });
});

test.serial('configuring - sets destinationRoot', async (t) => {
  t.plan(3);
  sinon.restore();
  const fake = sinon.fake.resolves(cloudSdkApiMetadata);
  sinon.replace(MavenUtils, 'latestRelease', fake);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'core');

  await helpers
    .create(AEMAppConfig)
    .withOptions({ props: { appId: 'core' } })
    .inDir(fullPath)
    .run()
    .then((result) => {
      sinon.restore();
      t.is(path.basename(result.generator.destinationRoot()), 'core', 'Set destination root.');
    });

  await helpers
    .create(AEMAppConfig)
    .withOptions({ props: { appId: 'core' } })
    .inDir(temporaryDir)
    .run()
    .then((result) => {
      sinon.restore();
      t.is(path.basename(result.generator.destinationRoot()), 'core', 'Set destination root.');
    });

  await helpers
    .create(AEMAppConfig)
    .withOptions({ generateInto: 'notcore', props: { appId: 'core' } })
    .inDir(path.join(temporaryDir, 'notcore'))
    .run()
    .then((result) => {
      sinon.restore();
      t.is(path.basename(result.generator.destinationRoot()), 'notcore', 'Ignored appId.');
    });
});

test.serial('configuring - fails on existing different pom', async (t) => {
  t.plan(2);
  sinon.restore();
  const fake = sinon.fake.resolves(cloudSdkApiMetadata);
  sinon.replace(MavenUtils, 'latestRelease', fake);

  const error = await t.throwsAsync(
    helpers
      .create(AEMAppConfig)
      .withOptions({ generateInto: 'test', props: { groupId: 'options', artifactId: 'options' } })
      .inTmpDir((temporary) => {
        fs.copyFileSync(fixturePath('pom', 'full', 'pom.xml'), path.join(temporary, 'pom.xml'));
      })
      .run()
      .then(() => {
        sinon.restore();
      })
  );
  t.regex(error.message, /Refusing to update existing project with different group\/artifact identifiers\./, 'Error thrown.');
});

test('default - module generator does not exist', async (t) => {
  t.plan(1);

  class Mock extends AEMGenerator {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    default() {
      this.props = {
        groupId: 'com.adobe.test.main',
        artifactId: 'main',
        version: '1.0.0-SNAPSHOT',
        appId: 'main',
        name: 'Main Title',
        aemVersion: '6.5',
        javaVersion: '8',
        nodeVersion,
        npmVersion,
        aem: aem65ApiMetadata,
      };
      this.modules = { 'test:simple': { simple: {} } };
      this.mixins = [];
      super.default();
    }
  }

  const options = {
    defaults: true,
  };
  await t.throwsAsync(helpers.create(Mock).withOptions(options).run());
});

test('default - module generator exists', async (t) => {
  t.plan(1);

  class Mock extends AEMGenerator {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    default() {
      this.props = {
        groupId: 'com.adobe.test.main',
        artifactId: 'main',
        version: '1.0.0-SNAPSHOT',
        appId: 'main',
        name: 'Main Title',
        aemVersion: '6.5',
        javaVersion: '8',
        nodeVersion,
        npmVersion,
        aem: aem65ApiMetadata,
      };
      this.modules = { 'test:simple': { simple: {} } };
      this.mixins = [];
      super.default();
    }
  }

  await helpers
    .create(Mock)
    .withGenerators([[TestGenerator, 'test:simple']])
    .run()
    .then((result) => {
      const expected = {
        added: 'Added',
      };
      const actual = JSON.parse(fs.readFileSync(result.generator.destinationPath('simple', 'props.json')));
      t.deepEqual(actual, expected, 'File created');
    });
});

test('writing/installing - cloud', async (t) => {
  t.plan(3);

  class Mock extends AEMAppWriteInstall {
    writing() {
      this._writePom(); // Write Pom is on the default function.
      return super.writing();
    }

    install() {
      return super.install();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({
      props: {
        groupId: 'com.adobe.test.main',
        artifactId: 'main',
        version: '1.0.0-SNAPSHOT',
        appId: 'main',
        name: 'Main Title',
        aemVersion: 'cloud',
        javaVersion: '11',
        nodeVersion,
        npmVersion,
        aem: cloudSdkApiMetadata,
      },
      showBuildOutput: false,
    })
    .inTmpDir((temporary) => {
      fs.copyFileSync(fixturePath('files', '.gitignore'), path.join(temporary, '.gitignore'));
    })
    .run()
    .then((result) => {
      const gitignore = result.generator.destinationPath('.gitignore');
      result.assertFile('.gitignore');
      const content = fs.readFileSync(gitignore, { encoding: 'utf8' }).split('\n');
      t.is(content.length, 110, 'Correct number of lines.');
      t.is(content[2], '# This is a custom entry', 'Custom entry found');
      t.is(content[3], '*.hprof', 'Order correct');

      result.assertFile('.gitattributes');

      result.assertFile('README.md');
      const resolve = '.yo-resolve';
      result.assertFileContent(resolve, /\.gitignore force/);
      result.assertFileContent(resolve, /\.yo-resolve force/);
      result.assertFileContent(resolve, /pom.xml force/);
      result.assertFileContent(resolve, /README.md skip/);
      result.assertNoFileContent(resolve, 'foo skip');

      const pom = path.join('pom.xml');

      result.assertFile(pom);
      result.assertFileContent(pom, /<groupId>com.adobe.test.main<\/groupId>/);
      result.assertFileContent(pom, /<artifactId>main<\/artifactId>/);
      result.assertFileContent(pom, /<version>1.0.0-SNAPSHOT<\/version>/);
      result.assertFileContent(pom, /<name>Main Title<\/name>/);
      result.assertFileContent(pom, /<description>Parent pom for Main Title<\/description>/);

      result.assertFileContent(pom, /<componentGroupName>Main Title<\/componentGroupName>/);
      result.assertFileContent(pom, /<java.version>11<\/java.version>/);
      result.assertFileContent(pom, /<aem.version>\d{4}\.\d+\.\d+\.\d{8}T\d{6}Z-\d+<\/aem.version>/);
      result.assertFileContent(pom, `<node.version>v${nodeVersion}</node.version>`);
      result.assertFileContent(pom, `<npm.version>${npmVersion}</npm.version>`);
      result.assertFileContent(pom, /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertNoFileContent(pom, /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);
    });
});

test('writing/installing - v6.5', async () => {
  class Mock extends AEMAppWriteInstall {
    writing() {
      this._writePom(); // Write Pom is on the default function.
      return super.writing();
    }

    install() {
      return super.install();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({
      props: {
        groupId: 'com.adobe.test.main',
        artifactId: 'main',
        version: '1.0.0-SNAPSHOT',
        appId: 'main',
        name: 'Main Title',
        aemVersion: '6.5',
        javaVersion: '8',
        nodeVersion,
        npmVersion,
        aem: aem65ApiMetadata,
      },
      showBuildOutput: false,
    })
    .run()
    .then((result) => {
      result.assertFile(path.join('README.md'));
      result.assertFile(path.join('.gitignore'));
      const pom = path.join('pom.xml');
      result.assertFile(pom);
      result.assertFileContent(pom, /<groupId>com.adobe.test.main<\/groupId>/);
      result.assertFileContent(pom, /<artifactId>main<\/artifactId>/);
      result.assertFileContent(pom, /<version>1.0.0-SNAPSHOT<\/version>/);
      result.assertFileContent(pom, /<name>Main Title<\/name>/);
      result.assertFileContent(pom, /<description>Parent pom for Main Title<\/description>/);

      result.assertFileContent(pom, /<componentGroupName>Main Title<\/componentGroupName>/);
      result.assertFileContent(pom, /<java.version>8<\/java.version>/);
      result.assertFileContent(pom, /<aem.version>6\.5\.\d+<\/aem.version>/);
      result.assertFileContent(pom, `<node.version>v${nodeVersion}</node.version>`);
      result.assertFileContent(pom, `<npm.version>${npmVersion}</npm.version>`);
      result.assertFileContent(pom, /<artifactId>uber-jar<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);
    });
});

test('writing/installing - cloud - merge/upgrade', async () => {
  class Mock extends AEMAppWriteInstall {
    writing() {
      this._writePom(); // Write Pom is on the default function.
      return super.writing();
    }

    install() {
      return super.install();
    }
  }

  await helpers
    .create(Mock)
    .withOptions({
      props: {
        groupId: 'com.adobe.test.main',
        artifactId: 'main',
        version: '1.0.0-SNAPSHOT',
        appId: 'main',
        name: 'Main Title',
        aemVersion: 'cloud',
        javaVersion: '11',
        nodeVersion,
        npmVersion,
        aem: cloudSdkApiMetadata,
      },
      showBuildOutput: false,
    })
    .inTmpDir((temporary) => {
      fs.copyFileSync(fixturePath('pom', 'v6.5', 'pom.xml'), path.join(temporary, 'pom.xml'));
    })
    .run()
    .then((result) => {
      result.assertFile('.gitignore');
      result.assertFile('README.md');
      result.assertFile('.yo-resolve');
      const pom = path.join('pom.xml');
      result.assertFile(pom);
      result.assertFileContent(pom, /<groupId>com.adobe.test.main<\/groupId>/);
      result.assertFileContent(pom, /<artifactId>main<\/artifactId>/);
      result.assertFileContent(pom, /<version>1.0.0-SNAPSHOT<\/version>/);
      result.assertFileContent(pom, /<name>Main Title<\/name>/);
      result.assertFileContent(pom, /<description>Parent pom for Main Title<\/description>/);

      result.assertFileContent(pom, /<componentGroupName>Main Title<\/componentGroupName>/);
      result.assertFileContent(pom, /<java.version>11<\/java.version>/);
      result.assertFileContent(pom, /<aem.version>\d{4}\.\d+\.\d+\.\d{8}T\d{6}Z-\d+<\/aem.version>/);
      result.assertFileContent(pom, `<node.version>v${nodeVersion}</node.version>`);
      result.assertFileContent(pom, `<npm.version>${npmVersion}</npm.version>`);
      result.assertFileContent(pom, /<artifactId>aem-sdk-api<\/artifactId>/);
      result.assertFileContent(pom, /<artifactId>commons-lang3<\/artifactId>/);
      result.assertFileContent(pom, /<commonslang.version>3.11/);
      result.assertFileContent(pom, /<artifactId>jacoco-maven-plugin<\/artifactId>\s+<executions/); // Plugin Section
      result.assertFileContent(pom, /<artifactId>jacoco-maven-plugin<\/artifactId>\s+<version/); // Plugin Management Section
      result.assertFileContent(pom, /<artifactId>maven-gpg-plugin<\/artifactId>\s+<configuration/); // Profile Section
      result.assertNoFileContent(pom, /<artifactId>uber-jar<\/artifactId>/);
      result.assertNoFileContent(pom, /<artifactId>org.osgi.annotation.versioning<\/artifactId>/);
    });
});

test.serial('integration - options', async () => {
  sinon.restore();

  const analyserCoordinates = { groupId: 'com.adobe.aem', artifactId: 'aemanalyser-maven-plugin' };

  const analyserMetadata = {
    groupId: 'com.adobe.aem',
    artifactId: 'aemanalyser-maven-plugin',
    version: '1.4.16',
  };

  const aemCoordinates = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    path: 'com/adobe/aem/aem-sdk-api',
  };

  const testClientCoordinates = {
    groupId: 'com.adobe.cq',
    artifactId: 'aem-cloud-testing-clients',
  };

  const testClientMetadata = {
    ...testClientCoordinates,
    version: '1.1.0',
  };

  const latestReleaseStub = sinon.stub(MavenUtils, 'latestRelease');
  latestReleaseStub.withArgs(analyserCoordinates).resolves(analyserMetadata);
  latestReleaseStub.withArgs(aemCoordinates).resolves(cloudSdkApiMetadata);
  latestReleaseStub.withArgs(testClientCoordinates).resolves(testClientMetadata);

  const resolveVersion = sinon.stub(CoreComponent.prototype, '_resolveVersion');
  resolveVersion.resolves('2.20.2');

  await helpers
    .create(generatorPath('app'))
    .withGenerators([
      [Bundle, bundleGeneratorName.replace('generator-', ''), generatorPath('bundle', 'index.js')],
      [FrontendGeneral, feGeneratorName.replace('generator-', ''), generatorPath('frontend-general', 'index.js')],
      [PackageStructure, structureGeneratorName.replace('generator-', ''), generatorPath('package-structure', 'index.js')],
      [PackageApps, appsGeneratorName.replace('generator-', ''), generatorPath('package-apps', 'index.js')],
      [PackageConfig, configGeneratorName.replace('generator-', ''), generatorPath('package-config', 'index.js')],
      [PackageAll, allGeneratorName.replace('generator-', ''), generatorPath('package-all', 'index.js')],
      [TestsIt, itGeneratorName.replace('generator-', ''), generatorPath('tests-it', 'index.js')],
      [Dispatcher, dispatcherGeneratorName.replace('generator-', ''), generatorPath('dispatcher', 'index.js')],
      [CoreComponent, ccGeneratorName.replace('generator-', ''), generatorPath('mixin-cc', 'index.js')],
    ])
    .withOptions({
      showBuildOutput: false,
      examples: true,
      name: 'Test Project',
      appId: 'test',
      artifactId: 'test',
      groupId: 'com.adobe.test',
      version: '1.0.0-SNAPSHOT',
      aemVersion: 'cloud',
      modules: 'bundle,frontend-general,package-structure,package-apps,package-config,package-all,tests-it,dispatcher',
      mixins: 'cc',
      nodeVersion: '16.13.2',
      npmVersion: '8.1.2',
    })
    .withPrompts({
      bundle: 'bundle',
      'frontend-general': 'frontend',
      'package-structure': 'structure',
      'package-apps': 'apps',
      'package-config': 'config',
      'package-all': 'all.package',
      'tests-it': 'it',
      name: 'Text Project',
      appId: 'test',
      ccVersion: '2.20',
      bundles: ['bundle'],
      apps: ['apps'],
    })
    .run()
    .then((result) => {
      latestReleaseStub.restore();
      resolveVersion.restore();
      const dest = result.generator.destinationPath();
      result.assertFile(path.join(dest, 'bundle', 'target', 'test.bundle-1.0.0-SNAPSHOT.jar'));
    });
});

test.serial('integration - prompts', async () => {
  sinon.restore();

  const analyserCoordinates = { groupId: 'com.adobe.aem', artifactId: 'aemanalyser-maven-plugin' };

  const analyserMetadata = {
    groupId: 'com.adobe.aem',
    artifactId: 'aemanalyser-maven-plugin',
    version: '1.4.16',
  };

  const aemCoordinates = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    path: 'com/adobe/aem/aem-sdk-api',
  };

  const testClientCoordinates = {
    groupId: 'com.adobe.cq',
    artifactId: 'aem-cloud-testing-clients',
  };

  const testClientMetadata = {
    ...testClientCoordinates,
    version: '1.1.0',
  };

  const latestReleaseStub = sinon.stub(MavenUtils, 'latestRelease');
  latestReleaseStub.withArgs(analyserCoordinates).resolves(analyserMetadata);
  latestReleaseStub.withArgs(aemCoordinates).resolves(cloudSdkApiMetadata);
  latestReleaseStub.withArgs(testClientCoordinates).resolves(testClientMetadata);

  const resolveVersion = sinon.stub(CoreComponent.prototype, '_resolveVersion');
  resolveVersion.resolves('2.20.2');

  await helpers
    .create(generatorPath('app'))
    .withGenerators([
      [Bundle, bundleGeneratorName.replace('generator-', ''), generatorPath('bundle', 'index.js')],
      [FrontendGeneral, feGeneratorName.replace('generator-', ''), generatorPath('frontend-general', 'index.js')],
      [PackageStructure, structureGeneratorName.replace('generator-', ''), generatorPath('package-structure', 'index.js')],
      [PackageApps, appsGeneratorName.replace('generator-', ''), generatorPath('package-apps', 'index.js')],
      [PackageConfig, configGeneratorName.replace('generator-', ''), generatorPath('package-config', 'index.js')],
      [PackageAll, allGeneratorName.replace('generator-', ''), generatorPath('package-all', 'index.js')],
      [TestsIt, itGeneratorName.replace('generator-', ''), generatorPath('tests-it', 'index.js')],
      [Dispatcher, dispatcherGeneratorName.replace('generator-', ''), generatorPath('dispatcher', 'index.js')],
      [CoreComponent, ccGeneratorName.replace('generator-', ''), generatorPath('mixin-cc', 'index.js')],
    ])
    .withOptions({
      showBuildOutput: false,
    })
    .withPrompts({
      examples: true,
      name: 'My Site',
      appId: 'mysite',
      artifactId: 'mysite',
      groupId: 'com.mysite',
      version: '1.0.0-SNAPSHOT',
      aemVersion: 'cloud',
      moduleSelection: ['bundle', 'frontend', 'package-structure', 'package-apps', 'package-config', 'package-all', 'tests-it', 'dispatcher'],
      frontend: 'frontend-general',
      bundle: 'core',
      'frontend-general': 'ui.frontend',
      'package-structure': 'ui.apps.structure',
      'package-apps': 'ui.apps',
      'package-config': 'ui.config',
      'package-all': 'all',
      'tests-it': 'it.tests',
      mixins: 'cc',
      nodeVersion: '16.13.2',
      npmVersion: '8.1.2',
    })
    .run()
    .then((result) => {
      latestReleaseStub.restore();
      resolveVersion.restore();
      const dest = result.generator.destinationPath();
      result.assertFile(path.join(dest, 'core', 'target', 'mysite.core-1.0.0-SNAPSHOT.jar'));
      result.assertFile(path.join(dest, 'ui.frontend', 'target', 'mysite.ui.frontend-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'ui.apps.structure', 'target', 'mysite.ui.apps.structure-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'ui.apps', 'target', 'mysite.ui.apps-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'ui.config', 'target', 'mysite.ui.config-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'all', 'target', 'mysite.all-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'it.tests', 'target', 'mysite.it.tests-1.0.0-SNAPSHOT.jar'));
      result.assertFile(path.join(dest, 'it.tests', 'target', 'mysite.it.tests-1.0.0-SNAPSHOT-jar-with-dependencies.jar'));
      result.assertFile(path.join(dest, 'dispatcher', 'target', 'mysite.dispatcher-1.0.0-SNAPSHOT.zip'));
    });
});

test.serial('integration - defaults', async () => {
  sinon.restore();

  const analyserCoordinates = { groupId: 'com.adobe.aem', artifactId: 'aemanalyser-maven-plugin' };

  const analyserMetadata = {
    groupId: 'com.adobe.aem',
    artifactId: 'aemanalyser-maven-plugin',
    version: '1.4.16',
  };

  const aemCoordinates = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    path: 'com/adobe/aem/aem-sdk-api',
  };

  const testClientCoordinates = {
    groupId: 'com.adobe.cq',
    artifactId: 'aem-cloud-testing-clients',
  };

  const testClientMetadata = {
    ...testClientCoordinates,
    version: '1.1.0',
  };

  const latestReleaseStub = sinon.stub(MavenUtils, 'latestRelease');
  latestReleaseStub.withArgs(analyserCoordinates).resolves(analyserMetadata);
  latestReleaseStub.withArgs(aemCoordinates).resolves(cloudSdkApiMetadata);
  latestReleaseStub.withArgs(testClientCoordinates).resolves(testClientMetadata);

  const resolveVersion = sinon.stub(CoreComponent.prototype, '_resolveVersion');
  resolveVersion.resolves('2.20.2');

  await helpers
    .create(generatorPath('app'))
    .withGenerators([
      [Bundle, bundleGeneratorName.replace('generator-', ''), generatorPath('bundle', 'index.js')],
      [FrontendGeneral, feGeneratorName.replace('generator-', ''), generatorPath('frontend-general', 'index.js')],
      [PackageStructure, structureGeneratorName.replace('generator-', ''), generatorPath('package-structure', 'index.js')],
      [PackageApps, appsGeneratorName.replace('generator-', ''), generatorPath('package-apps', 'index.js')],
      [PackageConfig, configGeneratorName.replace('generator-', ''), generatorPath('package-config', 'index.js')],
      [PackageAll, allGeneratorName.replace('generator-', ''), generatorPath('package-all', 'index.js')],
      [TestsIt, itGeneratorName.replace('generator-', ''), generatorPath('tests-it', 'index.js')],
      [Dispatcher, dispatcherGeneratorName.replace('generator-', ''), generatorPath('dispatcher', 'index.js')],
      [CoreComponent, ccGeneratorName.replace('generator-', ''), generatorPath('mixin-cc', 'index.js')],
    ])
    .withOptions({
      showBuildOutput: false,
      defaults: true,
    })
    .withPrompts({
      name: 'My Site',
      appId: 'mysite',
      groupId: 'com.mysite',
      nodeVersion: '16.13.2',
      npmVersion: '8.1.2',
    })
    .run()
    .then((result) => {
      latestReleaseStub.restore();
      resolveVersion.restore();
      const dest = result.generator.destinationPath();
      result.assertFile(path.join(dest, 'core', 'target', 'mysite.core-1.0.0-SNAPSHOT.jar'));
      result.assertFile(path.join(dest, 'ui.frontend', 'target', 'mysite.ui.frontend-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'ui.apps.structure', 'target', 'mysite.ui.apps.structure-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'ui.apps', 'target', 'mysite.ui.apps-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'ui.config', 'target', 'mysite.ui.config-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'all', 'target', 'mysite.all-1.0.0-SNAPSHOT.zip'));
      result.assertFile(path.join(dest, 'it.tests', 'target', 'mysite.it.tests-1.0.0-SNAPSHOT.jar'));
      result.assertFile(path.join(dest, 'it.tests', 'target', 'mysite.it.tests-1.0.0-SNAPSHOT-jar-with-dependencies.jar'));
      result.assertFile(path.join(dest, 'dispatcher', 'target', 'mysite.dispatcher-1.0.0-SNAPSHOT.zip'));
    });
});

test('checkName', async (t) => {
  t.plan(2);
  const checkName = AEMGenerator.prototype._checkName;

  const answers = {
    moduleSelection: ['bundle', 'package-apps', 'package-all'],
    bundle: 'core',
    'package-apps': 'ui.other.apps',
    'package-all': 'all',
  };

  t.truthy(await checkName('ui.apps', answers), 'No duplicate.');
  t.is(await checkName('core', answers), 'Module names must be unique.', 'Duplicate errors.');
});
