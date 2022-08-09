import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import _ from 'lodash';
import tempDirectory from 'temp-dir';

import sinon from 'sinon/pkg/sinon-esm.js';
import test from 'ava';

import ModuleMixins from '../../../lib/module-mixins.js';
import PomUtils from '../../../lib/pom-utils.js';
import { fixturePath } from '../../fixtures/helpers.js';

test('no modules in parent', (t) => {
  t.plan(1);
  const fake = sinon.fake.returns([]);
  sinon.replace(PomUtils, 'listParentPomModules', fake);
  const generator = {
    destinationRoot() {
      return fixturePath('projects', 'cloud', 'module');
    }
  };
  t.deepEqual(ModuleMixins._findModules.call(generator, 'unknown'), [], 'Empty list found');
  sinon.restore();
});

test('none of type', (t) => {
  t.plan(1);
  const fake = sinon.fake.returns(['other']);
  sinon.replace(PomUtils, 'listParentPomModules', fake);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'module');
  fs.mkdirSync(temporaryDir, { recursive: true });
  fs.mkdirSync(fullPath);
  fs.mkdirSync(path.join(temporaryDir, 'other'));
  fs.writeFileSync(path.join(temporaryDir, 'other', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': {} }));

  const generator = {
    destinationRoot() {
      return fullPath;
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
      }
    },
  };
  t.deepEqual(ModuleMixins._findModules.call(generator, 'unknown'), [], 'Empty list found');
  sinon.restore();
});

test('one of type', (t) => {
  t.plan(1);

  const fake = sinon.fake.returns(['found', 'other']);
  sinon.replace(PomUtils, 'listParentPomModules', fake);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'module');
  fs.mkdirSync(temporaryDir, { recursive: true });
  fs.mkdirSync(fullPath);
  fs.mkdirSync(path.join(temporaryDir, 'other'));
  fs.writeFileSync(path.join(temporaryDir, 'other', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': {} }));

  fs.mkdirSync(path.join(temporaryDir, 'found'));
  fs.writeFileSync(path.join(temporaryDir, 'found', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:wanted': { artifactId: 'test.found' } }));

  const generator = {
    destinationRoot() {
      return fullPath;
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
      }
    },
  };
  const expected = [{ path: 'found', artifactId: 'test.found' }];
  t.deepEqual(ModuleMixins._findModules.call(generator, '@adobe/generator-aem:wanted'), expected, 'List found');
  sinon.restore();
});

test('multiple of type', (t) => {
  t.plan(1);

  const fake = sinon.fake.returns(['alsofound', 'other', 'found']);
  sinon.replace(PomUtils, 'listParentPomModules', fake);

  const temporaryDir = path.join(tempDirectory, crypto.randomBytes(20).toString('hex'));
  const fullPath = path.join(temporaryDir, 'module');
  fs.mkdirSync(temporaryDir, { recursive: true });
  fs.mkdirSync(fullPath);
  fs.mkdirSync(path.join(temporaryDir, 'other'));
  fs.writeFileSync(path.join(temporaryDir, 'other', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:bundle': {} }));

  fs.mkdirSync(path.join(temporaryDir, 'found'));
  fs.writeFileSync(path.join(temporaryDir, 'found', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:wanted': { artifactId: 'test.found' } }));
  fs.mkdirSync(path.join(temporaryDir, 'alsofound'));
  fs.writeFileSync(path.join(temporaryDir, 'alsofound', '.yo-rc.json'), JSON.stringify({ '@adobe/generator-aem:wanted': { artifactId: 'test.alsofound' } }));

  const generator = {
    destinationRoot() {
      return fullPath;
    },
    fs: {
      exists(path) {
        return fs.existsSync(path);
      },
      read(path) {
        return fs.readFileSync(path, { encoding: 'utf8' });
      },
      readJSON(path) {
        return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
      }
    },
  };
  const expected = [{ path: 'alsofound', artifactId: 'test.alsofound' }, { path: 'found', artifactId: 'test.found' }];
  t.deepEqual(ModuleMixins._findModules.call(generator, '@adobe/generator-aem:wanted'), expected, 'Empty list found');
  sinon.restore();
});
