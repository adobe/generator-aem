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

import _ from 'lodash';
import { globbySync } from 'globby';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import Generator from 'yeoman-generator';

import ModuleMixins from '../../lib/module-mixins.js';
import { generatorName as appsGeneratorName } from '../package-apps/index.js';
import { generatorName as configGeneratorName } from '../package-config/index.js';
import { generatorName as ccGeneratorName } from '../mixin-cc/index.js';
import PomUtils from '../../lib/pom-utils.js';

export const generatorName = '@adobe/generator-aem:package-content';

class ContentPackageGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    _.defaults(this.moduleOptions, {
      templates: {
        desc: 'Whether or not to create default templates (forced true if examples is set).',
      },

      appsRef: {
        type: String,
        desc: 'Artifact Id of the Apps package dependency, in this multi-module project.',
      },

      singleCountry: {
        desc: 'Whether the example pages create should be language only (default), or language/country.',
      },

      language: {
        type: String,
        desc: 'The ISO language code with which to initialize the content structure.',
      },

      country: {
        type: String,
        desc: 'The ISO country code with which to initialize the content structure, when not using single country.',
      },

      enableDynamicMedia: {
        desc: 'Whether or not the Dynamic Media components should be enabled on template policies.',
      },
    });

    _.forOwn(this.moduleOptions, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function () {
      return generatorName;
    };
  }

  initializing() {
    this._initializing();

    _.defaults(this.props, _.pick(this.options, ['templates', 'singleCountry', 'language', 'country', 'enableDynamicMedia']));

    if (this.options.appsRef) {
      this.props.apps = this.options.appsRef;
    }

    if (this.options.configRef) {
      this.props.config = this.options.configRef;
    }

    if (this.options.defaults) {
      _.defaults(this.props, {
        templates: true,
        singleCountry: true,
        language: 'en',
        country: 'us',
        enableDynamicMedia: false,
      });
    }

    this.availableApps = this._findModules(appsGeneratorName);
    if (!this.props.apps && this.availableApps.length === 1) {
      this.props.apps = this.availableApps[0].artifactId;
    }
  }

  prompting() {
    const prompts = [
      {
        name: 'templates',
        message: 'Do you want to include the default templates?',
        type: 'confirm',
        when: (answers) => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
              return;
            }

            if (this.props.examples || answers.examples) {
              resolve(false);
              return;
            }

            resolve(this.props.templates === undefined);
          });
        },
        default: true,
      },
      {
        name: 'appsRef',
        message: "Which Apps package contains the components for rendering this package's content?",
        type: 'list',
        choices: () => {
          return new Promise((resolve) => {
            const list = _.map(this.availableApps, 'artifactId');
            resolve(list);
          });
        },
        when: () => {
          return new Promise((resolve) => {
            resolve(this.props.apps === undefined);
          });
        },
      },
      {
        name: 'singleCountry',
        message: 'Should only one country structure be created?',
        type: 'confirm',
        when: () => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
              return;
            }

            resolve(this.props.singleCountry === undefined);
          });
        },
        default: true,
      },
      {
        name: 'language',
        message: 'What is the ISO language code for the initial site structure?',
        when: () => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
              return;
            }

            resolve(this.props.language === undefined);
          });
        },
        default: 'en',
      },
      {
        name: 'country',
        message: 'What is the ISO country code for the initial site structure?',
        when: () => {
          return new Promise((resolve) => {
            if (this.props.defaults) {
              resolve(false);
              return;
            }

            resolve(this.props.country === undefined);
          });
        },
        default: 'us',
      },
      {
        name: 'enableDynamicMedia',
        message: 'Should Dynamic Media features be enabled?',
        type: 'confirm',
        when: (answers) => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
              return;
            }

            if (this.props.templates || answers.templates || this.props.examples || answers.examples) {
              resolve(this.props.enableDynamicMedia === undefined);
            } else {
              resolve(false);
            }
          });
        },
        default: false,
      },
    ];

    return this._prompting(prompts).then((answers) => {
      if (this.props.examples || answers.examples) {
        this.props.templates = true;
      }

      delete this.props.bundleRef;
      if (answers.bundleRef) {
        this.props.bundle = answers.bundleRef;
      }

      delete this.props.appsRef;
      if (answers.appsRef) {
        this.props.apps = answers.appsRef;
      }
    });
  }

  configuring() {
    this._configuring();
  }

  default() {
    // If options parent is set - then the root generator called, and we don't need to do these checks.
    // The "findModules" logic doesn't work when running from root first time - because no files have been written yet at this point.
    if (!this.options.parent) {
      if (this.props.templates) {
        if (!this.props.apps) {
          throw new Error('Unable to create Content Package, Apps Package module not specified. (Required for templates to reference.)');
        }

        const root = path.dirname(this.destinationPath());
        const yorc = this.fs.readJSON(path.join(root, '.yo-rc.json'));

        const appModule = _.find(this._findModules(appsGeneratorName), (module) => {
          return module.artifactId === this.props.apps;
        });

        if (yorc[ccGeneratorName] === undefined) {
          throw new Error('Unable to create Content Package, Core Components Mixin not found. (Required for templates to reference.)');
        } else if (!yorc[ccGeneratorName].apps.includes(appModule.path)) {
          throw new Error('Unable to create Content Package, Core Components Mixin not configured for Apps Module. (Required for templates to reference.)');
        }
      }

      // Config project is required to ensure RepoInit script is created.
      // Otherwise the folders and permissions won't be set up correctly.
      if (this._findModules(configGeneratorName).length === 0) {
        throw new Error('Unable to create Content Package, no Config Module found. (Required for folder creation via RepoInit.)');
      }
    }
  }

  writing() {
    const countryName = new Intl.DisplayNames([this.props.language], { type: 'region' }).of(this.props.country.toUpperCase());
    const languageName = new Intl.DisplayNames([this.props.language], { type: 'language' }).of(this.props.language);

    const tplProps = {
      ..._.pick(this.props, ['examples', 'artifactId', 'appId', 'name', 'singleCountry', 'country', 'language', 'enableDynamicMedia']),
      countryName,
      languageName,
      parent: this.parentProps,
    };

    const files = [];
    files.push(...this._listTemplates('shared'));
    if (this.props.templates) {
      files.push(...this._listTemplates('templates'));
      tplProps.apps = this.props.apps;
    }

    if (this.props.examples) {
      files.push(...this._listTemplates(path.join('examples', 'single')));
      if (!this.props.singleCountry) {
        files.push(...this._listTemplates(path.join('examples', 'multi')));
        const appModule = _.find(this._findModules(appsGeneratorName), (module) => {
          return module.artifactId === this.props.apps;
        });

        this._addBlueprint(appModule, tplProps);
        this._updateAppsFilter(appModule, tplProps);
      }
    }

    this._writing(files, tplProps);

    if (this.env.rootGenerator() === this) {
      PomUtils.addModuleToParent(this);
    }
  }

  install() {
    // Make sure build is run with this new/updated module
    if (this.env.rootGenerator() === this) {
      return this._install({ cwd: path.dirname(this.destinationPath()) });
    }
  }

  _addBlueprint(appModule, tplProps) {
    const files = [];
    const patterns = [this.templatePath('examples', 'msm', '**/*'), this.templatePath('examples', 'msm', '**/.*')];
    const paths = globbySync(patterns, { onlyFiles: true });
    _.each(paths, (file) => {
      const appDir = path.join(path.dirname(this.destinationPath()), appModule.path);
      const relative = path.relative(this.templatePath('examples', 'msm'), file);

      files.push({
        src: file,
        dest: path.join(appDir, relative),
      });

      this._writing(files, tplProps);
    });
  }

  _updateAppsFilter(appModule) {
    const xmlOptions = Object.freeze({
      preserveOrder: true,
      format: true,
      ignoreAttributes: false,
      suppressEmptyNode: true,
    });

    const filterFile = path.join(path.dirname(this.destinationPath()), appModule.path, 'src', 'main', 'content', 'META-INF', 'vault', 'filter.xml');
    const filter = new XMLParser(xmlOptions).parse(this.fs.read(filterFile));
    filter[1].workspaceFilter.push({ filter: [], ':@': { '@_root': `/apps/msm/${this.props.appId}_blueprint`, '@_mode': 'merge' } });
    this.fs.write(filterFile, new XMLBuilder(xmlOptions).build(filter));
  }
}

_.extendWith(ContentPackageGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default ContentPackageGenerator;
