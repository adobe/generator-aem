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
import _ from 'lodash';
import tempDirectory from 'temp-dir';

import test from 'ava';
import sinon from 'sinon/pkg/sinon-esm.js';

import helpers from 'yeoman-test';

import { XMLParser } from 'fast-xml-parser';
import project from '../fixtures/helpers.js';
import AEMBundleGenerator from '../../generators/bundle/index.js';
import Utils from '../../lib/utils.js';

const generatorPath = path.join(project.generatorsRoot, 'bundle');

const Wrapper = class extends AEMBundleGenerator {
  constructor(args, options, features) {
    options.resolved = path.join(generatorPath, 'index.js');
    super(args, options, features);
  }

  initializing() {
    super.initializing();
  }

  prompting() {
    return super.prompting();
  }

  configuring() {
    super.configuring();
  }

  default() {
    super.default();
  }

  writing() {
    return super.writing();
  }
};

const NoWrite = class extends Wrapper {
  constructor(args, options, features) {
    options.resolved = path.join(generatorPath, 'index.js');
    super(args, options, features);
  }

  initializing() {
    super.initializing();
  }

  prompting() {
    return super.prompting();
  }

  configuring() {
    super.configuring();
  }

  default() {
    super.default();
  }
};

const promptDefaults = Object.freeze({
  examples: true,
  name: 'prompted',
  appId: 'prompted',
  artifactId: 'prompted',
  package: 'prompted',
});

const parent = {
  groupId: 'parent',
  artifactId: 'parent',
  version: 'parent',
};

test('@adobe/aem:bundle - requires parent', async (t) => {
  t.plan(1);
  const options = { defaults: true };
  await t.throwsAsync(helpers.create(NoWrite).withOptions(options).withPrompts(promptDefaults).run());
});

