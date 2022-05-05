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
import chalk from 'chalk';

import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import Generator from 'yeoman-generator';

import ModuleMixins from '../../../lib/module-mixins.js';
import UtilMixins from '../../../lib/util-mixins.js';

class AEMParentPomGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);
  }

  initializing() {
    this.props = this.config.getAll();
  }

  writing() {
    const files = [];
    files.push(
      {
        src: this.templatePath('README.md'),
        dest: this.destinationPath('README.md'),
      },
      {
        src: this.templatePath('.gitignore'),
        dest: this.destinationPath('.gitignore'),
      },
      {
        src: this.templatePath('pom.xml'),
        dest: this.destinationPath('pom.xml'),
      }
    );

    return this._latestApi(this.props.aemVersion).then((aemMetadata) => {
      const config = this.config.getAll();
      this.props.modules = [];
      _.forOwn(config, (value, key) => {
        if (value && value.moduleType) {
          this.props.modules.push(key);
        }
      });

      this.props.aem = aemMetadata;
      if (this.props.aemVersion !== 'cloud') {
        const depPom = this.fs.read(this.templatePath('partials', 'v6.5', 'dependency-management', 'pom.xml'));

        const parser = new XMLParser({
          ignoreAttributes: true,
          ignoreDeclaration: true,
          numberParseOptions: {
            skipLike: /\d+.\d+/,
          },
        });
        const dependencies = parser.parse(depPom).project.dependencies;
        const builder = new XMLBuilder({ format: true });
        this.props.dependencies = builder.build(dependencies);
      }

      this._writing(files);
    });
  }

  conflicts() {}

  install() {
    const options = this.options.showBuildOutput ? {} : { stdio: 'ignore' };
    return this.spawnCommand('mvn', ['clean', 'verify'], options).catch((error) => {
      throw new Error(chalk.red('Maven build failed with error: \n\n\t' + error.message + '\n\nPlease retry the build manually to determine the issue.'));
    });
  }
}

_.extendWith(AEMParentPomGenerator.prototype, ModuleMixins, UtilMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { AEMParentPomGenerator };
export default AEMParentPomGenerator;
