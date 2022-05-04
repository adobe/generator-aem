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
import got from 'got';
import { XMLParser } from 'fast-xml-parser';

import Generator from 'yeoman-generator';
import ModuleMixins from '../../../lib/module-mixins.js';
import UtilMixins from '../../../lib/util-mixins.js';

const invalidPackageRegex = /[^a-zA-Z.]/g;
const uniqueProperties = ['package', 'publish'];

const IntegrationTestsModuleType = 'tests:it';

class AEMIntegrationTestsGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.moduleType = IntegrationTestsModuleType;

    _.defaults(this._options, {
      package: {
        type: String,
        desc: 'Java Source Package (e.g. "com.mysite").',
      },
      publish: {
        desc: 'Indicate whether or not there is a Publish tier in the target AEM environments.',
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

    if (this.options.defaults) {
      this.props.publish = this.props.publish || true;
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
      {
        name: 'publish',
        message: 'Whether or not there is a Publish tier in the target AEM environments.',
        type: 'confirm',
        when: properties.publish === undefined,
        default: true,
      },
    ];
    return this._prompting(prompts);
  }

  configuring() {
    this._configuring();
  }

  default() {
    if (_.isEmpty(this.options.parent)) {
      const config = this.config.getAll();
      _.each(config, (value, key) => {
        if (value.moduleType && value.moduleType === IntegrationTestsModuleType && key !== this.relativePath) {
          throw new Error('Refusing to create a second Integration Testing module.');
        }
      });

      // Need to have parent update module list.
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith('@adobe/aem:app', options);
    }
  }

  writing() {
    const files = [];
    files.push(...this._listTemplates('shared'));

    if (this.props.publish) {
      files.push(...this._listTemplates('publish'));
    }

    return this._testingClientApi(this.props.parent.aemVersion)
      .then(this._latestApi)
      .then((aemMetadata) => {
        this.props.aem = aemMetadata;
        this.props.packagePath = this.props.package.replaceAll('.', path.sep);
        this._writing(files);
      });
  }

  _testingClientApi(aemVersion) {
    const coordinates = (version) => {
      if (version === 'cloud') {
        return {
          groupId: 'com.adobe.cq',
          artifactId: 'aem-cloud-testing-clients',
          path: 'com/adobe/cq/aem-cloud-testing-clients',
        };
      }

      return {
        groupId: 'com.adobe.cq',
        artifactId: 'cq-testing-clients-65',
        path: 'com/adobe/cq/cq-testing-clients-65',
      };
    };

    return new Promise((resolve, reject) => {
      const metadata = coordinates(aemVersion);
      try {
        got.get(`https://repo1.maven.org/maven2/${metadata.path}/maven-metadata.xml`, { responseType: 'text', resolveBodyOnly: true }).then((body) => {
          try {
            const parser = new XMLParser({
              ignoreAttributes: true,
              ignoreDeclaration: true,
            });
            const data = parser.parse(body);
            metadata.version = data.metadata.versioning.latest;
            this.props.testingClient = metadata;
            resolve(aemVersion);
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error.response ? error.response.body : error);
      }
    });
  }
}

_.extendWith(AEMIntegrationTestsGenerator.prototype, ModuleMixins, UtilMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { AEMIntegrationTestsGenerator, IntegrationTestsModuleType };

export default AEMIntegrationTestsGenerator;
