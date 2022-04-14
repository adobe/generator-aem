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

import Generator from 'yeoman-generator';
import _ from 'lodash';

import GeneratorCommons from '../../../lib/common.js';
import AEMModuleFunctions from '../../../lib/module.js';

class AEMUIAppsGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    const options_ = {};
    _.defaults(options_, GeneratorCommons.options);

    _.forIn(options_, (v, k) => {
      this.option(k, v);
    });
    this.moduleType = 'ui:apps';
  }

  prompting() {
    const prompts = GeneratorCommons.prompts(this);
    return this.prompt(prompts).then((answers) => {
      GeneratorCommons.processAnswers(this, answers);
      _.merge(this.props, answers);
    });
  }

  writing() {

  }
}

_.extend(AEMUIAppsGenerator.prototype, AEMModuleFunctions);

export default AEMUIAppsGenerator;
