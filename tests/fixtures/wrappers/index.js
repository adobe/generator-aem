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

import AEMGenerator from '../../../generators/app/index.js';
import { generatorPath } from '../helpers.js';

export class AEMAppInit extends AEMGenerator {
  constructor(args, options, features) {
    options.resolved = generatorPath('app', 'index.js');
    super(args, options, features);
  }
  initializing() {
    super.initializing();
  }
}

export class AEMAppConfig extends AEMGenerator {
  constructor(args, options, features) {
    options.resolved = generatorPath('app', 'index.js');
    super(args, options, features);
    this.props = options.props;
  }

  configuring() {
    super.configuring();
  }
}

export class AEMAppDefault extends AEMGenerator {
  constructor(args, options, features) {
    options.resolved = generatorPath('app', 'index.js');
    super(args, options, features);
    this.props = options.props;
  }

  configuring() {
    this.config.set(this.props);
  }

  default() {
    super.default();
  }
}

export class AEMAppWriting extends AEMGenerator {
  constructor(args, options, features) {
    options.resolved = generatorPath('app', 'index.js');
    super(args, options, features);
    this.props = options.props;
  }

  writing() {
    super.writing();
  }
}



const wrappers = {
  AEMAppInit,
  AEMAppConfig,
  AEMAppDefault,
};

export default wrappers;
