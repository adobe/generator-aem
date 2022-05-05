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

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import _ from 'lodash';

import Generator from 'yeoman-generator';

import ModuleMixins from '../../lib/module-mixins.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const StructurePackageModuleType = 'package:structure';

class AEMStructurePackageGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    this.moduleType = StructurePackageModuleType;

    _.forOwn(this._options, (v, k) => {
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
        if (value.moduleType && value.moduleType === StructurePackageModuleType && key !== this.relativePath) {
          throw new Error('Refusing to create a second Repository Structure module.');
        }
      });

      // Need to have parent update module list.
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith(path.join(dirname, '..', 'app', 'pom'), options);
    }
  }

  writing() {
    const files = [];
    _.each(['pom.xml', 'README.md'], (f) => {
      files.push({
        src: this.templatePath(f),
        dest: this.destinationPath(this.relativePath, f),
      });
    });
    this._writing(files);
  }
}

_.extendWith(AEMStructurePackageGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { AEMStructurePackageGenerator, StructurePackageModuleType };

export default AEMStructurePackageGenerator;
