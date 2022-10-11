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

export const generatorName = '@adobe/generator-aem:frontend-general';

class GeneralFEGenerator extends Generator {
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

  writing() {
    const tplProps = {
      ..._.pick(this.props, ['name', 'appId', 'artifactId']),
      parent: this.parentProps,
    };

    const files = [];
    files.push(...this._listTemplates());
    this._writing(files, tplProps);

    const pkg = _.defaults(
      {
        name: this.props.artifactId,
        version: this.parentProps.version,
      },
      this.fs.readJSON(this.templatePath('package.json'), {})
    );
    this.writeDestinationJSON('package.json', pkg);

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

_.extendWith(GeneralFEGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});
export default GeneralFEGenerator;
