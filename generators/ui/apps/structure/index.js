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

import GeneratorCommons from '../../../../lib/common.js';
import AEMModuleFunctions from '../../../../lib/module.js';

const UIAppsStructureModuleType = 'ui:apps:structure';

/* eslint-disable prettier/prettier */
const tplFiles = [
  'pom.xml',
  'README.md',
];
/* eslint-enable prettier/prettier */

class AEMUIAppsStructureGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    this.moduleType = UIAppsStructureModuleType;

    const options_ = {};
    _.defaults(options_, GeneratorCommons.options);
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
        if (value.moduleType && value.moduleType === UIAppsStructureModuleType && key !== this.relativePath) {
          throw new Error('Refusing to create a second Repository Structure module.');
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
    GeneratorCommons.write(this, files);
  }
}

AEMUIAppsStructureGenerator.prototype.initializing = AEMModuleFunctions.initializing;
AEMUIAppsStructureGenerator.prototype.configuring = AEMModuleFunctions.configuring;

export { AEMUIAppsStructureGenerator, UIAppsStructureModuleType };

export default AEMUIAppsStructureGenerator;
