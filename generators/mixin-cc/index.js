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
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import _ from 'lodash';
import chalk from 'chalk';
import { Octokit } from '@octokit/rest';
import { XMLBuilder } from 'fast-xml-parser';

import Generator from 'yeoman-generator';

import PomUtils from '../../lib/pom-utils.js';
import ModuleMixins from '../../lib/module-mixins.js';

import { generatorName as rootGeneratorName, apiCoordinates } from '../app/index.js';
import { generatorName as bundleGeneratorName } from '../bundle/index.js';
import { generatorName as appsGeneratorName } from '../package-apps/index.js';
import { generatorName as allGeneratorName } from '../package-all/index.js';

import BundleModuleCoreComponentMixin from './bundle/index.js';
import AppsPackageModuleCoreComponentMixin from './apps/index.js';
import AllPackageModuleCoreComponentMixin from './all/index.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
export const generatorName = '@adobe/generator-aem:mixin-cc';

const versionProperty = 'core.wcm.components.version';
/* eslint-disable no-template-curly-in-string */
export const versionStruct = { version: [{ '#text': '${core.wcm.components.version}' }] };
/* eslint-enable no-template-curly-in-string */

export const bundleGav = Object.freeze([{ groupId: [{ '#text': 'com.adobe.cq' }] }, { artifactId: [{ '#text': 'core.wcm.components.core' }] }]);
export const testGav = Object.freeze([{ groupId: [{ '#text': 'com.adobe.cq' }] }, { artifactId: [{ '#text': 'core.wcm.components.testing.aem-mock-plugin' }] }, { scope: [{ '#text': 'test' }] }]);
export const contentGav = Object.freeze([{ groupId: [{ '#text': 'com.adobe.cq' }] }, { artifactId: [{ '#text': 'core.wcm.components.content' }] }, { type: [{ '#text': 'zip' }] }]);
export const configGav = Object.freeze([{ groupId: [{ '#text': 'com.adobe.cq' }] }, { artifactId: [{ '#text': 'core.wcm.components.config' }] }, { type: [{ '#text': 'zip' }] }]);

class CoreComponentMixinGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    const options_ = {
      defaults: {
        desc: 'Use all defaults for user input.',
      },
      bundleRef: {
        type: String,
        desc: 'Optional Bundle module reference, for adding dependency and unit test context.',
      },
      appsRef: {
        type: String,
        desc: 'Apps Package module reference, for adding proxy components.',
      },
      version: {
        type: String,
        desc: 'Version of the Core Components to use, use `latest` for always using latest release.',
      },
    };

    _.forOwn(options_, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function () {
      return generatorName;
    };
  }

  initializing() {
    this._setDestinationRoot();

    this.props = {};
    _.defaults(this.props, _.pick(this.options, 'defaults'));

    this.availableBundles = ModuleMixins._findModules.bind(this, bundleGeneratorName)();
    this.availableApps = ModuleMixins._findModules.bind(this, appsGeneratorName)();

    if (this.options.parent === undefined && this.availableApps.length === 0) {
      throw new Error('Project must have at least one UI Apps module to use Core Component mixin.');
    }

    let module = _.find(this.availableBundles, ['path', this.options.bundleRef]);
    if (module) {
      this.props.bundles = [module.path];
    }

    module = _.find(this.availableApps, ['path', this.options.appsRef]);
    if (module) {
      this.props.apps = [module.path];
    }

    if (this.options.defaults) {
      _.defaults(this.props, { version: 'latest', bundles: ['core'], apps: ['ui.apps'] });
    }

    const config = this.config.getAll();
    this.props.version = this.props.version || config.version;
    this.props.bundles = this.props.bundles || [];
    this.props.apps = this.props.apps || [];

    if (config.bundles) {
      this.props.bundles = _.union(this.props.bundles, config.bundles);
    }

    if (config.apps) {
      this.props.apps = _.union(this.props.apps, config.apps);
    }
  }

  prompting() {
    const prompts = [
      {
        name: 'latest',
        message: 'Use latest version of Core Components, or select a version?',
        type: 'confirm',
        when: () => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
              return;
            }

            resolve(this.props.version === undefined);
          });
        },
        default: true,
      },
      {
        // Needs to be different than 'version' due to overlap with root generator.
        name: 'ccVersion',
        message: 'Select version of Core Components to use:',
        type: 'list',
        when(answers) {
          return new Promise((resolve) => {
            resolve(!answers.latest);
          });
        },
        choices: this._listVersions,
      },

      {
        name: 'bundles',
        message: 'Optional Bundle module reference(s), for adding dependency and unit test context.',
        type: 'checkbox',
        when: () => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
              return;
            }

            resolve(this.props.bundles.length === 0 && this.availableBundles.length > 0);
          });
        },
        choices: () => {
          return new Promise((resolve) => {
            resolve(_.map(this.availableBundles, 'path'));
          });
        },
      },
      {
        name: 'apps',
        message: 'App module reference(s), for adding proxy components.',
        type: 'checkbox',
        when: () => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
              return;
            }

            resolve(this.props.apps.length === 0);
          });
        },
        choices: () => {
          return new Promise((resolve) => {
            resolve(_.map(this.availableApps, 'path'));
          });
        },
        validate(chosen) {
          return new Promise((resolve) => {
            if (chosen && chosen.length > 0) {
              resolve(true);
              return;
            }

            resolve('At least one Apps module reference must be provided.');
          });
        },
      },
    ];

    return this.prompt(prompts).then((answers) => {
      _.merge(this.props, _.pick(answers, ['bundles', 'apps']));
      this.props.version = answers.latest ? 'latest' : answers.ccVersion;
    });
  }

  configuring() {
    ModuleMixins._configuring.call(this);
  }

  default() {
    this.props.aemVersion = this.fs.readJSON(this.destinationPath('.yo-rc.json'))[rootGeneratorName].aemVersion;
    return this._resolveVersion().then((ccVersion) => {
      this.props.resolvedVersion = ccVersion;
      // Run the specific mixin for each module.
      _.each(this.props.bundles, (module) => {
        this.composeWith(
          {
            Generator: BundleModuleCoreComponentMixin,
            path: path.join(dirname, 'bundle', 'index.js'),
          },
          {
            generateInto: module,
            aemVersion: this.props.aemVersion,
          }
        );
      });
      _.each(this.props.apps, (module) => {
        this.composeWith(
          {
            Generator: AppsPackageModuleCoreComponentMixin,
            path: path.join(dirname, 'apps', 'index.js'),
          },
          {
            generateInto: module,
            aemVersion: this.props.aemVersion,
            version: ccVersion,
          }
        );
      });
      if (this.props.aemVersion !== 'cloud') {
        const allModule = ModuleMixins._findModules.call(this, allGeneratorName);
        this.composeWith(
          {
            Generator: AllPackageModuleCoreComponentMixin,
            path: path.join(dirname, 'all', 'index.js'),
          },
          {
            generateInto: allModule.path,
          }
        );
      }
    });
  }

  writing() {
    this._writePom();
  }

  install() {
    // Make sure build is run with this new/updated module
    if (this.env.rootGenerator() === this) {
      return ModuleMixins._install.call(this, { cwd: this.destinationRoot() });
    }
  }

  _setDestinationRoot() {
    let yorcFile = this.destinationPath('.yo-rc.json');
    if (this.fs.exists(yorcFile) && this.fs.readJSON(yorcFile)[rootGeneratorName] !== undefined) {
      return;
    }

    this.destinationRoot(path.dirname(this.destinationPath()));
    yorcFile = this.destinationPath('.yo-rc.json');
    if (!this.fs.exists(yorcFile) || this.fs.readJSON(yorcFile)[rootGeneratorName] === undefined) {
      throw new Error(
        chalk.red(`${this.moduleName} Generator cannot be use outside existing project context.`) +
          '\n\n' +
          `You are trying to use the ${this.moduleName} Generator without the context of a parent project.\n` +
          'This is not a supported feature. Please either: \n\n' +
          '\t * Run in the context of a project previously created using: ' +
          chalk.yellow('yo @adobe/aem') +
          ', or\n' +
          `\t * Run ${this.moduleName} Generator from existing AEM project root, by using: ` +
          chalk.yellow('yo @adobe/aem --modules <<module type>>') +
          '.'
      );
    }
  }

  _listVersions() {
    return readdir(path.join(dirname, 'apps', 'versions'), { withFileTypes: true }).then((dirent) => {
      return dirent
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort((l, r) => Number.parseFloat(r) - Number.parseFloat(l));
    });
  }

  _resolveVersion() {
    if (this.props.version === 'latest') {
      return this._listVersions().then((versions) => {
        return this._ccVersion(versions[0]);
      });
    }

    return this._ccVersion(this.props.version);
  }

  _ccVersion = (version) => {
    const octokit = new Octokit();
    return octokit.repos
      .listReleases({ owner: 'adobe', repo: 'aem-core-wcm-components' })
      .then((response) => {
        return _.map(response.data, (release) => release.tag_name.replace(/^.*(\d+\.\d+\.\d+)$/, '$1'));
      })
      .then((releases) => {
        return _.remove(releases, (r) => {
          const regex = new RegExp(`(${version}\\.\\d+)`);
          return r.match(regex);
        })[0];
      });
  };

  _writePom() {
    const builder = new XMLBuilder(PomUtils.xmlOptions);
    const pomFile = this.destinationPath('pom.xml');

    const pom = PomUtils.readPom(this);
    const pomProperties = PomUtils.findPomNodeArray(pom, 'project', 'properties');

    const ccProp = _.find(pomProperties, (item) => _.has(item, versionProperty));
    if (ccProp) {
      ccProp[0]['#text'] = this.props.resolvedVersion;
    } else {
      const prop = {};
      prop[versionProperty] = [{ '#text': this.props.resolvedVersion }];
      pomProperties.push(prop);
    }

    const pomDeps = PomUtils.findPomNodeArray(pom, 'project', 'dependencyManagement', 'dependencies');
    const bundle = { dependency: _.cloneDeep(bundleGav) };
    bundle.dependency.push(versionStruct);
    const content = { dependency: _.cloneDeep(contentGav) };
    content.dependency.splice(2, 0, versionStruct);
    const config = { dependency: _.cloneDeep(configGav) };
    config.dependency.splice(2, 0, versionStruct);
    const test = { dependency: _.cloneDeep(testGav) };
    test.dependency.splice(2, 0, versionStruct);

    // Just remove the CC dependencies, and re-add them - easier than trying to merge, esp if upgrading.
    PomUtils.removeDependencies(pomDeps, [bundle, content, config, test]);

    const depsToAdd = [bundle];
    if (this.props.aemVersion !== 'cloud') {
      depsToAdd.push(content, config);
    }

    PomUtils.addDependencies(pomDeps, depsToAdd, apiCoordinates(this.props.aemVersion));
    PomUtils.addDependencies(pomDeps, [test], { groupId: 'org.apache.sling', artifactId: 'org.apache.sling.testing.caconfig-mock-plugin' });
    this.fs.write(pomFile, PomUtils.fixXml(builder.build(pom)));
  }
}

export default CoreComponentMixinGenerator;
