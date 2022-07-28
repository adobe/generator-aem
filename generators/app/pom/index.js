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

class ParentPomGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
  }

  initializing() {
    this.props = this.config.getAll();
  }

  writing() {


    return this._latestRelease(this._apiCoordinates(this.props.aemVersion)).then((aemMetadata) => {
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
}

_.extendWith(ParentPomGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { ParentPomGenerator };
export default ParentPomGenerator;
