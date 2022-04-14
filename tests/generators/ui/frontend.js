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
import AEMUIFrontendGenerator from '../../../generators/ui/frontend/index.js';
import Utils from '../../../lib/utils.js';

const generatorPath = path.join(project.generatorsRoot, 'ui', 'frontend');

path.join(project.generatorsRoot, 'ui', 'apps');

class Wrapper extends AEMUIFrontendGenerator {
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


test('@adobe/aem:ui:frontend - requires parent', async (t) => {
  t.plan(1);
  const options = { defaults: true };
  await t.throwsAsync(helpers.create(NoWrite).withOptions(options).withPrompts(promptDefaults).run());
});


test('@adobe/aem:ui:frontend - requires destination', async (t) => {
  t.plan(1);
  await t.throwsAsync(helpers.create(NoWrite).withOptions({ parent }).withPrompts(promptDefaults).run());
});

test('@adobe/aem:ui:frontend - initialize - no options', async (t) => {
  t.plan(1);
  await helpers
    .create(NoWrite)
    .withOptions({ generateInto: 'test', parent })
    .withPrompts(promptDefaults)
    .run()
    .then((result) => {
      const expected = {
        parent,
        moduleType: 'ui:frontend',
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set');
    });
});


test('@adobe/aem:ui:frontend - initialize - defaults', async (t) => {
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
        moduleType: 'ui:frontend',
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


test('@adobe/aem:ui:frontend - initialize from pom - in directory', async (t) => {
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
        moduleType: 'ui:frontend',
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


test('@adobe/aem:ui:frontend - initialize from pom - generateInto', async (t) => {
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
        moduleType: 'ui:frontend',
        parent,
      };
      _.defaults(expected, promptDefaults);
      t.deepEqual(result.generator.props, expected, 'Properties set.');
    });
});
