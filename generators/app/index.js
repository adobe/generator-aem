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
import chalk from 'chalk';

import GeneratorCommons from '../../lib/common.js';

class AEMGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    const opts = {};

    _.forEach(_.merge(GeneratorCommons.options, opts), (v, k) => {
      this.option(k, v);
    });
  }
}

export default AEMGenerator;
