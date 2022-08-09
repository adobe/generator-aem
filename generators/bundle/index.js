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

import fs from 'node:fs';
import _ from 'lodash';
import Generator from 'yeoman-generator';

import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import ejs from 'ejs';
import ModuleMixins from '../../lib/module-mixins.js';
import PomUtils from '../../lib/pom-utils.js';

const invalidPackageRegex = /[^a-zA-Z.]/g;
export const generatorName = '@adobe/generator-aem:bundle';

class BundleGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    _.defaults(this.moduleOptions, {
      package: {
        type: String,
        desc: 'Java Source Package (e.g. "com.mysite").',
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

    if (this.props.package && invalidPackageRegex.test(this.props.package)) {
      delete this.props.package;
    }

    this.props.package = this.props.package || this.parentProps.groupId;
  }

  prompting() {
    const prompts = [
      {
        name: 'package',
        message: 'Java Source Package (e.g. "com.mysite").',
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
            if (this.options.defaults && this.options.package) {
              resolve(false);
              return;
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

  writing() {
    const files = [];
    files.push(...this._listTemplates('shared'));

    if (this.props.examples) {
      files.push(...this._listTemplates('examples'));
    }

    this.props.packagePath = this.props.package.replaceAll('.', path.sep);
    this._writing(files, this.props);
    this._writePom();

    if (this.env.rootGenerator() === this) {
      PomUtils.addModuleToParent(this);
    }
  }

  install() {
    // Make sure build is run with this new/updated module
    if (this.env.rootGenerator() === this) {
      return this._install({ cwd: path.dirname(this.destinationRoot()) });
    }
  }

  _writePom() {
    const tplProps = _.pick(this.props, ['name', 'artifactId']);
    tplProps.parent = this.parentProps;

    const parser = new XMLParser(PomUtils.xmlOptions);
    const builder = new XMLBuilder(PomUtils.xmlOptions);

    // Read the template and parse w/ properties.
    const genPom = ejs.render(fs.readFileSync(this.templatePath('pom.xml'), PomUtils.fileOptions), tplProps);
    const parsedGenPom = parser.parse(genPom);
    const genProject = PomUtils.findPomNodeArray(parsedGenPom, 'project');
    const genDependencies = PomUtils.findPomNodeArray(genProject, 'dependencies');

    const pomFile = this.destinationPath('pom.xml');

    if (this.fs.exists(pomFile)) {
      const existingPom = PomUtils.findPomNodeArray(parser.parse(this.fs.read(pomFile)), 'project');

      // Merge the different sections
      PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'properties'), PomUtils.findPomNodeArray(existingPom, 'properties'), PomUtils.propertyPredicate);

      PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'build', 'plugins'), PomUtils.findPomNodeArray(existingPom, 'build', 'plugins'), PomUtils.pluginPredicate);

      PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'profiles'), PomUtils.findPomNodeArray(existingPom, 'profiles'), PomUtils.profilePredicate);

      PomUtils.mergePomSection(genDependencies, PomUtils.findPomNodeArray(existingPom, 'dependencies'), PomUtils.dependencyPredicate);
    }

    const addlDeps = parser.parse(fs.readFileSync(this.templatePath('partials', 'v6.5', 'dependencies.xml'), { encoding: 'utf8' }))[0].dependencies;
    if (this.parentProps.aemVersion === 'cloud') {
      addlDeps.push({
        dependency: [{ groupId: [{ '#text': 'com.adobe.aem' }] }, { artifactId: [{ '#text': 'uber-jar' }] }],
      });
      PomUtils.removeDependencies(genDependencies, addlDeps);
    } else {
      PomUtils.addDependencies(genDependencies, addlDeps, tplProps.parent.aem);
    }

    this.fs.write(pomFile, PomUtils.fixXml(builder.build(parsedGenPom)));
  }
}

_.extendWith(BundleGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default BundleGenerator;
