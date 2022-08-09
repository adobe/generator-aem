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
import { versions } from 'node:process';
import { execFileSync } from 'node:child_process';

import _ from 'lodash';

import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';
import helpers from 'yeoman-test';

import got from 'got';
import { generatorPath, fixturePath, cloudSdkApiMetadata, aem65ApiMetadata } from '../fixtures/helpers.js';
import TestGenerator from '../fixtures/generators/simple/index.js';

import { Init, Config, WriteInstall } from '../fixtures/generators/wrappers.js';
import AEMGenerator from '../../generators/app/index.js';
import MavenUtils from '../../lib/maven-utils.js';

const resolved = generatorPath('app', 'index.js');
const AEMAppInit = Init(AEMGenerator, resolved);
const AEMAppConfig = Config(AEMGenerator, resolved);
const AEMAppWriteInstall = WriteInstall(AEMGenerator, resolved);

const nodeVersion = versions.node;
const npmVersion = execFileSync('npm', ['--version'])
  .toString()
  .replaceAll(/\r\n|\n|\r/gm, '');

test('initialize - no options', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.props, {}, 'Properties set');
      t.deepEqual(result.generator.modules, {}, 'Modules set');
      t.deepEqual(result.generator.mixins, {}, 'Mixins set');
    });
});

test('initialize - defaults', async (t) => {
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
        bundle: new Set(['core']),
        'frontend-general': new Set(['ui.frontend']),
        'package-structure': new Set(['ui.apps.structure']),
        'package-apps': new Set(['ui.apps']),
        'package-config': new Set(['ui.config']),
        'package-all': new Set(['all']),
        'tests-it': new Set(['it.tests']),
        dispatcher: new Set(['dispatcher']),
        unknown: new Set(),
      };

      const mixins = {
        cc: new Set(['.', 'core', 'ui.apps', 'all']),
      };
      t.deepEqual(result.generator.props, props, 'Properties set');
      t.deepEqual(result.generator.modules, modules, 'Modules set');
      t.deepEqual(result.generator.mixins, mixins, 'Mixins set');
    });
});

test('initialize - invalid java/aem version', async (t) => {
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
        bundle: new Set(['core']),
        'frontend-general': new Set(['ui.frontend']),
        'package-structure': new Set(['ui.apps.structure']),
        'package-apps': new Set(['ui.apps']),
        'package-config': new Set(['ui.config']),
        'package-all': new Set(['all']),
        'tests-it': new Set(['it.tests']),
        dispatcher: new Set(['dispatcher']),
        unknown: new Set(),
      };

      const mixins = {
        cc: new Set(['.', 'core', 'ui.apps', 'all']),
      };
      t.deepEqual(result.generator.props, props, 'Properties set');
      t.deepEqual(result.generator.modules, modules, 'Modules set');
      t.deepEqual(result.generator.mixins, mixins, 'Mixins set');
    });
});

test('initialize - defaults with module subset', async (t) => {
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
        bundle: new Set(['core']),
        'package-structure': new Set(['ui.apps.structure']),
        'package-apps': new Set(['ui.apps']),
        'package-all': new Set(['all']),
      };

      const mixins = {
        cc: new Set(['.', 'core', 'ui.apps', 'all']),
      };
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
      t.deepEqual(result.generator.mixins, {}, 'Mixins set');
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
      t.deepEqual(result.generator.mixins, {}, 'Mixins set');
    });
});

test('initialize from pom - with modules', async (t) => {
  t.plan(3);

  await helpers
    .create(AEMAppInit)
    .inTmpDir((temporary) => {
      fs.cpSync(fixturePath('pom', 'modules'), temporary, { recursive: true });
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
        bundle: new Set(['core']),
        'package-structure': new Set(['ui.apps.structure']),
        'package-apps': new Set(['ui.apps']),
        unknown: new Set(['unknown']),
      };

      const mixins = {
        cc: new Set(['core', 'ui.apps']),
      };

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
      t.deepEqual(result.generator.mixins, {}, 'Mixins set');
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
      t.deepEqual(result.generator.mixins, {}, 'Mixins set');
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
        bundle: new Set(['core']),
        'frontend-general': new Set(['ui.frontend']),
        'package-structure': new Set(['ui.apps.structure']),
        'package-apps': new Set(['ui.apps']),
        'package-config': new Set(['ui.config']),
        'package-all': new Set(['all']),
        'tests-it': new Set(['it.tests']),
        dispatcher: new Set(['dispatcher']),
        unknown: new Set(),
      };

      const mixins = {
        cc: new Set(['.', 'core', 'ui.apps', 'all']),
      };
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
      this.props = {};
    }

    prompting() {
      super.prompting();
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
    modules: 'options',
    mixins: 'options',
    nodeVersion: 'options',
    npmVersion: 'options',
  };

  class Mock extends AEMGenerator {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    prompting() {
      this.props = options;
      super.prompting().then((answers) => {
        this.answers = answers;
      });
    }
  }

  await helpers
    .create(Mock)
    .withOptions(options)
    .run()
    .then((result) => {
      t.deepEqual(result.generator.answers, {}, 'Properties set');
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
      this.mixins = {};
      super.prompting();
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
        bundle: new Set(['prompted']),
        'frontend-general': new Set(['prompted']),
        'package-structure': new Set(['prompted']),
        'package-apps': new Set(['prompted']),
        'package-config': new Set(['prompted']),
        'package-all': new Set(['prompted']),
        'tests-it': new Set(['prompted']),
        dispatcher: new Set(['dispatcher']),
      };

      const mixins = {
        cc: new Set(),
      };
      t.deepEqual(result.generator.props, props, 'Properties set');
      t.deepEqual(result.generator.modules, modules, 'Modules set');
      t.deepEqual(result.generator.mixins, mixins, 'Mixins set');
    });
});

