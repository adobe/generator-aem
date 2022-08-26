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

import Generator from 'yeoman-generator';

import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import ModuleMixins from '../../lib/module-mixins.js';
import { generatorName as bundleGeneratorName } from '../bundle/index.js';
import { generatorName as frontendGeneratorName } from '../frontend-general/index.js';
import { generatorName as structureGeneratorName } from '../package-structure/index.js';
import PomUtils from '../../lib/pom-utils.js';

export const generatorName = '@adobe/generator-aem:package-apps';

class AppsPackageGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    _.defaults(this.moduleOptions, {
      bundleRef: {
        type: String,
        desc: 'Artifact Id of optional Java bundle dependency, in this multi-module project.',
      },

      frontendRef: {
        type: String,
        desc: 'Artifact Id of optional Frontend dependency, in this multi-module project.',
      },

      structureRef: {
        type: String,
        desc: 'Artifact Id of Apps Structure Package dependency, in this multi-module project.',
      },

      precompileScripts: {
        desc: 'Whether or not to configure Maven build to precompile HTL scripts.',
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

    if (this.options.defaults) {
      this.props.precompileScripts =  true;
    }

    if (this.options.precompileScripts !== undefined) {
      this.props.precompileScripts = this.options.precompileScripts;
    }

    if (this.options.bundleRef) {
      this.props.bundle = this.options.bundleRef
    }
    if (this.options.frontendRef) {
      this.props.frontend = this.options.frontendRef;
    }
    if (this.options.structureRef) {
      this.props.structure = this.options.structureRef;
    }

    this.availableBundles = this._findModules(bundleGeneratorName);
    this.availableFrontends = this._findModules(frontendGeneratorName);
  }

  prompting() {
    const prompts = [
      {
        name: 'bundleRef',
        message: 'Module name of optional dependency on OSGi bundle. (e.g. core)',
        type: 'list',
        default: 'None',
        choices: () => {
          return new Promise((resolve) => {
            const list = _.map(this.availableBundles, 'artifactId');
            list.unshift('None');
            resolve(list);
          });
        },
        when: () => {
          return new Promise((resolve) => {
            resolve(this.props.bundle === undefined);
          });
        },
      },
      {
        name: 'frontendRef',
        message: 'Module name of optional dependency on a Front End Module containing ClientLibs. (e.g. ui.frontend)',
        type: 'list',
        default: 'None',
        choices: () => {
          return new Promise((resolve) => {
            const list = _.map(this.availableFrontends, 'artifactId');
            list.unshift('None');
            resolve(list);
          });
        },
        when: () => {
          return new Promise((resolve) => {
            resolve(this.props.frontend === undefined);
          });
        },
      },
      {
        name: 'precompileScripts',
        message: 'Whether nor not to precompile HTL scripts.',
        type: 'confirm',
        when: this.props.precompileScripts === undefined,
        default: true,
      },
    ];

    return this._prompting(prompts).then((answers) => {
      delete this.props.bundleRef;
      if (answers.bundleRef !== 'None') {
        this.props.bundle = answers.bundleRef;
      }

      delete this.props.frontendRef;
      if (answers.frontendRef !== 'None') {
        this.props.frontend = answers.frontendRef;
      }

      if (!answers.precompileScripts) {
        delete this.props.precompileScripts;
      }
    });
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

    if (this.props.precompileScripts) {
      files.push(...this._listTemplates('precompiled'))
    }

    const tplProps = {
      ..._.pick(this.props, ['name', 'artifactId', 'appId', 'precompileScripts']),
      parent: this.parentProps,
    };
    tplProps.bundle = this._lookupArtifact(this.props.bundle);
    tplProps.frontend = this._lookupArtifact(this.props.frontend);
    tplProps.structure = this._lookupArtifact(this.props.structure);

    this._writing(files, tplProps);
    this._writePom(tplProps);

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

  _lookupArtifact(artifactId) {
    const root = path.dirname(this.destinationRoot());
    const moduleList = PomUtils.listParentPomModules(this, root);
    let artifact;
    _.each(moduleList, (module) => {
      const pomFile = path.join(root, module, 'pom.xml');
      if (this.fs.exists(pomFile)) {
        const pom = new XMLParser().parse(this.fs.read(pomFile));
        if (pom.project.artifactId === artifactId) {
          artifact = { path: module, artifactId: pom.project.artifactId };
          return false;
        }
      }
    });
    return artifact;
  }

  _writePom(tplProps) {
    const parser = new XMLParser(PomUtils.xmlOptions);
    const builder = new XMLBuilder(PomUtils.xmlOptions);

    // Read the template and parse w/ properties.
    const genPom = ejs.render(this.fs.read(this.templatePath('pom.xml')), tplProps);
    const parsedGenPom = parser.parse(genPom);
    const genProject = PomUtils.findPomNodeArray(parsedGenPom, 'project');
    const genDependencies = PomUtils.findPomNodeArray(genProject, 'dependencies');

    const pomFile = this.destinationPath('pom.xml');

    if (this.fs.exists(pomFile)) {
      const existingPom = PomUtils.findPomNodeArray(parser.parse(this.fs.read(pomFile)), 'project');

      // Merge the different sections
      PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'build', 'plugins'), PomUtils.findPomNodeArray(existingPom, 'build', 'plugins'), PomUtils.pluginPredicate);
      PomUtils.mergePomSection(genDependencies, PomUtils.findPomNodeArray(existingPom, 'dependencies'), PomUtils.dependencyPredicate);
    }

    const addlDeps = parser.parse(this.fs.read(this.templatePath('partials', 'v6.5', 'dependencies.xml')))[0].dependencies;
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

_.extendWith(AppsPackageGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default AppsPackageGenerator;
