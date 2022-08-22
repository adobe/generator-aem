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
import chalk from 'chalk';
import ejs from 'ejs';

import { globbySync } from 'globby';

import { XMLParser } from 'fast-xml-parser';
import PomUtils from './pom-utils.js';

export const SharedOptions = Object.freeze(['defaults', 'examples', 'name', 'appId', 'artifactId']);

const parentGenerator = '@adobe/generator-aem';

const moduleOptions = Object.freeze({
  generateInto: {
    type: String,
    required: false,
    desc: 'Relocate the location in which files are generated.',
  },

  showBuildOutput: {
    desc: 'Display the build output after generation.',
    default: true,
  },

  defaults: {
    desc: 'Use all defaults for user input.',
  },

  examples: {
    desc: 'Include demo/example code and content.',
  },

  name: {
    type: String,
    desc: 'Application title, will be used for website title and components groups (e.g. "My Site").',
  },

  appId: {
    type: String,
    desc: 'Technical name used for component, config, content, and client library names (e.g. "mysite").',
  },

  artifactId: {
    type: String,
    desc: 'Base Maven Artifact ID (e.g. "mysite").',
  },
});

const _modulePrompts = function () {
  return [
    {
      name: 'examples',
      message: 'Include any examples in generated projects?',
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
      name: 'name',
      message: 'What is the project name? (e.g. "My Site")',
      when: this.props.name === undefined,
      validate(name) {
        return new Promise((resolve) => {
          if (!name || name.length === 0) {
            resolve('Name must be provided.');
          }

          resolve(true);
        });
      },
    },
    {
      name: 'appId',
      message: 'what is the app\'s technical name? (e.g. "mysite")',
      when: this.props.appId === undefined,
      validate(appId) {
        return new Promise((resolve) => {
          if (!appId || appId.length === 0) {
            resolve('AppId must be provided.');
          }

          resolve(true);
        });
      },
    },
    {
      name: 'artifactId',
      message: 'What is the Maven Artifact ID? (e.g. "mysite").',
      when: () => {
        return new Promise((resolve) => {
          if (this.options.defaults) {
            resolve(false);
          }

          resolve(this.props.artifactId === undefined);
        });
      },
      default: (answers) => {
        return new Promise((resolve) => {
          let appId = answers.appId ? answers.appId : this.props.appId;
          if (this.options.generateInto) {
            appId = `${appId}.${this.options.generateInto}`;
          }

          resolve(appId);
        });
      },
      validate(artifactId) {
        return new Promise((resolve) => {
          if (!artifactId || artifactId.length === 0) {
            resolve('ArtifactId must be provided.');
          }

          if (/[^a-zA-Z.-]+/.test(artifactId)) {
            resolve('ArtifactId must only contain letters, hyphens, or periods (.).');
          }

          resolve(true);
        });
      },
    },
  ];
};

/**
 * Validates that this generator's group & artifact ids do not differ from those found in the local pom.
 *
 * @private
 */
const _validateGAV = function () {
  const pomProject = PomUtils.findPomNodeArray(PomUtils.readPom(this), 'project');
  if (pomProject) {
    const groupId = PomUtils.findPomNodeArray(pomProject, 'groupId')[0]['#text'];
    const artifactId = PomUtils.findPomNodeArray(pomProject, 'artifactId')[0]['#text'];
    if (groupId !== this.props.groupId || artifactId !== this.props.artifactId) {
      throw new Error(
        chalk.red('Refusing to update existing project with different group/artifact identifiers.') +
          '\n\n' +
          'You are trying to run the AEM Generator in a project with different Maven coordinates than provided.\n' +
          'This is not a supported feature. Please manually update or use the defaults flag.'
      );
    }
  }
};

/**
 * Sets properties based on Generator's context. List of properties are the keys in `options`.
 *
 * Properties are looked up and take precedence in the following order (if exists):
 *
 *   * CLI Options passed
 *   * .yo-rc.json Configuration
 *   * pom.xml
 *
 * Set the Generator's `options.generateInto` for the following:
 *   * Use generateInto value for determining Generators properties in Yeoman Config  (.yo-rc.json)
 *   * Check parent folder for pom.
 *
 * After this method invocation the follow properties are set on `this` generator:
 *
 *    * this.props - see above.
 *    * this.parentProps - based on parent `.yo-rc.json`
 *
 * If no parent options are passed, then a parent generator context is required. If none exists, this will fail.
 *
 * @private
 */