test('configuring', async (t) => {
  t.plan(1);
  sinon.restore();
  const fake = sinon.fake.resolves(cloudSdkApiMetadata);
  sinon.replace(MavenUtils, 'latestRelease', fake);

  await helpers
    .create(AEMAppConfig)
    .withOptions({ props: { config: 'config' } })
    .run()
    .then((result) => {
      sinon.restore();

      const expected = {
        '@adobe/generator-aem': {
          config: 'config',
          aem: cloudSdkApiMetadata,
        },
      };

      const yoData = JSON.parse(fs.readFileSync(result.generator.destinationPath('.yo-rc.json')));
      t.deepEqual(yoData, expected, 'Yeoman Data saved.');
    });
});

test('configuring - generateInto', async (t) => {
  t.plan(1);
  sinon.restore();
  const fake = sinon.fake.resolves(cloudSdkApiMetadata);
  sinon.replace(MavenUtils, 'latestRelease', fake);

  await helpers
    .create(AEMAppConfig)
    .withOptions({ generateInto: 'subdir', props: { config: 'config' } })
    .withPrompts()
    .run()
    .then((result) => {
      sinon.restore();
      const expected = {
        '@adobe/generator-aem': {
          config: 'config',
          aem: cloudSdkApiMetadata,
        },
      };

      const yoData = JSON.parse(fs.readFileSync(result.generator.destinationPath('.yo-rc.json')));
      t.deepEqual(yoData, expected, 'Yeoman Data saved.');
    });
});

test('configuring - fails on existing different pom', async (t) => {
  t.plan(1);
  sinon.restore();
  const fake = sinon.fake.resolves(cloudSdkApiMetadata);
  sinon.replace(MavenUtils, 'latestRelease', fake);

  await t.throwsAsync(
    helpers
      .create(AEMAppConfig)
      .withOptions({ props: { groupId: 'options', artifactId: 'options' } })
      .inTmpDir((temporary) => {
        fs.copyFileSync(fixturePath('pom', 'full', 'pom.xml'), path.join(temporary, 'pom.xml'));
      })
      .run()
      .then(() => {
        sinon.restore();
      })
  );
});

test('default - module generator does not exist', async (t) => {
  t.plan(1);

  class Mock extends AEMGenerator {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    default() {
      this.modules = { 'test:simple': new Set(['simple']) };
      super.default();
    }
  }

  const options = {
    defaults: true,
  };
  await t.throwsAsync(helpers.create(Mock).withOptions(options).run());
});

test.serial('default - module generator exists', async (t) => {
  t.plan(1);

  class Mock extends AEMGenerator {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    default() {
      this.props = { parent: 'parent' };
      this.modules = { 'test:simple': new Set(['simple']) };
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

test.serial('writing/installing - cloud', async (t) => {
  t.plan(4);

  await helpers
    .create(AEMAppWriteInstall)
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
      const gitignore = path.join('.gitignore');
      result.assertFile(gitignore);
      const content = fs.readFileSync(gitignore, { encoding: 'utf8' }).split('\n');
      t.is(content.length, 110, 'Correct number of lines.');
      t.is(content[2], '# This is a custom entry', 'Custom entry found');
      t.is(content[3], '*.hprof', 'Order correct');

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

      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore' });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});

test.serial('writing/installing - v6.5', async (t) => {
  t.plan(1);

  await helpers
    .create(AEMAppWriteInstall)
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

      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore' });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});

test.serial('writing/installing - cloud - merge/upgrade', async (t) => {
  t.plan(1);

  await helpers
    .create(AEMAppWriteInstall)
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

      const spawnResult = result.generator.spawnCommandSync('mvn', ['clean', 'verify'], { stdio: 'ignore' });
      t.is(spawnResult.exitCode, 0, 'Build successful.');
    });
});

// TODO: Tests to update existing project
// TODO: Test for full build of defaults
