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

import { versions } from 'node:process';
import { execFileSync } from 'node:child_process';

import _ from 'lodash';
import ejs from 'ejs';
import chalk from 'chalk';

import Generator from 'yeoman-generator';
import inquirer from 'inquirer';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import ModuleMixins, { SharedOptions } from '../../lib/module-mixins.js';
import PomUtils from '../../lib/pom-utils.js';
import MavenUtils from '../../lib/maven-utils.js';

export const generatorName = '@adobe/generator-aem';

export const apiCoordinates = (version) => {
  if (version === 'cloud') {
    return {
      groupId: 'com.adobe.aem',
      artifactId: 'aem-sdk-api',
      path: 'com/adobe/aem/aem-sdk-api',
    };
  }

  return {
    groupId: 'com.adobe.aem',
    artifactId: 'uber-jar',
    path: 'com/adobe/aem/uber-jar',
  };
};

const ModuleOptions = Object.freeze({
  bundle(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - Core Bundle`,
      artifactId: `${parentProps.appId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        package: parentProps.groupId,
        artifactId: `${parentProps.artifactId}.core`,
      });
    }

    return options;
  },
  'frontend-general'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - UI Frontend`,
      artifactId: `${parentProps.appId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.frontend`,
      });
    }

    return options;
  },
  'package-structure'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - Repository Structure Package`,
      artifactId: `${parentProps.appId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.apps.structure`,
      });
    }

    return options;
  },
  'package-apps'(moduleName, parentProps, modules) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - UI Apps Package`,
      artifactId: `${parentProps.appId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.apps`,
        bundleRef: 'core',
        frontendRef: 'ui.frontend',
        structureRef: 'ui.apps.structure',
      });
    } else {
      if (modules.bundle && _.keys(modules.bundle).length === 1) {
        options.bundleRef = modules.bundle[_.keys(modules.bundle)[0]].artifactId;
      }

      if (modules['frontend-general'] && _.keys(modules['frontend-general']).length === 1) {
        options.frontendRef = modules['frontend-general'][_.keys(modules['frontend-general'])[0]].artifactId;
      } // TODO: add other frontend lookups only add if there's one.

      if (modules['package-structure'] && _.keys(modules['package-structure']).length > 0) {
        options.structureRef = modules['package-structure'][_.keys(modules['package-structure'])[0]].artifactId;
      }
    }

    return options;
  },
  'package-config'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - UI Config Package`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.config`,
      });
    }

    return options;
  },
  'package-content'(moduleName, parentProps, modules) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - UI Content Package`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.content`,
        appsRef: 'ui.apps',
        configRef: 'ui.config',
      });
    } else {
      if (modules['package-apps'] && _.keys(modules['package-apps']).length === 1) {
        options.appsRef = modules['package-apps'][_.keys(modules['package-apps'])[0]].artifactId;
      }

      if (modules['package-config'] && _.keys(modules['package-config']).length === 1) {
        options.configRef = modules['package-config'][_.keys(modules['package-config'])[0]].artifactId;
      }

      if (modules['package-structure'] && _.keys(modules['package-structure']).length > 0) {
        options.structureRef = modules['package-structure'][_.keys(modules['package-structure'])[0]].artifactId;
      }
    }

    return options;
  },
  'package-all'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - All Package`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.all`,
      });
    }

    return options;
  },
  'tests-it'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - Integration Tests`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.it.tests`,
      });
    }

    return options;
  },
  dispatcher(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - Dispatcher`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.dispatcher`,
      });
    }

    return options;
  },
});

const ModuleOrder = Object.freeze(['bundle', 'frontend-general', 'package-structure', 'package-apps', 'package-config', 'package-content', 'package-all', 'tests-it', 'dispatcher']);

const MixinOrder = Object.freeze(['cc']);

const npmVersion = execFileSync('npm', ['--version'])
  .toString()
  .replaceAll(/\r\n|\n|\r/gm, '');

const propsDefault = Object.freeze({
  examples: false,
  version: '1.0.0-SNAPSHOT',
  javaVersion: '11',
  aemVersion: 'cloud',
  nodeVersion: versions.node,
  npmVersion,
});

const modulesDefault = Object.freeze({
  bundle: { core: {} },
  'frontend-general': { 'ui.frontend': {} },
  'package-structure': { 'ui.apps.structure': {} },
  'package-apps': { 'ui.apps': {} },
  'package-config': { 'ui.config': {} },
  'package-all': { all: {} },
  'tests-it': { 'it.tests': {} },
  dispatcher: { dispatcher: {} },
});

const mixinPrefix = '@adobe/generator-aem:mixin-';
const mixinsDefault = ['cc'];

class AEMGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    _.defaults(this.moduleOptions, {
      groupId: {
        type: String,
        desc: 'Base Maven Group ID (e.g. "com.mysite").',
      },

      version: {
        type: String,
        desc: 'Project version (e.g. 1.0.0-SNAPSHOT).',
      },

      javaVersion: {
        type: String,
        desc: 'Java version to use for project (8 or 11)',
      },

      aemVersion: {
        type: String,
        desc: 'Target AEM version (6.5 or cloud)',
      },

      nodeVersion: {
        type: String,
        desc: 'Node version to use for module projects.',
      },

      npmVersion: {
        type: String,
        desc: 'NPM version to use for module projects.',
      },

      modules: {
        type(arg) {
          return arg ? arg.split(',') : [];
        },
        desc: 'List of modules to generate.',
      },
      mixins: {
        type(arg) {
          return arg ? arg.split(',') : [];
        },
        desc: 'List of mixins to include.',
      },
    });

    _.forOwn(this.moduleOptions, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function() {
      return generatorName;
    };
  }

  initializing() {
    // Order of precedence:
    // * CLI Options
    // * Yeoman Config
    // * Pom Values

    if (this.options.generateInto) {
      this.destinationRoot(this.destinationPath(this.options.generateInto));
    }

    // Populate Root unique properties
    const unique = ['groupId', 'version', 'javaVersion', 'aemVersion', 'nodeVersion', 'npmVersion'];
    this.props = {};
    this.modules = {};
    _.each(this.options.modules, (m) => {
      this.modules[m] = {};
    });

    this.mixins = this.options.mixins || [];

    _.defaults(this.props, _.pick(this.options, unique));
    _.defaults(this.props, _.pick(this.options, SharedOptions));

    if (this.props.javaVersion && this.props.javaVersion.toString() !== '8' && this.props.javaVersion.toString() !== '11') {
      delete this.props.javaVersion;
    }

    if (this.props.aemVersion && this.props.aemVersion.toString() !== '6.5' && this.props.aemVersion.toString() !== 'cloud') {
      delete this.props.aemVersion;
    }

    const config = this.config.getAll();
    _.defaults(this.props, _.pick(config, unique));
    _.defaults(this.props, _.pick(config, SharedOptions));

    const pomProject = PomUtils.findPomNodeArray(PomUtils.readPom(this), 'project');
    if (pomProject) {
      const pomProperties = PomUtils.findPomNodeArray(pomProject, 'properties');
      this._initPomProperties(pomProperties);

      _.each(['groupId', 'artifactId', 'version', 'name'], (option) => {
        const opt = PomUtils.findPomNodeArray(pomProject, option);
        if (opt) {
          this.props[option] = this.props[option] || opt[0]['#text'];
        }
      });

      // Load modules & mixins from Yo configs
      this._initModules(PomUtils.findPomNodeArray(pomProject, 'modules'));
    }

    this._initMixins();

    // Fall back to defaults
    if (this.options.defaults) {
      if (this.props.appId) {
        _.defaults(this.props, { artifactId: this.props.appId });
      }

      _.defaults(this.props, propsDefault);

      if (this.options.modules) {
        _.each(this.options.modules, (module) => {
          this.modules[module] = this.modules[module] || {};
          _.defaults(this.modules[module], _.cloneDeep(modulesDefault[module]));
        });
      } else {
        this.modules = _.cloneDeep(modulesDefault);
      }

      _.each(this.modules, (module, moduleType) => {
        const name = _.keys(module)[0];
        if (ModuleOptions[moduleType]) {
          _.defaults(module[name], ModuleOptions[moduleType](name, this.props, this.modules));
        }
      });

      this.mixins = _.union(this.options.mixins, mixinsDefault);
    }
  }

  prompting() {
    const prompts = [
      {
        name: 'groupId',
        message: 'What is the Maven Group Id? (e.g. "com.mysite").',
        when: !this.props.groupId,
        /* c8 ignore start */
        validate(groupId) {
          return new Promise((resolve) => {
            if (!groupId || groupId.length === 0) {
              resolve('GroupId must be provided.');
              return;
            }

            resolve(true);
          });
          /* c8 ignore stop */
        },
      },
      {
        name: 'version',
        message: 'What is is the starting version for the project? (e.g. 1.0.0-SNAPSHOT).',
        when: !this.options.defaults && !this.props.version,
        default: '1.0.0-SNAPSHOT',
      },
      {
        name: 'aemVersion',
        message: 'Which version of AEM are you using?',
        type: 'list',
        choices: ['cloud', '6.5'],
        default: 0,
        when: !this.options.defaults && !this.props.aemVersion,
      },
      {
        name: 'javaVersion',
        message: 'Which version of Java do you want to use?',
        type: 'list',
        choices: ['11', '8'],
        default: 0,
        when: (answers) => {
          return new Promise((resolve) => {
            if (this.options.defaults || this.props.javaVersion) {
              resolve(false);
              return;
            }

            if (this.props.aemVersion === 'cloud' || answers.aemVersion === 'cloud') {
              resolve(false);
              return;
            }

            resolve(true);
          });
        },
      },
      {
        name: 'moduleSelection',
        message: 'Which modules should be created?',
        type: 'checkbox',
        pageSize: 20,
        loop: false,
        choices: [
          new inquirer.Separator('---- OSGi Modules ----'),
          { name: 'Bundle', value: 'bundle' },
          new inquirer.Separator('---- Frontend Modules ----'),
          { name: 'Frontend', value: 'frontend' },
          new inquirer.Separator('---- Package Modules ----'),
          { name: 'Apps Structure', value: 'package-structure' },
          { name: 'Apps', value: 'package-apps' },
          { name: 'Config', value: 'package-config' },
          { name: 'All', value: 'package-all' },
          new inquirer.Separator('---- Test Modules ----'),
          // { name: 'UI Test', value: 'test-ui' },
          { name: 'Integration Test', value: 'test-it' },
          new inquirer.Separator('---- Dispatcher Module ----'),
          { name: 'Dispatcher', value: 'dispatcher' },
        ],
        default: () => {
          return new Promise((resolve) => {
            if (this.modules) {
              resolve(_.keys(this.modules));
            } else {
              resolve(['bundle', 'frontend', 'package-structure', 'package-apps', 'package-config', 'package-all', 'test-it', 'dispatcher']);
            }
          });
        },
        when: () => {
          return new Promise((resolve) => {
            if (this.options.defaults || this.options.modules) {
              resolve(false);
              return;
            }

            resolve(true);
          });
        },
      },
      {
        name: 'frontend',
        message: 'Which type of Front End module should be created?',
        type: 'list',
        pageSize: 20,
        loop: false,
        choices: [{ name: 'General', value: 'frontend-general' }],
        default: ['frontend-general'],
        when: (answers) => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
              return;
            }

            if (this.options.modules && (this.options.modules.includes('frontend-general') || this.options.modules.includes('frontend-react') || this.options.modules.includes('frontend-angular'))) {
              resolve(false);
              return;
            }

            if (answers.moduleSelection && answers.moduleSelection.includes('frontend')) {
              resolve(true);
              return;
            }

            resolve(false);
          });
        },
      },
      {
        name: 'bundle',
        message: 'What do you want to name the bundle module?',
        default: 'core',
        when: (answers) => {
          return this._moduleNameWhen('bundle', answers);
        },
        validate: this._checkName,
      },
      {
        name: 'frontend-general',
        message: 'What do you want to name the general Front End module?',
        default: 'ui.frontend',
        when: (answers) => {
          return new Promise((resolve) => {
            if (this.options.defaults) {
              resolve(false);
            }

            if (this.options.modules && this.options.modules.includes('frontend-general')) {
              resolve(true);
              return;
            }

            resolve(answers.frontend === 'frontend-general');
          });
        },
        validate: this._checkName,
      },
      {
        name: 'package-structure',
        message: 'What do you want to name the Structure package module?',
        default: 'ui.apps.structure',
        when: (answers) => {
          return this._moduleNameWhen('package-structure', answers);
        },
        validate: this._checkName,
      },
      {
        name: 'package-apps',
        message: 'What do you want to name the Apps package module?',
        default: 'ui.apps',
        when: (answers) => {
          return this._moduleNameWhen('package-apps', answers);
        },
        validate: this._checkName,
      },
      {
        name: 'package-config',
        message: 'What do you want to name the Config package module?',
        default: 'ui.config',
        when: (answers) => {
          return this._moduleNameWhen('package-config', answers);
        },
        validate: this._checkName,
      },
      {
        name: 'package-all',
        message: 'What do you want to name the All package module?',
        default: 'all',
        when: (answers) => {
          return this._moduleNameWhen('package-all', answers);
        },
        validate: this._checkName,
      },
      {
        name: 'tests-it',
        message: 'What do you want to name the Integration Tests module?',
        default: 'it.tests',
        when: (answers) => {
          return this._moduleNameWhen('tests-it', answers);
        },
        validate: this._checkName,
      },
      {
        name: 'mixins',
        message: 'Which mixins should be added to the project?',
        type: 'checkbox',
        pageSize: 20,
        loop: false,
        choices: [{ name: 'Core Components', value: 'cc' }],
        default: ['cc'],
        when: () => {
          return new Promise((resolve) => {
            if (this.options.defaults || this.options.mixins) {
              resolve(false);
              return;
            }

            resolve(true);
          });
        },
      },
      {
        name: 'nodeVersion',
        message: 'What version of Node to use for Front End module(s)?',
        when: (answers) => {
          return new Promise((resolve) => {
            if (this.options.defaults || this.props.nodeVersion) {
              resolve(false);
              return;
            }

            if (!answers.moduleSelection || !answers.moduleSelection.includes('frontend')) {
              resolve(false);
              return;
            }

            resolve(true);
          });
        },
        default: versions.node,
      },
      {
        name: 'npmVersion',
        message: 'What version of Npm to use for Front End module(s)?',
        when: (answers) => {
          return new Promise((resolve) => {
            if (this.options.defaults || this.props.npmVersion) {
              resolve(false);
              return;
            }

            if (!answers.moduleSelection || !answers.moduleSelection.includes('frontend')) {
              resolve(false);
              return;
            }

            resolve(true);
          });
        },
        default: npmVersion,
      },
    ];

    return this._prompting(prompts).then((answers) => {
      if (this.props.aemVersion === 'cloud') {
        this.props.javaVersion = '11';
      }

      _.forOwn(this.modules, (modules, moduleType) => {
        const name = answers[moduleType];
        if (name) {
          this.modules[moduleType][name] = this.modules[moduleType][name] || {};
          _.defaults(this.modules[moduleType][name], ModuleOptions[moduleType](name, this.props, this.modules));
          delete this.props[name];
        }
      });

      if (answers.moduleSelection) {
        const idx = answers.moduleSelection.indexOf('frontend');
        if (idx >= 0) {
          answers.moduleSelection[idx] = answers.frontend;
        }

        delete this.props.frontend;

        _.each(answers.moduleSelection, (moduleType) => {
          const name = answers[moduleType];
          this.modules[moduleType] = this.modules[moduleType] || {};
          this.modules[moduleType][name] = this.modules[moduleType][name] || {};
          _.defaults(this.modules[moduleType][name], ModuleOptions[moduleType](name, this.props, this.modules));
          delete this.props[moduleType];
        });
        delete this.props.moduleSelection;
      }

      // Dispatcher is special case, can't set name.
      if (this.modules.dispatcher) {
        this.modules.dispatcher = { dispatcher: ModuleOptions.dispatcher('dispatcher', this.props, this.modules) };
      }

      if (answers.mixins) {
        this.mixins = _.union(this.mixins, answers.mixins);
        delete this.props.mixins;
      }

      return answers;
    });
  }

  configuring() {
    this._validateGAV();
    return MavenUtils.latestRelease(apiCoordinates(this.props.aemVersion)).then((aemMetadata) => {
      this.props.aem = aemMetadata;
      this._configuring();
    });
  }

  default() {
    const meta = this.env.getGeneratorsMeta();

    _.forOwn(this.modules, (module, moduleType) => {
      if (!meta[`@adobe/aem:${moduleType}`] && !meta[moduleType]) {
        throw new Error(
          /* eslint-disable prettier/prettier */
          chalk.red(`Module '${moduleType}' is not installed.`) +
          '\n\nInstall it with ' + chalk.yellow(`npm install -g 'generator-${moduleType}'`) + ' then rerun this generator.\n'
          /* eslint-enable prettier/prettier */
        );
      }
    });

    this._composeModules();
    this._composeMixins();
  }

  writing() {
    const files = [
      {
        src: this.templatePath('README.md'),
        dest: this.destinationPath('README.md'),
      },
      {
        src: this.templatePath('.yo-resolve'),
        dest: this.destinationPath('.yo-resolve'),
      },
    ];

    this._writeGitignore();
    this._writing(files, this.props);
    this._writePom();
  }

  install() {
    return this._install();
  }

  end() {
    this.log(chalk.greenBright('\n\nThanks for using the AEM Project Generator.\n\n'));
  }

  _initPomProperties = (propertiesNode) => {
    if (!propertiesNode) {
      return;
    }

    let prop = PomUtils.findPomNodeArray(propertiesNode, 'aem.version');
    if (prop) {
      this.props.aemVersion = this.props.aemVersion || `${prop[0]['#text']}`;
    }

    prop = PomUtils.findPomNodeArray(propertiesNode, 'java.version');
    if (prop) {
      this.props.javaVersion = this.props.javaVersion || `${prop[0]['#text']}`;
    }

    prop = PomUtils.findPomNodeArray(propertiesNode, 'node.version');
    if (prop) {
      this.props.nodeVersion = this.props.nodeVersion || `${prop[0]['#text']}`;
    }

    prop = PomUtils.findPomNodeArray(propertiesNode, 'npm.version');
    if (prop) {
      this.props.npmVersion = this.props.npmVersion || `${prop[0]['#text']}`;
    }
  };

  _initModules(pomModules) {
    _.each(pomModules, (module) => {
      const name = module.module[0]['#text'];
      if (this.fs.exists(this.destinationPath(name, '.yo-rc.json'))) {
        const yoData = this.fs.readJSON(this.destinationPath(name, '.yo-rc.json'));
        _.each(yoData, (v, generator) => {
          if (generator.startsWith(mixinPrefix)) {
            return;
          }

          const type = generator.replaceAll('@adobe/generator-aem:', '');
          if (!this.modules[type]) {
            this.modules[type] = {};
          }

          this.modules[type][name] = v;
        });
      }
    });
  }

  _initMixins() {
    const temporary = [];
    const yorc = this.fs.readJSON(this.destinationPath('.yo-rc.json'));
    _.each(yorc, (v, k) => {
      if (k.startsWith(mixinPrefix)) {
        temporary.push(k.replaceAll(mixinPrefix, ''));
      }
    });
    this.mixins = _.union(this.mixins, temporary);
  }

  _moduleNameWhen = (module, answers) => {
    return new Promise((resolve) => {
      if (this.options.defaults) {
        resolve(false);
        return;
      }

      if (answers.moduleSelection && answers.moduleSelection.includes(module)) {
        resolve(true);
      }

      if (this.options.modules && this.options.modules.includes(module)) {
        resolve(true);
      }

      resolve(false);
    });
  };

  _checkName = (name, answers) => {
    return new Promise((resolve) => {
      _.each(answers.moduleSelection, (module) => {
        if (answers[module] === name) {
          resolve('Module names must be unique.');
        }
      });
      resolve(true);
    });
  };

  _composeModules() {
    const moduleList = _.keys(this.modules);
    _.each(ModuleOrder, (moduleType) => {
      if (!this.modules[moduleType]) {
        return;
      }

      _.forOwn(this.modules[moduleType], (moduleProps) => {
        const options = {
          parent: this.props,
          defaults: this.props.defaults,
          examples: this.props.examples,
        };
        if (ModuleOptions[moduleType]) {
          _.defaults(options, moduleProps);
        }

        this.composeWith(`@adobe/aem:${moduleType}`, options);
      });
      moduleList.splice(moduleList.indexOf(moduleType), 1);
    });

    // Now do custom plugin modules.
    _.each(moduleList, (moduleType) => {
      const options = { parent: this.props };
      this.composeWith(moduleType, options);
    });
  }

  _composeMixins() {
    const mixinList = _.cloneDeep(this.mixins);
    _.each(MixinOrder, (mixinType) => {
      if (!this.mixins.includes(mixinType)) {
        return;
      }

      const options = { parent: this.props, defaults: this.props.defaults, examples: this.props.examples };
      this.composeWith(`@adobe/aem:mixin-${mixinType}`, options);
      mixinList.splice(mixinList.indexOf(mixinType), 1);
    });

    // Now do custom plugin mixins.
    _.each(mixinList, (mixin) => {
      const options = { parent: this.props };
      this.composeWith(`@adobe/aem:mixin-${mixin}`, options);
    });
  }

  _writeGitignore = () => {
    const base = this.fs.read(this.templatePath('.gitignore')).split('\n');

    let orig = [];
    const file = this.destinationPath('.gitignore');
    if (this.fs.exists(file)) {
      orig = this.fs.read(file).split('\n');
    }

    const keep = _.without(orig, ..._.without(base, ''));
    base.shift();
    base.unshift('# These values are from original file not included in generator template.', '', ...keep);
    this.fs.write(file, base.join('\n'));
  };

  _writePom = () => {
    const tplProps = _.pick(this.props, ['groupId', 'artifactId', 'version', 'name', 'javaVersion', 'nodeVersion', 'npmVersion', 'aem']);
    tplProps.modules = _.flatMap(this.modules, (moduleType) => _.keys(moduleType));
    const parser = new XMLParser(PomUtils.xmlOptions);
    const builder = new XMLBuilder(PomUtils.xmlOptions);

    // Read the template and parse w/ properties.
    const genPom = ejs.render(this.fs.read(this.templatePath('pom.xml')), tplProps);
    const parsedGenPom = parser.parse(genPom);
    const genProject = PomUtils.findPomNodeArray(parsedGenPom, 'project');

    const genDependencies = PomUtils.findPomNodeArray(genProject, 'dependencyManagement', 'dependencies');

    const pomFile = this.destinationPath('pom.xml');
    if (this.fs.exists(pomFile)) {
      const existingPom = PomUtils.findPomNodeArray(parser.parse(this.fs.read(pomFile)), 'project');

      // Merge the different sections
      PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'properties'), PomUtils.findPomNodeArray(existingPom, 'properties'), PomUtils.propertyPredicate);

      PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'build', 'plugins'), PomUtils.findPomNodeArray(existingPom, 'build', 'plugins'), PomUtils.pluginPredicate);
      PomUtils.mergePomSection(
        PomUtils.findPomNodeArray(genProject, 'build', 'pluginManagement', 'plugins'),
        PomUtils.findPomNodeArray(existingPom, 'build', 'pluginManagement', 'plugins'),
        PomUtils.pluginPredicate
      );

      PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'profiles'), PomUtils.findPomNodeArray(existingPom, 'profiles'), PomUtils.profilePredicate);

      PomUtils.mergePomSection(genDependencies, PomUtils.findPomNodeArray(existingPom, 'dependencyManagement', 'dependencies'), PomUtils.dependencyPredicate);
    }

    const addlDeps = parser.parse(this.fs.read(this.templatePath('partials', 'v6.5', 'dependencies.xml')))[0].dependencies;
    if (this.props.aemVersion === 'cloud') {
      addlDeps.push({
        dependency: [{ groupId: [{ '#text': 'com.adobe.aem' }] }, { artifactId: [{ '#text': 'uber-jar' }] }],
      });
      PomUtils.removeDependencies(genDependencies, addlDeps);
    } else {
      PomUtils.addDependencies(genDependencies, addlDeps, tplProps.aem);
    }

    this.fs.write(pomFile, PomUtils.fixXml(builder.build(parsedGenPom)));
  };
}

_.extendWith(AEMGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default AEMGenerator;