test('@adobe/aem:bundle - initialize - no options', async (t) => {
  t.plan(1);
  await helpers
    .create(NoWrite)
    .withOptions({ parent })
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const expected = {
        parent,
        moduleType: 'bundle',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem:bundle - initialize - defaults', async (t) => {
  t.plan(1);

  const options = { defaults: true, generateInto: 'doesnotexist', parent: { groupId: 'groupId' } };
  await helpers
    .create(NoWrite)
    .withOptions(options)
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.copyFileSync(path.join(project.fixturesRoot, 'yo-rc', 'parent-only', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: false,
        package: 'groupId',
        moduleType: 'bundle',
        artifactId: 'prompted.doesnotexist',
        parent: {
          groupId: 'groupId',
          artifactId: 'localyo',
          version: '1.0-LOCALYO',
        },
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem:bundle - initialize - invalid package', async (t) => {
  t.plan(1);

  const options = { defaults: false, generateInto: 'doesnotexist', package: 'Not/Allowed' };
  await helpers
    .create(NoWrite)
    .withOptions(options)
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.copyFileSync(path.join(project.fixturesRoot, 'yo-rc', 'parent-only', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        defaults: false,
        examples: true,
        package: 'prompted',
        moduleType: 'bundle',
        artifactId: 'prompted',
        parent: {
          groupId: 'com.test.localyo',
          artifactId: 'localyo',
          version: '1.0-LOCALYO',
        },
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem:bundle - initialize from pom - in directory', async (t) => {
  t.plan(1);

  const artifact = 'core.bundle';
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, artifact);

  await helpers
    .create(NoWrite)
    .withOptions({ destinationRoot: temporaryDir })
    .withPrompts(promptDefaults)
    .inDir(fullPath, (temporary) => {
      fs.copyFileSync(path.join(project.fixturesRoot, 'yo-rc', 'parent-only', '.yo-rc.json'), path.join(temporaryDir, '.yo-rc.json'));
      fs.copyFileSync(path.join(project.fixturesRoot, 'pom', 'full', 'pom.xml'), path.join(temporary, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        artifactId: 'pom.artifactid',
        moduleType: 'bundle',
        parent: {
          groupId: 'com.test.localyo',
          artifactId: 'localyo',
          version: '1.0-LOCALYO',
        },
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('@adobe/aem:bundle - initialize from pom - generateInto', async (t) => {
  t.plan(1);
  const subdir = 'subdir';
  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: subdir, parent })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      fs.mkdirSync(path.join(temporary, subdir));
      fs.copyFileSync(path.join(project.fixturesRoot, 'pom', 'full', 'pom.xml'), path.join(temporary, subdir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        name: 'Pom Name',
        artifactId: 'pom.artifactid',
        moduleType: 'bundle',
        parent,
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('@adobe/aem:bundle - initialize error - invalid moduleType', async (t) => {
  t.plan(1);
  await t.throwsAsync(
    helpers
      .create(NoWrite)
      .withOptions({ generateInto: 'core', parent })
      .inTmpDir((temporary) => {
        fs.copyFileSync(path.join(project.fixturesRoot, 'yo-rc', 'partial', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
      })
      .run()
  );
});

test('@adobe/aem:bundle - initialize from .yo-rc.json', async (t) => {
  t.plan(1);
  const prompts = _.omit(promptDefaults, ['package']);
  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: 'core', parent })
    .withPrompts(prompts)
    .inTmpDir((temporary) => {
      fs.copyFileSync(path.join(project.fixturesRoot, 'yo-rc', 'full', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        examples: true,
        name: 'Local Yo',
        appId: 'localyo',
        artifactId: 'localyo',
        package: 'com.test.localyo',
        moduleType: 'bundle',
        parent,
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('@adobe/aem:bundle - prompting', async (t) => {
  t.plan(1);

  await helpers
    .create(NoWrite)
    .withOptions({ parent })
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const actual = result.generator.props;
      const expected = { moduleType: 'bundle', parent };
      _.defaults(expected, promptDefaults);
      t.deepEqual(actual, expected, 'Properties set');
    });
});

test('@adobe/aem:bundle - configuring', async (t) => {
  t.plan(1);
  let temporaryDir;

  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: 'prompted' })
    .withPrompts(promptDefaults)
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
      fs.copyFileSync(path.join(project.fixturesRoot, 'yo-rc', 'parent-only', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then(() => {
      const expected = { moduleType: 'bundle' };
      _.defaults(expected, promptDefaults);
      const yoData = JSON.parse(fs.readFileSync(path.join(temporaryDir, '.yo-rc.json')));

      t.deepEqual(yoData['@adobe/generator-aem'].prompted, expected, 'Yeoman Data saved.');
    });
});

test('@adobe/aem:bundle - via @adobe/generator-aem - cloud', async (t) => {
  t.plan(5);

  const aemData = {
    artifactId: 'com.adobe.aem',
    groupId: 'aem-sdk-api',
    version: '2022.3.6698.20220318T233218Z-220400',
    path: 'com/adobe/aem/aem-sdk-api',
  };
  const fake = sinon.fake.resolves(aemData);
  sinon.replace(Utils, 'latestApi', fake);

  let temporaryDir;
  await helpers
    .create(path.join(project.generatorsRoot, 'app'))
    .withGenerators([[Wrapper, '@adobe/aem:bundle']])
    .withOptions({
      defaults: true,
      examples: true,
      aemVersion: 'cloud',
      modules: 'bundle',
    })
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
      fs.copyFileSync(path.join(project.fixturesRoot, 'yo-rc', 'parent-only', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const outputDir = path.join(temporaryDir, 'core');
      const pom = path.join(outputDir, 'pom.xml');
      result.assertFile(pom);
      const pomString = fs.readFileSync(pom, 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.test.localyo', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'localyo', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0-LOCALYO', 'Parent version set.');
      t.is(pomData.project.artifactId, 'localyo.core', 'ArtifactId set.');
      t.is(pomData.project.name, 'Local Yo - Core Bundle', 'Name set.');
      result.assertFileContent(pom, /<artifactId>aem-sdk-api<\/artifactId>/);

      sinon.restore();
    });
});

//
// test('@adobe/aem:bundle - existing bundle', (t) => {
//   t.fail('Not Implemented');
// });
//
// test('@adobe/aem:bundle - second bundle', (t) => {
//   t.fail('Not Implemented');
// });
