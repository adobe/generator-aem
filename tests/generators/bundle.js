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

import { AEMAppWrapper } from '../fixtures/wrappers/index.js';

const generatorPath = path.join(project.generatorsRoot, 'bundle');

class Wrapper extends AEMBundleGenerator {
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
  package: 'prompted',
});

const parent = {
  groupId: 'parent',
  artifactId: 'parent',
  version: 'parent',
  aemVersion: 'parent',
};

test('@adobe/aem:bundle - requires parent', async (t) => {
  t.plan(1);
  const options = { defaults: true };
  await t.throwsAsync(helpers.create(NoWrite).withOptions(options).withPrompts(promptDefaults).run());
});

test('@adobe/aem:bundle - requires destination', async (t) => {
  t.plan(1);
  await t.throwsAsync(helpers.create(NoWrite).withOptions({ parent }).withPrompts(promptDefaults).run());
});

test('@adobe/aem:bundle - initialize - no options', async (t) => {
  t.plan(1);
  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: 'test', parent })
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
          aemVersion: 'localyo',
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
          aemVersion: 'localyo',
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
          aemVersion: 'localyo',
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
    .withOptions({ generateInto: 'core', parent })
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

test.serial('@adobe/aem:bundle - via @adobe/generator-aem - cloud', async (t) => {
  t.plan(5);

  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    version: '2022.3.6698.20220318T233218Z-220400',
    path: 'com/adobe/aem/aem-sdk-api',
  };
  const stub = sinon.stub().resolves(aemData);
  sinon.replace(Utils, 'latestApi', stub);

  let temporaryDir;
  await helpers
    .create(path.join(project.generatorsRoot, 'app'))
    .withGenerators([[Wrapper, '@adobe/aem:bundle']])
    .withOptions({
      defaults: true,
      examples: true,
      appId: 'test',
      name: 'Test Project',
      groupId: 'com.adobe.test',
      aemVersion: 'cloud',
      modules: 'bundle',
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
      const moduleDir = path.join(outputRoot, 'core');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>core<\/module>/);

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
      t.is(pomData.project.artifactId, 'test.core', 'ArtifactId set.');
      t.is(pomData.project.name, 'Test Project - Core Bundle', 'Name set.');
      result.assertFileContent(pom, /<artifactId>aem-sdk-api<\/artifactId>/);

      const classesRoot = path.join(moduleDir, 'src', 'main', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(classesRoot, 'package-info.java'));
      result.assertFile(path.join(classesRoot, 'filters', 'LoggingFilter.java'));
      result.assertFile(path.join(classesRoot, 'listeners', 'SimpleResourceListener.java'));
      result.assertFile(path.join(classesRoot, 'schedulers', 'SimpleScheduledTask.java'));
      result.assertFile(path.join(classesRoot, 'servlets', 'SimpleServlet.java'));

      const testsRoot = path.join(moduleDir, 'src', 'test', 'java', 'com', 'adobe', 'test');
      result.assertFile(path.join(testsRoot, 'filters', 'LoggingFilterTest.java'));
      result.assertFile(path.join(testsRoot, 'listeners', 'SimpleResourceListenerTest.java'));
      result.assertFile(path.join(testsRoot, 'schedulers', 'SimpleScheduledTaskTest.java'));
      result.assertFile(path.join(testsRoot, 'servlets', 'SimpleServletTest.java'));

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}.core-${properties.version}.jar`));

      result.assertFile(path.join(moduleDir, 'src', 'main', 'bnd', `${properties.artifactId}.core.bnd`));
    });
});

test.serial('@adobe/aem:bundle - second bundle', async (t) => {
  const aemData = {
    groupId: 'com.adobe.aem',
    artifactId: 'aem-sdk-api',
    version: '2022.3.6698.20220318T233218Z-220400',
    path: 'com/adobe/aem/aem-sdk-api',
  };
  const stub = sinon.stub().resolves(aemData);
  sinon.replace(Utils, 'latestApi', stub);
  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'test');

  await helpers
    .create(Wrapper)
    .withGenerators([[AEMAppWrapper, '@adobe/aem:app']])
    .withOptions({
      defaults: true,
      examples: false,
      generateInto: 'bundle',
      appId: 'bundle',
      name: 'Second Bundle',
      package: 'com.adobe.test.bundle',
      showBuildOutput: false,
    })
    .inDir(fullPath, (temporary) => {
      fs.copyFileSync(path.join(project.fixturesRoot, 'projects', 'pom.xml'), path.join(temporary, 'pom.xml'));
      fs.copyFileSync(path.join(project.fixturesRoot, 'projects', '.yo-rc.json'), path.join(temporary, '.yo-rc.json'));
      fs.cpSync(path.join(project.fixturesRoot, 'projects', 'core'), path.join(temporary, 'core'), { recursive: true });
    })
    .run()
    .then((result) => {
      sinon.restore();
      const properties = result.generator.props;
      const outputRoot = path.join(temporaryDir, 'test');
      const moduleDir = path.join(outputRoot, 'bundle');
      result.assertFileContent(path.join(outputRoot, 'pom.xml'), /<module>bundle<\/module>/);

      const pom = path.join(moduleDir, 'pom.xml');
      result.assertFile(pom);
      const pomString = fs.readFileSync(pom, 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: true,
        ignoreDeclaration: true,
      });
      const pomData = parser.parse(pomString);
      t.is(pomData.project.parent.groupId, 'com.adobe.test', 'Parent groupId set.');
      t.is(pomData.project.parent.artifactId, 'test', 'Parent artifactId set.');
      t.is(pomData.project.parent.version, '1.0.0-SNAPSHOT', 'Parent version set.');
      t.is(pomData.project.artifactId, 'bundle', 'ArtifactId set.');
      t.is(pomData.project.name, 'Second Bundle', 'Name set.');
      result.assertFileContent(pom, /<artifactId>aem-sdk-api<\/artifactId>/);

      const classesRoot = path.join(moduleDir, 'src', 'main', 'java', 'com', 'adobe', 'test', 'bundle');
      result.assertFile(path.join(classesRoot, 'package-info.java'));
      result.assertNoFile(path.join(classesRoot, 'filters', 'LoggingFilter.java'));
      result.assertNoFile(path.join(classesRoot, 'listeners', 'SimpleResourceListener.java'));
      result.assertNoFile(path.join(classesRoot, 'schedulers', 'SimpleScheduledTask.java'));
      result.assertNoFile(path.join(classesRoot, 'servlets', 'SimpleServlet.java'));

      const testsRoot = path.join(moduleDir, 'src', 'test', 'java', 'com', 'adobe', 'test');
      result.assertNoFile(path.join(testsRoot, 'filters', 'LoggingFilterTest.java'));
      result.assertNoFile(path.join(testsRoot, 'listeners', 'SimpleResourceListenerTest.java'));
      result.assertNoFile(path.join(testsRoot, 'schedulers', 'SimpleScheduledTaskTest.java'));
      result.assertNoFile(path.join(testsRoot, 'servlets', 'SimpleServletTest.java'));

      result.assertFile(path.join(moduleDir, 'target', `${properties.artifactId}-${properties.parent.version}.jar`));

      result.assertFile(path.join(moduleDir, 'src', 'main', 'bnd', `${properties.artifactId}.bnd`));
    });
});

// Test('@adobe/aem:bundle - existing bundle', (t) => {
//   t.fail('Not Implemented');
// });
