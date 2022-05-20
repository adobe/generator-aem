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

import _ from 'lodash';

import Generator from 'yeoman-generator';

import ModuleMixins from '../../lib/module-mixins.js';

import { BundleModuleType } from '../bundle/index.js';
import { StructurePackageModuleType } from '../package-structure/index.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const ConfigPackageModuleType = 'package-config';

class ConfigPackageGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.moduleType = ConfigPackageModuleType;

    _.forOwn(this._moduleOptions, (v, k) => {
      this.option(k, v);
    });
  }

  initializing() {
    this._initializing();
  }

  prompting() {
    return this._prompting();
  }

  configuring() {
    this._configuring();
  }

  default() {
    if (_.isEmpty(this.options.parent)) {
      const config = this.config.getAll();
      _.each(config, (value, key) => {
        if (value.moduleType && value.moduleType === ConfigPackageModuleType && key !== this.relativePath) {
          throw new Error('Refusing to create a second Config Package module.');
        }
      });
      // Need to have parent update module list.
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith(path.join(dirname, '..', 'app'), options);
    }
  }

  writing() {
    const files = [];
    const config = this.config.getAll();
    _.each(config, (value, key) => {
      if (value.moduleType) {
        switch (value.moduleType) {
          case StructurePackageModuleType: {
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

    files.push(...this._listTemplates('shared'));

    if (this.props.parent.aemVersion !== 'cloud' && this.props.loggerPackages) {
      files.push(...this._listTemplates('loggers'));
    }

    this._writing(files);
  }
}

_.extendWith(ConfigPackageGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { ConfigPackageGenerator, ConfigPackageModuleType };

export default ConfigPackageGenerator;
