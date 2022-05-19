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

import _ from 'lodash';
import got from 'got';
import chalk from 'chalk';
import ejs from 'ejs';

import { XMLParser } from 'fast-xml-parser';
import { globbySync } from 'globby';

export const SharedOptions = Object.freeze(['defaults', 'examples', 'name', 'appId', 'artifactId']);
export const ParentProperties = Object.freeze(['groupId', 'artifactId', 'version', 'aemVersion']);

const prompts = function () {
  const options = this.options || {};
  const properties = this.props || {};
  const list = [
    {
      name: 'examples',
      message: 'Include any examples in generated projects?',
      type: 'confirm',
      when() {
        return new Promise((resolve) => {
          if (properties.defaults) {
            resolve(false);
          }

          resolve(properties.examples === undefined);
        });
      },
      default: false,
    },
    {
      name: 'name',
      message: 'Project name (e.g. "My Site").',
      when: properties.name === undefined,
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
      message: 'App technical name (e.g. "mysite").',
      when: properties.appId === undefined,
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
      message: 'Maven Artifact ID. (e.g. "mysite").',
      when() {
        return new Promise((resolve) => {
          if (properties.defaults) {
            resolve(false);
          }

          resolve(properties.artifactId === undefined);
        });
      },
      default(answers) {
        return new Promise((resolve) => {
          let appId = answers.appId ? answers.appId : properties.appId;
          if (options.generateInto) {
            appId = `${appId}.${options.generateInto}`;
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

  return list;
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

const _moduleOptions = Object.freeze({
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

const _apiCoordinates = (version) => {
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

const _latestRelease = (coordinates, previous = false) => {
  return new Promise((resolve, reject) => {
    if (!coordinates || !coordinates.groupId || !coordinates.artifactId) {
      reject(new Error('No Coordinates provided.'));
    }

    const path = `${coordinates.groupId.replaceAll('.', '/')}/${coordinates.artifactId}`;

    try {
      got.get(`https://repo1.maven.org/maven2/${path}/maven-metadata.xml`, { responseType: 'text', resolveBodyOnly: true }).then((body) => {
        try {
          const parser = new XMLParser({
            ignoreAttributes: true,
            ignoreDeclaration: true,
          });
          const data = parser.parse(body);
          const metadata = {
            ...coordinates,
            version: data.metadata.versioning.latest,
          };
          if (previous) {
            metadata.versions = data.metadata.versioning.versions;
          }

          resolve(metadata);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error.response ? new Error(error.response.body) : error);
    }
  });
};

/**
 * Reads the following properties from a pom file, in the specified path:
 *
 * {
 *   groupId: '',
 *   artifactId: '',
 *   version: '',
 *   name: '',
 *   pomProperties: {}
 * }
 *
 * Any property not found, will not be in the returned object.
 * `pomProperties` will be all properties found in the pom's `properties` section.
 *
 * @param dir path to directory containing pom.xml
 * @returns properties specified in pom.
 */
const _readPom = function (dir) {
  const properties = {};
  const pom = path.join(dir, 'pom.xml');
  if (!fs.existsSync(pom)) {
    return properties;
  }

  const data = fs.readFileSync(pom, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: true,
    ignoreDeclaration: true,
  });
  const parsed = parser.parse(data);

  if (parsed.project.name) {
    properties.name = parsed.project.name;
  }

  const project = _.pick(parsed.project, ['groupId', 'artifactId', 'version']);
  _.defaults(properties, project);
  if (parsed.project.properties) {
    properties.pomProperties = {};

    _.defaults(properties.pomProperties, parsed.project.properties);
  }

  return properties;
};

/**
 * Returns properties based on Generator's context. List of properties are the keys in `options`.
 *
 *  Properties are looked up and take precedence in the following order (if exists):
 *
 *  * CLI Options passed
 *  * .yo-rc.json Configuration
 *  * pom.xml
 *  * Reasonable Defaults
 *
 *  Set the Generator's `options.generateInto` for the following:
 *  *  Use generateInto value for determining Generators properties in Yeoman Config  (.yo-rc.json)
 *  * Check parent folder for pom.
 *
 * If parent information is found, it is set to `props.parent` Parent will only contain:
 *
 * @param {string} relativePath relative path from root for configuration
 */
const _loadProps = function (relativePath) {
  const properties = {};

  if (!relativePath || relativePath.length === 0) {
    throw new Error('Config/pom relative path must be specified.');
  }

  _.defaults(properties, _.pick(this.options, SharedOptions));

  const config = this.config.get(relativePath);
  _.defaults(properties, _.pick(config, SharedOptions));

  const pomProps = this._readPom(this.destinationPath(relativePath));
  _.defaults(properties, _.pick(pomProps, SharedOptions));

  const parent = {};
  _.defaults(parent, _.pick(this.config.getAll(), ParentProperties));

  const parentPomProps = this._readPom(this.destinationPath());
  _.defaults(parent, _.pick(parentPomProps, ParentProperties));
  properties.parent = parent;

  if (this.options.defaults) {
    if (properties.appId) {
      _.defaults(properties, { artifactId: properties.appId });
    }

    _.defaults(properties, { examples: false });
  }

  return properties;
};

/**
 * List all templates in a Generator's `shared` or `examples` directories. DRY.
 *
 * @returns {*[]} list of template files
 */
const _listTemplates = function (dir) {
  const files = [];

  const patterns = [this.templatePath(dir, '**/*'), this.templatePath(dir, '**/.*')];
  const paths = globbySync(patterns, { onlyFiles: true });
  for (const idx in paths) {
    if (Object.prototype.hasOwnProperty.call(paths, idx)) {
      const file = paths[idx];
      files.push({
        src: file,
        dest: this.destinationPath(this.relativePath, path.relative(this.templatePath(dir), file)),
      });
    }
  }

  return files;
};

const _initializing = function () {
  if (!this.moduleType) {
    throw new Error('`this.moduleType` must be specified to use Module shared functions.');
  }

  if (!this.moduleName) {
    // Module name not provided, try to derive it:
    this.moduleName = this.constructor.name.replace(/^AEM/, '').replace(/Generator/, '');
  }

  const config = this.config.getAll();
  if (_.isEmpty(config) && _.isEmpty(this.options.parent)) {
    throw new Error(
      chalk.red(`${this.moduleName} Generator cannot be use outside existing project context.`) +
        '\n\n' +
        `You are trying to use the ${this.moduleName} Generator without the context of a parent project.\n` +
        'This is not a supported feature. Please either: \n\n' +
        '\t * Run in the context of a project previously created using: ' +
        chalk.yellow('yo @adobe/aem') +
        ', or\n' +
        `\t * Run ${this.moduleName} Generator from existing AEM project root, by using: ` +
        chalk.yellow(`yo @adobe/aem --modules ${this.moduleType}`) +
        '.'
    );
  }

  this.relativePath = this.options.generateInto || path.relative(this.destinationRoot(), this.contextRoot);
  if (this.relativePath.length === 0) {
    throw new Error(chalk.red(`${this.moduleName} Generator must either specify a destination folder via `) + chalk.yellow('generateInto') + chalk.red(' option or be run from the target directory.'));
  }

  this.props = this.props || {};
  _.defaultsDeep(this.props, _.pick(this.options, ['parent']));
  _.defaults(this.props, this.config.get(this.relativePath));

  this.props.parent = this.props.parent || {};
  for (const p in ParentProperties) {
    if (Object.prototype.hasOwnProperty.call(ParentProperties, p)) {
      const name = ParentProperties[p];
      if (this.props.parent[name] === undefined && this.config.get(name)) {
        this.props.parent[name] = this.config.get(name);
      }
    }
  }

  if (this.props.moduleType && this.props.moduleType !== this.moduleType) {
    throw new Error(chalk.red(`Refusing to create ${this.moduleName} module in a non ${this.moduleName} module directory.`));
  }

  // Populate Shared
  _.defaults(this.props, { moduleType: this.moduleType });
  _.defaultsDeep(this.props, this._loadProps(this.relativePath));
};

/**
 * Creates a list of prompts shared by all generators. Prompts are configured based on provided properties.
 */
const _prompting = function (customPrompts = []) {
  return this.prompt(prompts.call(this).concat(customPrompts)).then((answers) => {
    processAnswers.call(this, answers);
    _.merge(this.props, answers);
  });
};

const _configuring = function () {
  const current = this.config.get(this.relativePath) || {};
  _.merge(current, _.omit(this.props, ['parent']));
  this.config.set(this.relativePath, current);
};

/**
 * Writes files using the provided the Generator fs reference.
 *
 * Will automatically include all templates in a Generator's `shared` or `examples` (when set) directories. DRY.
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
 * @param {Object} options - Optional options to pass to the EJS template processor
 */
const _writing = function (templates = [], options = {}) {
  const localOptions = _.defaults(options, { delimiter: '%' });
  const fixpath = (filepath, props, fopts) => {
    const dest = filepath.replace(/_{2}([^_]+)_{2}/gi, `<${fopts.delimiter}= $1 ${fopts.delimiter}>`);
    return ejs.render(dest, props, fopts);
  };

  for (const t of templates) {
    this.fs.copyTpl(t.src, fixpath(t.dest, this.props, localOptions), this.props, localOptions);
  }
};

const ModuleMixins = {
  _moduleOptions,
  _apiCoordinates,
  _latestRelease,
  _readPom,
  _loadProps,
  _listTemplates,
  _initializing,
  _prompting,
  _configuring,
  _writing,
};
export default ModuleMixins;
