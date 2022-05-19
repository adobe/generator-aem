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
import { ConfigPackageModuleType } from '../package-config/index.js';
import { AppsPackageModuleType } from '../package-apps/index.js';
import { ContentPackageModuleType } from '../package-content/index.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const AllPackageModuleType = 'package-all';

/* eslint-disable prettier/prettier */
const packagedModules = new Set([
  BundleModuleType,
  StructurePackageModuleType,
  ConfigPackageModuleType,
  AppsPackageModuleType,
  ContentPackageModuleType,
]);
/* eslint-enable prettier/prettier */

class AEMAllPackageGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    this.moduleType = AllPackageModuleType;

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
        if (value.moduleType && value.moduleType === AllPackageModuleType && key !== this.relativePath) {
          throw new Error('Refusing to create a second All Package module.');
        }
      });

      // Need to have parent update module list.
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith(path.join(dirname, '..', 'app'), options);
    }
  }

  writing() {
    const files = [];

    files.push(...this._listTemplates());

    const config = this.config.getAll();
    const dependencies = [];
    _.forOwn(config, (value) => {
      if (value.moduleType && packagedModules.has(value.moduleType)) {
        dependencies.push({
          /* eslint-disable no-template-curly-in-string */
          groupId: '${project.groupId}',
          artifactId: value.artifactId,
          version: '${project.version}',
          type: value.moduleType === BundleModuleType ? 'jar' : 'zip',
          target: `/apps/${this.props.appId}-packages/application/install`,
          /* eslint-enable no-template-curly-in-string */
        });
      }
    });
    this.props.dependencies = dependencies;

    this._writing(files);
  }
}

_.extendWith(AEMAllPackageGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { AEMAllPackageGenerator, AllPackageModuleType };
export default AEMAllPackageGenerator;
