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
import Generator from 'yeoman-generator';

import _ from 'lodash';
import chalk from 'chalk';
import { globbySync } from 'globby';

import GeneratorCommons from '../../lib/common.js';
import { ParentProperties } from '../app/index.js';

import Utils from '../../lib/utils.js';

const invalidPackageRegex = /[^a-zA-Z.]/g;

const uniqueProperties = ['package'];

class AEMBundleGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    const options_ = {};
    _.defaults(options_, GeneratorCommons.options, {
      package: {
        type: String,
        desc: 'Java Source Package (e.g. "com.mysite").',
      },
    });

    _.forIn(options_, (v, k) => {
      this.option(k, v);
    });
  }

  initializing() {
    // If we have parent options, then we don't need to re-run the root AEM Generator. It called this one.
    this.runParent = _.isEmpty(this.options.parent);

    const config = this.config.getAll();
    if (_.isEmpty(config) && _.isEmpty(this.options.parent)) {
      throw new Error(
        chalk.red('Bundle Generator cannot be use outside existing project context.') +
          '\n\n' +
          'You are trying to use the AEM Bundle Generator without the context of a parent project.\n' +
          'This is not a supported feature. Please either: \n\n' +
          '\t * Run in the context of a project previously created using: ' +
          chalk.yellow('yo @adobe/aem') +
          ', or\n' +
          '\t * Run Bundle Generator from existing AEM project root, by using: ' +
          chalk.yellow('yo @adobe/aem --modules bundle') +
          '.'
      );
    }

    this.relativePath = this.options.generateInto || path.relative(this.destinationRoot(), this.contextRoot);
    if (this.relativePath.length === 0) {
      throw new Error(chalk.red('Bundle Generator must either specify an destination folder via ') + chalk.yellow('generateInto') + chalk.red(' option or from the target directory.'));
    }

    this.props = {};
    _.defaults(this.props, _.pick(this.options, uniqueProperties.concat(['parent'])));

    if (this.props.package && invalidPackageRegex.test(this.props.package)) {
      delete this.props.package;
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

    if (this.props.parent.groupId) {
      this.props.package = this.props.package || this.props.parent.groupId;
    }

    if (this.props.moduleType && this.props.moduleType !== 'bundle') {
      throw new Error(chalk.red('Refusing to create Bundle module in a non-bundle directory.'));
    }

    // Populate Shared
    _.defaults(this.props, { moduleType: 'bundle' });
    if (this.relativePath.length > 0) {
      _.defaults(this.props, GeneratorCommons.props(this, this.relativePath));
    }
  }

  prompting() {
    const properties = this.props;
    const prompts = GeneratorCommons.prompts(this).concat([
      {
        name: 'package',
        message: 'Java Source Package (e.g. "com.mysite").',
        /* c8 ignore start */
        validate(package_) {
          return new Promise((resolve) => {
            if (!package_ || package_.length === 0) {
              resolve('Package must be provided.');
            } else if (invalidPackageRegex.test(package_)) {
              resolve('Package must only contain letters or periods (.).');
            }

            resolve(true);
          });
        },
        /* c8 ignore stop */
        when() {
          return new Promise((resolve) => {
            if (properties.defaults && properties.package) {
              resolve(false);
            }

            resolve(true);
          });
        },
        default: this.props.package,
      },
    ]);
    return this.prompt(prompts).then((answers) => {
      GeneratorCommons.processAnswers(this, answers);
      _.merge(this.props, answers);
    });
  }

  configuring() {
    if (this.relativePath && this.relativePath.length === 0) {
      this.relativePath = this.props.appId;
    }

    const current = this.config.get(this.relativePath) || {};
    _.merge(current, _.omit(this.props, ['parent']));
    this.config.set(this.relativePath, current);
  }

  default() {
    if (this.runParent) {
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith('@adobe/aem:app', options);
    }
  }

  writing() {
    const files = [];

    let patterns;
    if (this.props.examples) {
      patterns = this.templatePath('examples', '**/*');
      const paths = globbySync(patterns, { onlyFiles: true });
      for (const idx in paths) {
        if (Object.prototype.hasOwnProperty.call(paths, idx)) {
          const file = paths[idx];
          files.push({
            src: file,
            dest: this.destinationPath(this.relativePath, path.relative(this.templatePath('examples'), file)),
          });
        }
      }
    }

    patterns = this.templatePath('shared', '**/*');
    const paths = globbySync(patterns, { onlyFiles: true });
    for (const idx in paths) {
      if (Object.prototype.hasOwnProperty.call(paths, idx)) {
        const file = paths[idx];
        files.push({
          src: file,
          dest: this.destinationPath(this.relativePath, path.relative(this.templatePath('shared'), file)),
        });
      }
    }

    files.push({
      src: this.templatePath('pom.xml'),
      dest: this.destinationPath(this.relativePath, 'pom.xml'),
    });

    return Utils.latestApi(this.props.parent.aemVersion).then((aemMetadata) => {
      this.props.aem = aemMetadata;
      this.props.packagePath = this.props.package.replaceAll('.', path.sep);
      GeneratorCommons.write(this, files);
    });
  }
}

export default AEMBundleGenerator;