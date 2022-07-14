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
import { fileURLToPath } from 'node:url';

import fs from 'node:fs';
import _ from 'lodash';
import chalk from 'chalk';
import ejs from 'ejs';

import Generator from 'yeoman-generator';

import { Octokit } from '@octokit/rest';

import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { globbySync } from 'globby';
import { BundleModuleType } from '../bundle/index.js';
import { AppsPackageModuleType } from '../package-apps/index.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const octokit = new Octokit();

const CoreComponentMixinModuleType = 'mixin-cc';

const unique = ['bundles', 'apps', 'version'];
const ccPomProperty = 'core.wcm.components.version';
const repo = Object.freeze({ owner: 'adobe', repo: 'aem-core-wcm-components' });
/* eslint-disable no-template-curly-in-string */

const xmlOptions = {
  preserveOrder: true,
  format: true,
  ignoreAttributes: false,
  commentPropName: '#comment',
};

const versionGav =  { version: [{ '#text': '${core.wcm.components.version}' }] };
const bundleDep = Object.freeze({
  dependency: [
    { groupId: [{ '#text': 'com.adobe.cq' }] },
    { artifactId: [{ '#text': 'core.wcm.components.core' }] },
  ],
});
const contentDep = Object.freeze({
  dependency: [
    { groupId: [{ '#text': 'com.adobe.cq' }] },
    { artifactId: [{ '#text': 'core.wcm.components.content' }] },
    { type: [{ '#text': 'zip' }] },
  ],
});
const configDep = Object.freeze({
  dependency: [
    { groupId: [{ '#text': 'com.adobe.cq' }] },
    { artifactId: [{ '#text': 'core.wcm.components.config' }] },
    { type: [{ '#text': 'zip' }] },
  ],
});
/* eslint-enable no-template-curly-in-string */

class CoreComponentMixinGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    this.moduleType = CoreComponentMixinModuleType;
    this._moduleOptions = {
      defaults: {
        desc: 'Use all defaults for user input.',
      },
      bundles: {
        type(arg) {
          return arg.split(',');
        },
        desc: 'Bundle module reference(s), for adding dependency and unit test context.',
      },
      apps: {
        type(arg) {
          return arg.split(',');
        },
        desc: 'Apps Package module reference(s), for adding proxy components.',
      },
    };

    _.forOwn(this._moduleOptions, (v, k) => {
      this.option(k, v);
    });
  }

  initializing() {
    this.props = {};
    _.defaults(this.props, _.pick(this.options, unique));

    const config = this.config.get(CoreComponentMixinModuleType);
    _.defaults(this.props, config);

    _.remove(this.props.bundles, (module) => {
      const modConfig = this.config.get(module);
      return !modConfig || modConfig.moduleType !== BundleModuleType;
    });

    if (this.props.bundles && this.props.bundles.length === 0) {
      delete this.props.bundles;
    }

    _.remove(this.props.apps, (module) => {
      const modConfig = this.config.get(module);
      return !modConfig || modConfig.moduleType !== AppsPackageModuleType;
    });

    if (this.props.apps && this.props.apps.length === 0) {
      delete this.props.apps;
    }
  }

  prompting() {
    const config = this.config.getAll();
    const bundleModules = [];
    const appsModules = [];
    _.forOwn(config, (value, key) => {
      if (value.moduleType) {
        switch (value.moduleType) {
          case BundleModuleType: {
            bundleModules.push(key);
            break;
          }

          case AppsPackageModuleType: {
            appsModules.push(key);
            break;
          }
          // No Default
        }
      }
    });

    if (!this.props.apps && appsModules.length === 0) {
      throw new Error('Project must have at least one UI Apps module to use Core Component mixin.');
    }

    const prompts = [
      {
        name: 'bundles',
        message: 'Bundle module reference(s), for adding dependency and unit test context.',
        type: 'checkbox',
        choices() {
          return new Promise((resolve) => {
            resolve([
              { value: 'None' },
              ..._.map(bundleModules, (name) => {
                return { value: name };
              }),
            ]);
          });
        },
        default: [0],
        when: !this.props.bundles && bundleModules.length > 0,
      },
      {
        name: 'apps',
        message: 'Apps Package module reference(s), for adding proxy components.',
        type: 'checkbox',
        choices() {
          return new Promise((resolve) => {
            resolve(
              _.map(appsModules, (name) => {
                return { value: name };
              })
            );
          });
        },
        when: !this.props.apps && appsModules.length > 1,
        default: [0],
      },
    ];

    return this._ccVersion()
      .then((releases) => {
        this.props.version = releases[0];
        return this.prompt(prompts);
      })
      .catch((error) => {
        throw new Error(chalk.red('Unable to retrieve Core Component versions, error was:\n\n\t') + chalk.yellow(error.message));
      })
      .then((answers) => {
        this.props.bundles = _.map(answers.bundles, (idx) => bundleModules[idx]);

        this.props.apps = appsModules.length === 1 ? appsModules : _.map(answers.apps, (idx) => appsModules[idx]);
      });
  }

  configuring() {
    const current = this.config.get(CoreComponentMixinModuleType) || {};
    _.merge(current, this.props);
    this.config.set(CoreComponentMixinModuleType, current);
  }

  writing() {

    const isCloud = this.config.get('aemVersion') === 'cloud';
    // For each module; update the pom to add the CC dependency.
    const promises = [];
    promises.push(this._processRoot(isCloud));

    _.each(this.props.bundles, (module) => {
      promises.push(this._processCore(module, isCloud));
    });

    _.each(this.props.apps, (module) => {
      promises.push(this._processApps(module, isCloud));
    });
    promises.push(this._processAll(isCloud));

    return Promise.all(promises);
  }

  /**
   * Returns a Promise that will resolve to latest the available Core Components version in GitHub.
   */
  _ccVersion = () => {
    return octokit.repos
      .listReleases(repo)
      .then((response) => {
        return _.map(response.data, 'tag_name');
      })
      .then((releases) => {
        return _.remove(releases, (r) => {
          return r.match(/(\d+\.\d+\.\d+)/);
        }).splice(0, 1);
      });
  };

  /**
   * Processes the root pom to add CC dependencies and version.
   */
  _processRoot = (isCloud) => {
    return new Promise((resolve) => {
      const pom = this.destinationPath('pom.xml');
      const parsed = this._readPom(pom);
      const project = _.find(parsed, (item) => _.has(item, 'project')).project;
      // Find and add/update version property
      const properties = _.find(project, (item) => _.has(item, 'properties')).properties;

      let ccRef = _.find(properties, (item) => _.has(item, ccPomProperty));
      if (ccRef) {
        ccRef[0]['#text'] = this.props.version;
      } else {
        ccRef = {};
        ccRef[ccPomProperty] = [{ '#text': this.props.version }];
        properties.push(ccRef);
      }

      // Find and add dependencies if necessary.
      const dependencies = _.find(project, (item) => _.has(item, 'dependencyManagement')).dependencyManagement[0].dependencies;
      let dep;
      if (!isCloud) {
        dep = _.cloneDeep(configDep)
        dep.dependency.splice(2, 0, versionGav);
        this._insertDependency(dependencies, dep);
        dep = _.cloneDeep(contentDep)
        dep.dependency.splice(2, 0, versionGav);
        this._insertDependency(dependencies, dep);
      }
      dep = _.cloneDeep(bundleDep)
      dep.dependency.splice(2, 0, versionGav);
      this._insertDependency(dependencies, dep);
      this._writePom(pom, parsed);
      resolve();
    });
  };

  _processApps = (module, isCloud) => {
    const fileVersion = this.props.version.match(/(\d+\.\d+)\.\d+/)[1];
    const componentFile = path.join(dirname, 'components', fileVersion, 'components.json');
    if (!fs.existsSync(componentFile)) {
      throw new Error(`Unable to find Core Component list for version ${fileVersion}`);
    }

    const componentGroups = JSON.parse(fs.readFileSync(componentFile));
    const appId = this.config.get(module).appId;
    const tplProperties = {
      projName: this.config.get('name'),
      appId,
    };

    const outputRoot = path.join(this.destinationPath(module, 'src', 'main', 'content', 'jcr_root', 'apps', appId, 'components'));

    const promises = [];
    _.each(componentGroups, (group) => {
      group.relativePath ||= '';
      promises.push(...this._buildCompPromises(tplProperties, path.join(outputRoot, group.relativePath), group.components, group.relativePath));
    })

    return Promise.all(promises).then(() => {
      const pom = this.destinationPath(module, 'pom.xml');
      const parsed = this._readPom(pom);
    });
  };

  _processCore = (module, isCloud) => {
    return new Promise((resolve) => {
      const pom = this.destinationPath(module, 'pom.xml');
      const parsed = this._readPom(pom);
      const project = _.find(parsed, (item) => _.has(item, 'project')).project;
      // Find and add dependencies if necessary.
      const dependencies = _.find(project, (item) => _.has(item, 'dependencies')).dependencies;

      const dep = _.cloneDeep(bundleDep)
      if (isCloud) {
        dep.dependency.splice(2, 0, { scope: [{ '#text': 'test' }] });
      }
      this._insertDependency(dependencies, dep);
      this._writePom(pom, parsed)
      resolve();
    });
  };

  _processAll = (isCloud) => {
    return new Promise((resolve) => {
      const pom = this.destinationPath('all', 'pom.xml');
      const parsed = this._readPom(pom);
      resolve();
    });
  };

  _readPom(pom) {
    const parser = new XMLParser(xmlOptions);
    const data = this.fs.read(pom);
    return parser.parse(data);
  }

  _writePom(pom, data) {
    const builder = new XMLBuilder(xmlOptions);
    this.fs.write(pom, this._fixXml(builder.build(data)));
  }

  _insertDependency(dependencies, dependency) {
    const found = _.find(dependencies, (item) => {
      if (!item.dependency) {
        return false;
      }
      return _.find(item.dependency, (gav) => _.isEqual(gav, dependency));
    })
    if (found) {
      return;
    }

    const insertBefore =
      _.findIndex(dependencies, (item) => {
        if (!item.dependency) {
          return false;
        }

        return _.find(item.dependency, (gav) => {
          return gav.groupId && gav.groupId[0]['#text'] === 'com.adobe.aem';
        });
      }) + 1; // Insert after index of SDK/Uber jar.
    dependencies.splice(insertBefore, 0, dependency);
  }

  _fixXml(xml) {
    // XML generated by library splits text into multi line, this removes those and fixes file formatting.
    return xml.replace(/(<[a-zA-Z\d.]+>)\s*\n\s*([^<]+)\s*\n\s*(<\/[a-zA-Z\d.]+>)/g, '$1$2$3');
  }

  _buildCompPromises(properties, outputRoot, components, folderQualifier) {
    const promises = [];
    fs.mkdirSync(path.join(outputRoot));
    _.each(components, (comp) => {
      const transformed = _.transform(
        comp,
        (result, value, key) => {
          result[key] = typeof value === 'string' || value instanceof String ? ejs.render(value, properties) : value;
        },
        {}
      );

      const ref = _.find(components, (c) => {
        return c.name && c.name === comp.superType;
      });

      const relPath = folderQualifier.length === 0 ? folderQualifier : folderQualifier + '/'

      const superType = ref ? `core/wcm/components/${relPath}${ref.name}/v${ref.version}/${ref.name}` : `core/wcm/components/${relPath}${comp.name}/v${comp.version}/${comp.name}`;

      const tplProps = {
        superType,
      };
      _.defaults(tplProps, properties, transformed);

      promises.push(this._buildCompPromise(comp, tplProps, outputRoot));
    });
    return promises;
  }

  _buildCompPromise(config, tplProperties, outputRoot) {
    return new Promise((resolve) => {
      const outputDir = path.join(outputRoot, config.name);
      fs.mkdirSync(outputDir);
      const files = [];
      let templates = globbySync([this.templatePath('shared', '**/*'), this.templatePath('shared', '**/.*')], { onlyFiles: true });
      _.each(templates, (t) => {
        files.push({
          src: t,
          dest: this.destinationPath(outputDir, path.relative(this.templatePath('shared'), t)),
        });
      });
      templates = globbySync([this.templatePath('unique', config.name, '**/*'), this.templatePath('unique', config.name, '**/.*')], { onlyFiles: true });
      _.each(templates, (t) => {
        files.push({
          src: t,
          dest: this.destinationPath(outputDir, path.relative(this.templatePath('unique', config.name), t)),
        });
      });

      if (config.newContainerType) {
        templates = globbySync([this.templatePath('container-types', '**/*'), this.templatePath('container-types', '**/.*')], { onlyFiles: true });
        _.each(templates, (t) => {
          files.push({
            src: t,
            dest: this.destinationPath(outputDir, path.relative(this.templatePath('container-types'), t)),
          });
        });
      }

      for (const f of files) {
        this.fs.copyTpl(f.src, f.dest, tplProperties);
      }

      resolve();
    });
  }
}

export { CoreComponentMixinGenerator, CoreComponentMixinModuleType };

export default CoreComponentMixinGenerator;
