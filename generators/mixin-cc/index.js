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
import { generatorName as contentGeneratorName } from '../package-content/index.js';
import { generatorName as allGeneratorName } from '../package-all/index.js';

import BundleModuleCoreComponentMixin from './bundle/index.js';
import AppsPackageModuleCoreComponentMixin from './apps/index.js';
import ContentPackageModuleCoreComponentMixin from './content/index.js';
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
export const exampleContentGav = Object.freeze([{ groupId: [{ '#text': 'com.adobe.cq' }] }, { artifactId: [{ '#text': 'core.wcm.components.examples.ui.content' }] }, { type: [{ '#text': 'zip' }] }]);
export const exampleConfigGav = Object.freeze([{ groupId: [{ '#text': 'com.adobe.cq' }] }, { artifactId: [{ '#text': 'core.wcm.components.examples.ui.config' }] }, { type: [{ '#text': 'zip' }] }]);
export const exampleAppsGav = Object.freeze([{ groupId: [{ '#text': 'com.adobe.cq' }] }, { artifactId: [{ '#text': 'core.wcm.components.examples.ui.apps' }] }, { type: [{ '#text': 'zip' }] }]);

class CoreComponentMixinGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    const options_ = {
      defaults: {
        desc: 'Use all defaults for user input.',
      },
      examples: {
        desc: 'Include demo/example code and content.',
      },
      version: {
        type: String,
        desc: 'Version of the Core Components to use, use `latest` for always using latest release.',
      },
      bundlePath: {
        type: String,
        desc: 'Optional Bundle module reference, for adding dependency and unit test context.',
      },
      appsPath: {
        type: String,
        desc: 'Apps Package module reference, for adding proxy components.',
      },
      dataLayer: {
        desc: 'Flag to indicate if the Data Layer configuration should be enabled',
      },
      contentPath: {
        type: String,
        desc: 'Content Package module reference, for enabling data layer configuration proxy components.',
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
    this.availableBundles = ModuleMixins._findModules.bind(this, bundleGeneratorName)();
    this.availableApps = ModuleMixins._findModules.bind(this, appsGeneratorName)();
    this.availableContents = ModuleMixins._findModules.bind(this, contentGeneratorName)();

    if (this.options.parent === undefined && this.availableApps.length === 0) {
      throw new Error('Project must have at least one UI Apps module to use Core Component mixin.');
    }

    _.defaults(this.props, _.pick(this.options, ['examples', 'version', 'dataLayer']));

    this.props.bundles = this.options.bundlePath ? [this.options.bundlePath] : [];
    this.props.apps = this.options.appsPath ? [this.options.appsPath] : [];
    this.props.contents = this.options.contentPath ? [this.options.contentPath] : [];

    if (this.options.defaults) {
      _.defaults(this.props, {
        version: 'latest',
        dataLayer: true,
      });
    }

    const config = this.config.getAll();
    _.defaults(this.props, _.pick(config, ['examples', 'version', 'dataLayer']));

    if (config.bundles) {
      this.props.bundles = _.union(this.props.bundles, config.bundles);
    }

    if (config.apps) {
      this.props.apps = _.union(this.props.apps, config.apps);
    }

    if (config.contents) {
      this.props.contents = _.union(this.props.contents, config.contents);
    }
  }

