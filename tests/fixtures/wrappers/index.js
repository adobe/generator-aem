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

import AEMGenerator from '../../../generators/app/index.js';
import project from '../helpers.js';

const generatorPath = path.join(project.generatorsRoot, 'app');

export class AEMAppWrapper extends AEMGenerator {
  constructor(args, options, features) {
    options.resolved = path.join(generatorPath, 'index.js');
    super(args, options, features);
  }

  initializing() {
    super.initializing();
  }

  prompting() {
    return super.prompting();
  }

  configuring() {
    super.configuring();
  }

  default() {
    super.default();
  }

  writing() {
    return super.writing();
  }

  install() {
    return super.install();
  }
}

export class AEMAppNoWrite extends AEMAppWrapper {
  initializing() {
    super.initializing();
  }

  prompting() {
    return super.prompting();
  }

  configuring() {
    super.configuring();
  }

  default() {
    super.default();
  }
}

const wrappers = {
  AEMAppWrapper,
  AEMAppNoWrite,
};

export default wrappers;
