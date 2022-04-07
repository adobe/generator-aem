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

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import test from 'ava';

import helpers from 'yeoman-test';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const projectRoot = path.join(dirname, '..', '..', '..');
const generatorPath = path.join(projectRoot, 'tests', 'fixtures', 'generators', 'simple');
const yorcDir = path.join(projectRoot, 'tests', 'fixtures', 'yo-rc');
const pomDir = path.join(projectRoot, 'tests', 'fixtures', 'pom');

test('no options set', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .run()
    .then((result) => {
      const expected = { added: 'Added' };
      t.deepEqual(result.generator.props, expected, 'Content matches.');
    });
});

test('defaults set', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .withOptions({ defaults: true })
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: false,
        added: 'Added',
      };
      t.deepEqual(result.generator.props, expected, 'Content matches.');
    });
});

test('defaults with appId', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .withOptions({ defaults: true, appId: 'defaultsid' })
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: false,
        appId: 'defaultsid',
        artifactId: 'defaultsid',
        added: 'Added',
      };
      t.deepEqual(result.generator.props, expected, 'Content matches.');
    });
});

test('defaults - uses provided', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .withOptions({
      defaults: true,
      examples: false,
      appId: 'defaultsid',
      artifactId: 'notdefaultid',
    })
    .run()
    .then((result) => {
      const expected = {
        defaults: true,
        examples: false,
        appId: 'defaultsid',
        artifactId: 'notdefaultid',
        added: 'Added',
      };
      t.deepEqual(result.generator.props, expected, 'Content matches.');
    });
});

test('reads yo-rc', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .inTmpDir((dir) => {
      fs.copyFileSync(path.join(yorcDir, 'full', '.yo-rc.json'), path.join(dir, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        examples: false,
        added: 'Added',
        name: 'Local Yo',
        appId: 'localyo',
        artifactId: 'localyo',
      };
      t.deepEqual(result.generator.props, expected, 'Options set');
    });
});

test('reads yo-rc - with parent', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .withOptions({ generateInto: 'simple' })
    .inTmpDir((dir) => {
      fs.copyFileSync(path.join(yorcDir, 'full', '.yo-rc.json'), path.join(dir, '.yo-rc.json'));
    })
    .run()
    .then((result) => {
      const expected = {
        added: 'Added',
        parent: {
          examples: false,
          name: 'Local Yo',
          appId: 'localyo',
          artifactId: 'localyo',
        },
      };
      t.deepEqual(result.generator.props, expected, 'Options set');
    });
});

test('reads pom', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .inTmpDir((dir) => {
      fs.copyFileSync(path.join(pomDir, 'full', 'pom.xml'), path.join(dir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        added: 'Added',
        name: 'Pom Name',
        artifactId: 'pom.artifactid',
      };
      t.deepEqual(result.generator.props, expected, 'Options set');
    });
});

test('reads pom - with parent', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .withOptions({ generateInto: 'simple' })
    .inTmpDir((dir) => {
      fs.copyFileSync(path.join(pomDir, 'full', 'pom.xml'), path.join(dir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        added: 'Added',
        parent: {
          name: 'Pom Name',
          artifactId: 'pom.artifactid',
        },
      };
      t.deepEqual(result.generator.props, expected, 'Options set');
    });
});

test('merges configs - no subconfig', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .withOptions({ generateInto: 'simple' })
    .inTmpDir((dir) => {
      fs.mkdirSync(path.join(dir, 'simple'));
      fs.copyFileSync(path.join(yorcDir, 'full', '.yo-rc.json'), path.join(dir, '.yo-rc.json'));
      fs.copyFileSync(path.join(pomDir, 'full', 'pom.xml'), path.join(dir, 'simple', 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        added: 'Added',
        name: 'Pom Name',
        artifactId: 'pom.artifactid',
        parent: {
          examples: false,
          name: 'Local Yo',
          appId: 'localyo',
          artifactId: 'localyo',
        },
      };
      t.deepEqual(result.generator.props, expected, 'Options set');
    });
});

test('merges configs - module subconfig', async (t) => {
  t.plan(1);

  await helpers
    .create(path.join(generatorPath))
    .withOptions({ generateInto: 'simple' })
    .inTmpDir((dir) => {
      fs.mkdirSync(path.join(dir, 'simple'));
      fs.copyFileSync(path.join(yorcDir, 'tree', '.yo-rc.json'), path.join(dir, '.yo-rc.json'));
      fs.copyFileSync(path.join(pomDir, 'full', 'pom.xml'), path.join(dir, 'pom.xml'));
    })
    .run()
    .then((result) => {
      const expected = {
        added: 'Added',
        name: 'Local Yo',
        appId: 'localyo',
        artifactId: 'localyo',
        parent: {
          name: 'Pom Name',
          artifactId: 'pom.artifactid',
        },
      };
      t.deepEqual(result.generator.props, expected, 'Options set');
    });
});
