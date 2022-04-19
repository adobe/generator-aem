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

import { ParentProperties } from '../generators/app/index.js';
import GeneratorCommons from './common.js';

const AEMModuleFunctions = {
  initializing() {
    if (!this.moduleType) {
      throw new Error('`this.moduleType` must be specified to use Module shared functions.');
    }

    if (!this.moduleName) {
      // Module name not provided, try to derive it:
      this.moduleName = this.constructor.name.replace('/^AEM/', '').replace('/Generator/', '');
    }

    this.moduleId = this.options.namespace.replace('@adobe/aem:', '');

    // If we have parent options, then we don't need to re-run the root AEM Generator. It called this one.
    this.runParent = _.isEmpty(this.options.parent);

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
          chalk.yellow(`yo @adobe/aem --modules ${this.moduleId}`) +
          '.'
      );
    }

    this.relativePath = this.options.generateInto || path.relative(this.destinationRoot(), this.contextRoot);
    if (this.relativePath.length === 0) {
      throw new Error(
        chalk.red(`${this.moduleName} Generator must either specify an destination folder via `) + chalk.yellow('generateInto') + chalk.red(' option or be run from the target directory.')
      );
    }

    this.props = {};

    _.defaults(this.props, _.pick(this.options, ['parent']));
    if (this._preProcessProperties) {
      this._preProcessProperties();
    }

    if (this.relativePath.length > 0) {
      _.defaults(this.props, this.config.get(this.relativePath));
    }

    this.props.parent = this.props.parent || {};
    for (const p in ParentProperties) {
      if (Object.prototype.hasOwnProperty.call(ParentProperties, p)) {
        const name = ParentProperties[p];
        this.props.parent[name] = this.props.parent[name] || this.config.get(name);
      }
    }

    if (this.props.moduleType && this.props.moduleType !== this.moduleType) {
      throw new Error(chalk.red(`Refusing to create ${this.moduleName} module in a non-${this.moduleType} directory.`));
    }

    // Populate Shared
    _.defaults(this.props, { moduleType: this.moduleType });
    if (this.relativePath.length > 0) {
      _.defaults(this.props, GeneratorCommons.props(this, this.relativePath, this._postProcessProperties));
    }
  },

  configuring() {
    if (this.relativePath && this.relativePath.length === 0) {
      this.relativePath = this.props.appId;
    }

    const current = this.config.get(this.relativePath) || {};
    _.merge(current, _.omit(this.props, ['parent']));
    this.config.set(this.relativePath, current);
  },

  default() {
    if (this.runParent) {
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith('@adobe/aem:app', options);
    }
  },
};

export default AEMModuleFunctions;
