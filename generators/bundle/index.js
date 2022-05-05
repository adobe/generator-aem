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
import UtilMixins from '../../lib/util-mixins.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const invalidPackageRegex = /[^a-zA-Z.]/g;
const uniqueProperties = ['package'];

const BundleModuleType = 'bundle';

class AEMBundleGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.moduleType = BundleModuleType;

    _.defaults(this._options, {
      package: {
        type: String,
        desc: 'Java Source Package (e.g. "com.mysite").',
      },
    });

    _.forOwn(this._options, (v, k) => {
      this.option(k, v);
    });
  }

  initializing() {
    this.props = {};
    _.defaults(this.props, _.pick(this.options, uniqueProperties));

    if (this.props.package && invalidPackageRegex.test(this.props.package)) {
      delete this.props.package;
    }

    this._initializing();

    if (this.props.parent.groupId) {
      this.props.package = this.props.package || this.props.parent.groupId;
    }
  }

  prompting() {
    const properties = this.props;
    const prompts = [
      {
        name: 'package',
        message: 'Java Source Package (e.g. "com.mysite").',
        /* c8 ignore start */
        validate(package_) {
          return new Promise((resolve) => {
            if (!package_ || package_.length === 0) {
              resolve('Package must be provided.');
            } else if (invalidPackageRegex.test(package_)) {
              resolve('Package must only contain letters or periods (.).');
            }

            resolve(true);
          });
        },
        /* c8 ignore stop */
        when() {
          return new Promise((resolve) => {
            if (properties.defaults && properties.package) {
              resolve(false);
            }

            resolve(true);
          });
        },
        default: this.props.package,
      },
    ];
    return this._prompting(prompts);
  }

  configuring() {
    this._configuring();
  }

  default() {
    if (_.isEmpty(this.options.parent)) {
      // Need to have parent update module list.
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith(path.join(dirname, '..', 'app', 'pom'), options);
    }
  }

  writing() {
    const files = [];
    files.push(...this._listTemplates('shared'));

    if (this.props.examples) {
      files.push(...this._listTemplates('examples'));
    }

    return this._latestApi(this.props.parent.aemVersion).then((aemMetadata) => {
      this.props.aem = aemMetadata;
      this.props.packagePath = this.props.package.replaceAll('.', path.sep);
      this._writing(files);
    });
  }
}

_.extendWith(AEMBundleGenerator.prototype, ModuleMixins, UtilMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { AEMBundleGenerator, BundleModuleType };
export default AEMBundleGenerator;
