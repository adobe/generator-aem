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

import _ from 'lodash';

import Generator from 'yeoman-generator';
import AEMModuleFunctions from '../../../lib/module.js';
import GeneratorCommons from '../../../lib/common.js';

import { BundleModuleType } from '../../bundle/index.js';
import { StructurePackageModuleType } from '../structure/index.js';
import { ConfigPackageModuleType } from '../config/index.js';
import { AppsPackageModuleType } from '../apps/index.js';

const AllPackageModuleType = 'package:all';
/* eslint-disable prettier/prettier */

const packagedModules = new Set([
  BundleModuleType,
  StructurePackageModuleType,
  ConfigPackageModuleType,
  AppsPackageModuleType,
]);

const tplFiles = [
  'pom.xml',
];
/* eslint-enable prettier/prettier */

class AEMAllPackageGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    this.moduleType = AllPackageModuleType;
  }

  default() {
    if (this.runParent) {
      const config = this.config.getAll();
      _.each(config, (value, key) => {
        if (value.moduleType && value.moduleType === AllPackageModuleType && key !== this.relativePath) {
          throw new Error('Refusing to create a second All Package module.');
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

    files.push(...GeneratorCommons.listTemplates(this));
    GeneratorCommons.write(this, files);
  }
}

_.extendWith(AEMAllPackageGenerator.prototype, AEMModuleFunctions, (objectValue, srcValue) => {
  return _.isUndefined(objectValue) ? srcValue : objectValue;
});

export { AEMAllPackageGenerator, AllPackageModuleType };

export default AEMAllPackageGenerator;