  prompting() {
    const prompts = [
      {
        name: 'examples',
        message: 'Should examples be included in the generated projects?',
        type: 'confirm',
        when: () => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
            }

            resolve(this.props.examples === undefined);
          });
        },
        default: false,
      },
      {
        name: 'latest',
        message: "Do you want to  use the latest version of Core Components ('n' to select a version)?",
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
        message: 'Which version of Core Components do you want to use?',
        type: 'list',
        when: (answers) => {
          return new Promise((resolve) => {
            if (this.options.defaults || answers.latest || this.props.version === 'latest') {
              resolve(false);
              return;
            }

            resolve(true);
          });
        },
        choices: this._listVersions,
      },
      {
        name: 'dataLayer',
        message: 'Do you want to enable the Data Layer configuration in the content package?',
        type: 'confirm',
        when: () => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
            }

            resolve(this.props.dataLayer === undefined);
          });
        },
        default: true,
      },
      {
        name: 'bundles',
        message: 'Which bundle(s) modules should be updated to reference the Core Component dependency and add unit test context?',
        type: 'checkbox',
        when: () => {
          return new Promise((resolve) => {
            if (this.options.parent && this.props.bundles) {
              resolve(false);
              return;
            }

            resolve(this.props.bundles.length !== this.availableBundles.length);
          });
        },
        choices: () => {
          return new Promise((resolve) => {
            resolve(_.union(this.props.bundles, _.map(this.availableBundles, 'path')));
          });
        },
      },
      {
        name: 'apps',
        message: 'Which App module(s) should have the Core Component proxies added?',
        type: 'checkbox',
        when: () => {
          return new Promise((resolve) => {
            if (this.options.parent && this.props.apps) {
              resolve(false);
              return;
            }

            resolve(this.props.apps.length !== this.availableApps.length);
          });
        },
        choices: () => {
          return new Promise((resolve) => {
            resolve(_.union(this.props.apps, _.map(this.availableApps, 'path')));
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
        default: () => {
          return new Promise((resolve) => {
            if (this.props.apps.length > 0) {
              resolve(this.props.apps);
            } else {
              resolve(_.map(this.availableApps, 'path'));
            }
          });
        },
      },
      {
        name: 'contents',
        message: 'Which Content module(s) should have the Data Layer configuration added?',
        type: 'checkbox',
        when: (answers) => {
          return new Promise((resolve) => {
            if (!this.props.dataLayer && !answers.dataLayer) {
              resolve(false);
              return;
            }

            if (this.options.parent && this.props.contents) {
              resolve(false);
              return;
            }

            resolve(this.props.contents.length !== this.availableContents.length);
          });
        },
        choices: () => {
          return new Promise((resolve) => {
            resolve(_.union(this.props.contents, _.map(this.availableContents, 'path')));
          });
        },
        default: () => {
          return new Promise((resolve) => {
            if (this.props.contents.length > 0) {
              resolve(this.props.contents);
            } else {
              resolve(_.map(this.availableContents, 'path'));
            }
          });
        },
      },
    ];

    return this.prompt(prompts).then((answers) => {
      _.merge(this.props, _.pick(answers, ['examples', 'dataLayer', 'bundles', 'apps', 'contents']));
      if (!this.props.version) {
        this.props.version = answers.latest ? 'latest' : answers.ccVersion;
      }
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

      _.each(this.props.contents, (module) => {
        this.composeWith(
          {
            Generator: ContentPackageModuleCoreComponentMixin,
            path: path.join(dirname, 'content', 'index.js'),
          },
          {
            generateInto: module,
            dataLayer: this.props.dataLayer,
          }
        );
      });
      const allModule = ModuleMixins._findModules.call(this, allGeneratorName)[0];
      if (allModule) {
        const options = {
          generateInto: allModule.path,
          aemVersion: this.props.aemVersion,
        };

        if (this.props.examples) {
          options.examples = this.props.examples;
        }

        this.composeWith(
          {
            Generator: AllPackageModuleCoreComponentMixin,
            path: path.join(dirname, 'all', 'index.js'),
          },
          options
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
      return ModuleMixins._install.call(this, { cwd: this.destinationPath() });
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
      ccProp[versionProperty][0]['#text'] = this.props.resolvedVersion;
    } else {
      const prop = {};
      prop[versionProperty] = [{ '#text': this.props.resolvedVersion }];
      pomProperties.push(prop);
    }

    const pomDeps = PomUtils.findPomNodeArray(pom, 'project', 'dependencyManagement', 'dependencies');
    const bundle = { dependency: [..._.cloneDeep(bundleGav), versionStruct] };
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

    if (this.props.examples) {
      depsToAdd.splice(0, depsToAdd.length);
      let dep = { dependency: _.cloneDeep(exampleConfigGav) };
      dep.dependency.splice(2, 0, versionStruct);
      depsToAdd.push(dep);
      dep = { dependency: _.cloneDeep(exampleAppsGav) };
      dep.dependency.splice(2, 0, versionStruct);
      depsToAdd.push(dep);
      dep = { dependency: _.cloneDeep(exampleContentGav) };
      dep.dependency.splice(2, 0, versionStruct);
      depsToAdd.push(dep);
      const after = this.props.aemVersion === 'cloud' ? bundleGav : configGav;

      PomUtils.removeDependencies(pomDeps, depsToAdd);
      PomUtils.addDependencies(pomDeps, depsToAdd, after);
    }

    this.fs.write(pomFile, PomUtils.fixXml(builder.build(pom)));
  }
}

export default CoreComponentMixinGenerator;
