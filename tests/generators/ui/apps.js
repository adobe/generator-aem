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

import fs from 'node:fs';
import crypto from 'node:crypto';
import test from 'ava';

import helpers from 'yeoman-test';
import _ from 'lodash';
import { XMLParser } from 'fast-xml-parser';
import tempDirectory from 'temp-dir';
import sinon from 'sinon/pkg/sinon-esm.js';

import project from '../../fixtures/helpers.js';
import AEMUIAppsGenerator from '../../../generators/ui/apps/index.js';
import Utils from '../../../lib/utils.js';

const generatorPath = path.join(project.generatorsRoot, 'ui', 'apps');

class Wrapper extends AEMUIAppsGenerator {
  constructor(args, options, features) {
    options.resolved = path.join(generatorPath, 'index.js');
    super(args, options, features);
  }

  initializing() {
    return super.initializing();
  }

  prompting() {
    return super.prompting();
  }

  configuring() {
    return super.configuring();
  }

  default() {
    return super.default();
  }

  writing() {
    return super.writing();
  }
}

class NoWrite extends Wrapper {
  initializing() {
    return super.initializing();
  }

  prompting() {
    return super.prompting();
  }

  configuring() {
    return super.configuring();
  }
}

const promptDefaults = Object.freeze({
  examples: true,
  name: 'prompted',
  appId: 'prompted',
  artifactId: 'prompted',
});

const parent = {
  groupId: 'parent',
  artifactId: 'parent',
  version: 'parent',
  aemVersion: 'parent',
};

test('@adobe/aem:ui:apps - requires parent', async (t) => {
  t.plan(1);
  const options = { defaults: true };
  await t.throwsAsync(helpers.create(NoWrite).withOptions(options).withPrompts(promptDefaults).run());
});

test('@adobe/aem:ui:apps - requires destination', async (t) => {
  t.plan(1);
  await t.throwsAsync(helpers.create(NoWrite).withOptions({ parent }).withPrompts(promptDefaults).run());
});

test('@adobe/aem:ui:apps - initialize - no options', async (t) => {
  t.plan(1);
  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: 'test', parent })
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const expected = {
        parent,
        moduleType: 'ui:apps',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem:ui:apps - initialize - defaults', async (t) => {
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
        moduleType: 'ui:apps',
        artifactId: 'prompted.doesnotexist',
        parent: {
          groupId: 'groupId',
          artifactId: 'localyo',
          version: '1.0-LOCALYO',
          aemVersion: 'localyo',
        },
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});

test('@adobe/aem:ui:apps - initialize from pom - in directory', async (t) => {
  t.plan(1);

  const artifact = 'ui.apps';
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
        moduleType: 'ui:apps',
        parent: {
          groupId: 'com.test.localyo',
          artifactId: 'localyo',
          version: '1.0-LOCALYO',
          aemVersion: 'localyo',
        },
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('@adobe/aem:ui:apps - initialize from pom - generateInto', async (t) => {
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
        moduleType: 'ui:apps',
        parent,
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('@adobe/aem:ui:apps - initialize error - invalid moduleType', async (t) => {
  t.plan(1);
  await t.throwsAsync(
    helpers
      .create(NoWrite)
      .withOptions({ generateInto: 'ui.apps', parent })
      .inTmpDir((temporary) => {
        fs.copyFileSync(path.join(project.fixturesRoot, 'yo-rc', 'partial', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
      })
      .run()
  );
});

test('@adobe/aem:ui:apps - initialize from .yo-rc.json', async (t) => {
  t.plan(1);
  const prompts = _.omit(promptDefaults, ['package']);
  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: 'ui.apps', parent })
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
        moduleType: 'ui:apps',
        parent,
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});

test('@adobe/aem:ui:apps - prompting', async (t) => {
  t.plan(1);

  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: 'ui.apps', parent })
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const actual = result.generator.props;
      const expected = { moduleType: 'ui:apps', parent };
      _.defaults(expected, promptDefaults);
      t.deepEqual(actual, expected, 'Properties set');
    });
});

test('@adobe/aem:ui:apps - configuring', async (t) => {
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
      const expected = { moduleType: 'ui:apps' };
      _.defaults(expected, promptDefaults);
      const yoData = JSON.parse(fs.readFileSync(path.join(temporaryDir, '.yo-rc.json')));

      t.deepEqual(yoData['@adobe/generator-aem'].prompted, expected, 'Yeoman Data saved.');
    });
});

test.serial('@adobe/aem:ui:apps - via @adobe/generator-aem - v6.5', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'uber-jar',
    version: '6.5.12',
    path: 'com/adobe/aem/uber-jar',
  };
  const stub = sinon.stub().resolves(aemData);
  sinon.replace(Utils, 'latestApi', stub);

  let temporaryDir;
  await helpers
    .create(path.join(project.generatorsRoot, 'app'))
    .withGenerators([
      path.join(project.generatorsRoot, 'bundle'),
      [Wrapper, '@adobe/aem:ui:apps'],
    ])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: '6.5',
      modules: 'bundle,ui:apps',
      showBuildOutput: false,
    })
    .inTmpDir((temporary) => {
      temporaryDir = temporary;
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
      const moduleDir = path.join(outputRoot, 'ui.apps');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>ui.apps<\/module>/);

      const pom = path.join(moduleDir, 'pom.xml');
      result.assertFile(pom);
      const pomString = fs.readFileSync(pom, 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });

      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, properties.groupId, 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'test.ui.apps', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - UI Apps Bundle', 'Name set.');
      result.assertFileContent(pom, /<artifactId>test.core<\/artifactId>/);

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.ui.apps-${properties.version}.zip`));
    });
});
