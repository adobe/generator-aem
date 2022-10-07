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

import Generator from 'yeoman-generator';
import ModuleMixins from '../../lib/module-mixins.js';
import PomUtils from '../../lib/pom-utils.js';

import { generatorName as contentGeneratorName } from '../package-content/index.js';

export const generatorName = '@adobe/generator-aem:tests-ui';

class UITestsGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    _.forOwn(this.moduleOptions, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function () {
      return generatorName;
    };
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
    this._duplicateCheck();
    const content = this._findModules(contentGeneratorName);
    if (content.length === 0) {
      throw new Error('Unable to create UI Test package, Content package is required and not found.');
    }
  }

  writing() {
    const tplProps = {
      ..._.pick(this.props, ['artifactId', 'name']),
      parent: this.parentProps,
    };

    const files = [];
    files.push(...this._listTemplates('shared'));

    if (this.parentProps.aemVersion === 'cloud') {
      files.push(...this._listTemplates('cloud'));
    } else {
      files.push(...this._listTemplates('v6.5'));
    }

    this._writing(files, tplProps);
    if (this.env.rootGenerator() === this) {
      PomUtils.addModuleToParent(this);
    }
  }

  install() {
    // Make sure build is run with this new/updated module
    if (this.env.rootGenerator() === this) {
      return this._install({ cwd: path.dirname(this.destinationPath()) });
    }
  }
}

_.extendWith(UITestsGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default UITestsGenerator;
