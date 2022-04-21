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

import Generator from 'yeoman-generator';

import GeneratorCommons from '../../../lib/common.js';
import AEMModuleFunctions from '../../../lib/module.js';
import Utils from '../../../lib/utils.js';

import { UIAppsStructureModuleType } from '../apps/structure/index.js';
import { BundleModuleType } from '../../bundle/index.js';

const UIConfigModuleType = 'ui:config';

/* eslint-disable prettier/prettier */
const tplFiles = [
  'pom.xml',
];
/* eslint-enable prettier/prettier */

class AEMUIConfigGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.moduleType = UIConfigModuleType;

    const options_ = {};
    _.defaults(options_, GeneratorCommons.options, {
      bundleRef: {
        type: String,
        desc: 'Module name of bundle dependency, in this multi-module project.',
      },
    });
    _.forOwn(options_, (v, k) => {
      this.option(k, v);
    });
  }

  prompting() {
    const prompts = GeneratorCommons.prompts(this);
    return this.prompt(prompts).then((answers) => {
      GeneratorCommons.processAnswers(this, answers);
      _.merge(this.props, answers);
    });
  }

  default() {
    if (this.runParent) {
      const config = this.config.getAll();
      _.each(config, (value, key) => {
        if (value.moduleType && value.moduleType === UIConfigModuleType && key !== this.relativePath) {
          throw new Error('Refusing to create a second UI Config module.');
        }
      });

      AEMModuleFunctions.default.bind(this).call();
    }
  }

  writing() {
    const files = [];
    _.each(tplFiles, (f) => {
      files.push({
        src: this.templatePath(f),
        dest: this.destinationPath(this.relativePath, f),
      });
    });

    const config = this.config.getAll();
    _.each(config, (value, key) => {
      if (value.moduleType) {
        switch (value.moduleType) {
          case UIAppsStructureModuleType: {
            this.props.structure = { ref: key, artifactId: value.artifactId };
            break;
          }

          case BundleModuleType: {
            this.props.loggerPackages = this.props.loggerPackages || [];
            this.props.loggerPackages.push(value.package);
            break;
          }
          // No default
        }
      }
    });

    if (this.props.loggerPackages) {
      const patterns = [this.templatePath('loggers', '**/*'), this.templatePath('loggers', '**/.*')];
      const paths = globbySync(patterns, { onlyFiles: true });
      for (const idx in paths) {
        if (Object.prototype.hasOwnProperty.call(paths, idx)) {
          const file = paths[idx];
          files.push({
            src: file,
            dest: this.destinationPath(this.relativePath, path.relative(this.templatePath('loggers'), file)),
          });
        }
      }
    }

    files.push(...GeneratorCommons.listTemplates(this));
    return Utils.latestApi(this.props.parent.aemVersion).then((aemMetadata) => {
      this.props.aem = aemMetadata;
      GeneratorCommons.write(this, files);
    });
  }
}

_.extendWith(AEMUIConfigGenerator.prototype, AEMModuleFunctions, (objectValue, srcValue) => {
  return _.isUndefined(objectValue) ? srcValue : objectValue;
});

export { AEMUIConfigGenerator, UIConfigModuleType };

export default AEMUIConfigGenerator;
