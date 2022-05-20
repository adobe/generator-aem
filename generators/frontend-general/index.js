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
import { globbySync } from 'globby';

import Generator from 'yeoman-generator';

import ModuleMixins from '../../lib/module-mixins.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const GeneralFEModuleType = 'frontend-general';

/* eslint-disable prettier/prettier */
const tplFiles = [
  'pom.xml',
  'README.md',
  '.babelrc',
  '.eslintrc.json',
  'tsconfig.json',
  'webpack.common.js',
  'webpack.dev.js',
  'webpack.prod.js',
  'clientlib.config.cjs',
];
/* eslint-enable prettier/prettier */

class GeneralFEGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    this.moduleType = GeneralFEModuleType;

    _.forOwn(this._moduleOptions, (v, k) => {
      this.option(k, v);
    });
  }

  initializing() {
    this.props = {};
    this._initializing();
  }

  prompting() {
    return this._prompting();
  }

  configuring() {
    this._configuring();
  }

  default() {
    if (_.isEmpty(this.options.parent)) {
      // Need to have parent update module list.
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith(path.join(dirname, '..', 'app'), options);
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

    const patterns = [this.templatePath('src', '**/*'), this.templatePath('src', '**/.*')];
    const paths = globbySync(patterns, { onlyFiles: true });
    for (const idx in paths) {
      if (Object.prototype.hasOwnProperty.call(paths, idx)) {
        const file = paths[idx];
        files.push({
          src: file,
          dest: this.destinationPath(this.relativePath, path.relative(this.templatePath(), file)),
        });
      }
    }

    const pkg = _.defaults(
      {
        name: this.props.artifactId,
        version: this.props.parent.version,
      },
      this.fs.readJSON(this.templatePath('package.json'), {})
    );
    this.writeDestinationJSON(path.join(this.relativePath, 'package.json'), pkg);
    this._writing(files);
  }
}

_.extendWith(GeneralFEGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { GeneralFEGenerator, GeneralFEModuleType };

export default GeneralFEGenerator;
