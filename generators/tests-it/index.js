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
import ejs from 'ejs';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import Generator from 'yeoman-generator';
import ModuleMixins from '../../lib/module-mixins.js';
import MavenUtils from '../../lib/maven-utils.js';
import PomUtils from '../../lib/pom-utils.js';

const invalidPackageRegex = /[^a-zA-Z.]/g;
export const generatorName = '@adobe/generator-aem:tests-it';

const testClientCoordinates = (version) => {
  if (version === 'cloud') {
    return {
      groupId: 'com.adobe.cq',
      artifactId: 'aem-cloud-testing-clients',
    };
  }

  return {
    groupId: 'com.adobe.cq',
    artifactId: 'cq-testing-clients-65',
  };
};

class IntegrationTestsGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    _.defaults(this.moduleOptions, {
      package: {
        type: String,
        desc: 'Java Test Source Package (e.g. "com.mysite").',
      },
      publish: {
        desc: 'Indicate whether or not there is a Publish tier in the target AEM environments.',
      },
    });

    _.forOwn(this.moduleOptions, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function () {
      return generatorName;
    };
  }

  initializing() {
    this._initializing();

    _.defaults(this.props, _.pick(this.options, ['package']));

    if (this.options.publish !== undefined || this.options.defaults) {
      this.props.publish = true;
    }

    if (this.props.package && invalidPackageRegex.test(this.props.package)) {
      delete this.props.package;
    }

    this.props.package = this.props.package || this.parentProps.groupId;
  }

  prompting() {
    const prompts = [
      {
        name: 'package',
        message: 'Java Test Source Package (e.g. "com.mysite").',
        validate(pkg) {
          return new Promise((resolve) => {
            if (!pkg || pkg.length === 0) {
              resolve('Package must be provided.');
              return;
            }

            if (invalidPackageRegex.test(pkg)) {
              resolve('Package must only contain letters or periods (.).');
              return;
            }

            resolve(true);
          });
        },
        when: () => {
          return new Promise((resolve) => {
            // Use Options, not props as props will default to parent group id
            // Which may not be what the user wants.
            if (this.options.defaults && this.options.package) {
              resolve(false);
              return;
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
        when: this.props.publish === undefined,
        default: true,
      },
    ];
    return this._prompting(prompts);
  }

  configuring() {
    this._configuring();
  }

  default() {
    this._duplicateCheck();
  }

  writing() {
    return MavenUtils.latestRelease(testClientCoordinates(this.parentProps.aemVersion)).then((clientMetadata) => {
      this.props.testingClient = clientMetadata;

      const files = [];
      files.push(...this._listTemplates('shared'));

      if (this.props.publish) {
        files.push(...this._listTemplates('publish'));
      }

      const tplProps = {
        ...this.props,
        testingClient: clientMetadata,
        packagePath: this.props.package.replaceAll('.', path.sep),
      };
      this._writing(files, tplProps);
      this._writePom();

      if (this.env.rootGenerator() === this) {
        PomUtils.addModuleToParent(this);
      }
    });
  }

  install() {
    // Make sure build is run with this new/updated module
    if (this.env.rootGenerator() === this) {
      return this._install({ cwd: path.dirname(this.destinationPath()) });
    }
  }

  _writePom() {
    const tplProps = _.pick(this.props, ['name', 'artifactId', 'testingClient']);
    tplProps.parent = this.parentProps;

    // Read the template and parse w/ properties.
    const genPom = ejs.render(this.fs.read(this.templatePath('pom.xml')), tplProps);

    const pomFile = this.destinationPath('pom.xml');
    if (this.fs.exists(pomFile)) {
      this._mergeWritePom(genPom, pomFile);
    } else {
      this.fs.write(pomFile, genPom);
    }
  }

  _mergeWritePom(genPom, existingFile) {
    const parser = new XMLParser(PomUtils.xmlOptions);
    const builder = new XMLBuilder(PomUtils.xmlOptions);
    const parsedGenPom = parser.parse(genPom);
    const genProject = PomUtils.findPomNodeArray(parsedGenPom, 'project');
    const existingPom = PomUtils.findPomNodeArray(parser.parse(this.fs.read(existingFile)), 'project');

    // Merge the different sections
    PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'properties'), PomUtils.findPomNodeArray(existingPom, 'properties'), PomUtils.propertyPredicate);

    PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'build', 'plugins'), PomUtils.findPomNodeArray(existingPom, 'build', 'plugins'), PomUtils.pluginPredicate);

    PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'profiles'), PomUtils.findPomNodeArray(existingPom, 'profiles'), PomUtils.profilePredicate);

    PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'dependencies'), PomUtils.findPomNodeArray(existingPom, 'dependencies'), PomUtils.dependencyPredicate);
    this.fs.write(existingFile, PomUtils.fixXml(builder.build(parsedGenPom)));
  }
}

_.extendWith(IntegrationTestsGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default IntegrationTestsGenerator;
