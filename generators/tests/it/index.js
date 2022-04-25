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
import { globbySync } from 'globby';
import { XMLParser } from 'fast-xml-parser';

import Generator from 'yeoman-generator';
import GeneratorCommons from '../../../lib/common.js';
import AEMModuleFunctions from '../../../lib/module.js';
import Utils from '../../../lib/utils.js';

const invalidPackageRegex = /[^a-zA-Z.]/g;
const uniqueProperties = ['package', 'publish'];

const IntegrationTestsModuleType = 'tests:it';

/* eslint-disable prettier/prettier */
const tplFiles = [
  'pom.xml',
];
/* eslint-enable prettier/prettier */

class IntegrationTestsGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.moduleType = IntegrationTestsModuleType;

    const options_ = {};
    _.defaults(options_, GeneratorCommons.options, {
      package: {
        type: String,
        desc: 'Java Source Package (e.g. "com.mysite").',
      },
      publish: {
        desc: 'Indicate whether or not there is a Publish tier in the target AEM environments.',
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

    if (this.options.defaults) {
      this.props.publish = this.props.publish || true;
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
      {
        name: 'publish',
        message: 'Whether or not there is a Publish tier in the target AEM environments.',
        type: 'confirm',
        when: properties.publish === undefined,
        default: true,
      },
    ]);
    return this.prompt(prompts).then((answers) => {
      GeneratorCommons.processAnswers(this, answers);
      _.merge(this.props, answers);
    });
  }

  default() {
    if (this.runParent) {
      const config = this.config.getAll();
      _.each(config, (value, key) => {
        if (value.moduleType && value.moduleType === IntegrationTestsModuleType && key !== this.relativePath) {
          throw new Error('Refusing to create a second Integration Testing module.');
        }
      });

      AEMModuleFunctions.default.bind(this).call();
    }
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

  writing() {
    const files = [];

    _.each(tplFiles, (f) => {
      files.push({
        src: this.templatePath(f),
        dest: this.destinationPath(this.relativePath, f),
      });
    });

    if (this.props.publish) {
      const patterns = [this.templatePath('publish', '**/*'), this.templatePath('publish', '**/.*')];
      const paths = globbySync(patterns, { onlyFiles: true });
      for (const idx in paths) {
        if (Object.prototype.hasOwnProperty.call(paths, idx)) {
          const file = paths[idx];
          files.push({
            src: file,
            dest: this.destinationPath(this.relativePath, path.relative(this.templatePath('publish'), file)),
          });
        }
      }
    }

    files.push(...GeneratorCommons.listTemplates(this));

    return this._testingClientApi(this.props.parent.aemVersion)
      .then(Utils.latestApi)
      .then((aemMetadata) => {
        this.props.aem = aemMetadata;
        this.props.packagePath = this.props.package.replaceAll('.', path.sep);
        GeneratorCommons.write(this, files);
      });
  }
}

_.extendWith(IntegrationTestsGenerator.prototype, AEMModuleFunctions, (objectValue, srcValue) => {
  return _.isUndefined(objectValue) ? srcValue : objectValue;
});

export { IntegrationTestsGenerator, IntegrationTestsModuleType };

export default IntegrationTestsGenerator;