const _initializing = function () {
  this.props = this.props || {};
  if (this.options.generateInto) {
    this.destinationRoot(this.destinationPath(this.options.generateInto));
  }

  if (this.fs.exists(this.destinationPath('.yo-rc.json'))) {
    const yorc = this.fs.readJSON(this.destinationPath('.yo-rc.json'));
    if (yorc[parentGenerator]) {
      throw new Error(chalk.red('Running Sub-Generator requires a destination path, when running from project root.'));
    }
  }

  if (!this.moduleName) {
    // Module name not provided, try to derive it:
    this.moduleName = this.constructor.name.replace(/^AEM/, '').replace(/Generator$/, '');
  }

  this.parentProps = this.options.parent || {};
  const parentPath = path.dirname(this.destinationPath());
  if (this.fs.exists(path.join(parentPath, '.yo-rc.json'))) {
    const parentData = this.fs.readJSON(path.join(parentPath, '.yo-rc.json'));
    _.defaults(this.parentProps, parentData[parentGenerator]);
  }

  const config = this.config.getAll();
  if (_.isEmpty(config) && _.isEmpty(this.parentProps)) {
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

  _.defaults(this.props, _.pick(this.options, SharedOptions));
  _.defaults(this.props, config);

  const pomProject = PomUtils.findPomNodeArray(PomUtils.readPom(this), 'project');
  _.each(['artifactId', 'name'], (option) => {
    const opt = PomUtils.findPomNodeArray(pomProject, option);
    if (opt) {
      this.props[option] = this.props[option] || opt[0]['#text'];
    }
  });
};

/**
 * Creates a list of prompts shared by all generators. Prompts are configured based on provided properties.
 */
const _prompting = function (customPrompts = []) {
  return this.prompt(this._modulePrompts().concat(customPrompts)).then((answers) => {
    processAnswers.call(this, answers);
    _.merge(this.props, answers);
    return answers;
  });
};

/**
 * Prompts don't set default or answer value if they were not asked (`when` is false)
 *
 * This method fixes any shared values to be set based on expected values.
 *
 * @param answers the answers of the prompts
 */
const processAnswers = function (answers) {
  if (this.options.defaults) {
    let appId = answers.appId ? answers.appId : this.props.appId;
    if (this.options.generateInto) {
      appId = `${appId}.${this.options.generateInto}`;
    }

    answers.artifactId = this.props.artifactId || appId;
  }
};

/**
 * Saves this generator's property to the Yo configuration file.
 *
 * @private
 */
const _configuring = function () {
  const current = this.config.getAll();
  // Props will overwrite any current values.
  _.merge(current, this.props);
  this.config.set(current);
};

/**
 * Checks if there is an existing module within the project of the current module's type
 *
 * @private
 */
const _duplicateCheck = function () {
  let dup = false;
  const parentPath = path.dirname(this.destinationRoot());
  const pomData = this.fs.read(path.join(parentPath, 'pom.xml'));
  const parsed = new XMLParser().parse(pomData);
  _.each(parsed.project.modules, (module) => {
    const yorc = path.join(parentPath, module, '.yo-rc.json');
    if (this.fs.exists(yorc)) {
      dup = this.fs.readJSON(yorc)[this.rootGeneratorName()] !== undefined && module !== path.basename(this.destinationRoot());
      return !dup; // Break early if found.
    }
  });
  if (dup) {
    throw new Error(`Refusing to create a second '${this.rootGeneratorName()}' module.`);
  }
};

/**
 * List all templates in the specified directory.
 *
 * @return {*[]} list of template files
 * @private
 */
const _listTemplates = function (dir = '.') {
  const files = [];

  const patterns = [this.templatePath(dir, '**/*'), this.templatePath(dir, '**/.*')];
  const paths = globbySync(patterns, { onlyFiles: true });
  _.each(paths, (file) => {
    files.push({
      src: file,
      dest: this.destinationPath(path.relative(this.templatePath(dir), file)),
    });
  });

  return files;
};

/**
 * Writes files using the provided the Generator fs reference.
 *
 * If the template destinations are in the format:
 *    __propertyname__
 * they will be transformed into an EJS format, and processed using the props' attribute
 **
 * Files are written from src to dest
 *
 * @param {Object[]} templates - The list of templates to process
 * @param {string} templates[].src - The source location of the template
 * @param {string} templates[].dest - The destination of the processed template
 * @param {Object} tplProps - Properties to use with EJS template processor
 * @param {Object} options - Optional options to pass to the EJS template processor
 */
const _writing = function (templates, tplProps, options = {}) {
  const localOptions = _.defaults(options, { delimiter: '%' });
  const fixpath = (filepath, props, fopts) => {
    const dest = filepath.replace(/_{2}([^_]+)_{2}/gi, `<${fopts.delimiter}= $1 ${fopts.delimiter}>`);
    return ejs.render(dest, props, fopts);
  };

  for (const t of templates) {
    this.fs.copyTpl(t.src, fixpath(t.dest, tplProps, localOptions), tplProps, localOptions);
  }
};

/**
 * Runs the Maven installation as a spawned process.
 *
 * @return {*} the spawn process
 * @private
 */
const _install = function (options_ = {}) {
  const options = this.options.showBuildOutput ? { stdio: 'inherit' } : { stdio: 'ignore' };
  _.defaults(options, options_);
  return this.spawnCommand('mvn', ['clean', 'verify'], options).catch((error) => {
    throw new Error(chalk.red('Maven build failed with error: \n\n\t' + error.message + '\n\nPlease retry the build manually to determine the issue.'));
  });
};

/**
 * List all modules within the project that are of the given type.
 *
 * Module types are determined by the existence of .yo-rc.json configurations of the provided type
 *
 * Module list is structured as:
 * {
 *   path: <module>,
 *   ...all other properties stored in the config
 * }
 *
 * @param type the generator type
 * @return {Object[]} - properties for each module of the given type
 * @private
 */
const _findModules = function (type) {
  const modules = [];
  let root = this.destinationRoot();
  if (!this.fs.exists(path.join(root, '.yo-rc.json')) ||
    this.fs.readJSON(path.join(root, '.yo-rc.json'))[parentGenerator] === undefined) {
    root = path.dirname(root);
  }

  const moduleList = PomUtils.listParentPomModules(this, root)
  _.each(moduleList, (module) => {
    const yorcFile = path.join(root, module, '.yo-rc.json');
    if (this.fs.exists(yorcFile)) {
      const yorc = this.fs.readJSON(path.join(yorcFile));
      if (yorc[type] !== undefined) {
        modules.push({ path: module, ...yorc[type] });
      }
    }
  });
  return modules;
};

const ModuleMixins = {
  moduleOptions,
  _validateGAV,
  _initializing,
  _modulePrompts,
  _prompting,
  _configuring,
  _duplicateCheck,
  _listTemplates,
  _writing,
  _install,
  _findModules,
};
export default ModuleMixins;
