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
import GeneratorCommons from '../../lib/common.js';
import AEMModuleFunctions from '../../lib/module.js';
import Utils from '../../lib/utils.js';

const invalidPackageRegex = /[^a-zA-Z.]/g;
const uniqueProperties = ['package'];

const BundleModuleType = 'bundle';

/* eslint-disable prettier/prettier */
const tplFiles = [
  'pom.xml',
];
/* eslint-enable prettier/prettier */

class AEMBundleGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.moduleType = BundleModuleType;

    const options_ = {};
    _.defaults(options_, GeneratorCommons.options, {
      package: {
        type: String,
        desc: 'Java Source Package (e.g. "com.mysite").',
      },
    });

    _.forOwn(options_, (v, k) => {
      this.option(k, v);
    });
  }

  _preProcessProperties() {
    _.defaults(this.props, _.pick(this.options, uniqueProperties));

    if (this.props.package && invalidPackageRegex.test(this.props.package)) {
      delete this.props.package;
    }
  }

  _postProcessProperties() {
    if (this.props.parent.groupId) {
      this.props.package = this.props.package || this.props.parent.groupId;
    }
  }

  prompting() {
    const properties = this.props;
    const prompts = GeneratorCommons.prompts(this).concat([
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
    ]);
    return this.prompt(prompts).then((answers) => {
      GeneratorCommons.processAnswers(this, answers);
      _.merge(this.props, answers);
    });
  }

  writing() {
    const files = [];

    _.each(tplFiles, (f) => {
      files.push({
        src: this.templatePath(f),
        dest: this.destinationPath(this.relativePath, f),
      });
    });

    files.push(...GeneratorCommons.listTemplates(this));

    return Utils.latestApi(this.props.parent.aemVersion).then((aemMetadata) => {
      this.props.aem = aemMetadata;
      this.props.packagePath = this.props.package.replaceAll('.', path.sep);
      GeneratorCommons.write(this, files);
    });
  }
}

_.extendWith(AEMBundleGenerator.prototype, AEMModuleFunctions, (objectValue, srcValue) => {
  return _.isUndefined(objectValue) ? srcValue : objectValue;
});

export { AEMBundleGenerator, BundleModuleType };
export default AEMBundleGenerator;
