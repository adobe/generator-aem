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

import ModuleMixins from '../../lib/module-mixins.js';
import { generatorName as bundleGeneratorName } from '../bundle/index.js';
import { generatorName as frontendGeneratorName } from '../frontend-general/index.js';
import { generatorName as structureGeneratorName } from '../package-structure/index.js';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import PomUtils from '../../lib/pom-utils.js';
import ejs from 'ejs';
import fs from 'node:fs';

const generatorName = '@adobe/generator-aem:package-apps';


class AppsPackageGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    _.defaults(this.moduleOptions, {
      bundleRef: {
        type: String,
        desc: 'Module name of optional Java bundle dependency, in this multi-module project.',
      },

      frontendRef: {
        type: String,
        desc: 'Module name of optional Frontend dependency, in this multi-module project.',
      },

      structureRef: {
        type: String,
        desc: 'Module name of optional Apps Structure Package dependency, in this multi-module project.',
      },

      precompileScripts: {
        desc: 'Whether or not to configure Maven build to precompile HTL scripts.',
      },
    });

    _.forOwn(this.moduleOptions, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function() {
      return generatorName;
    };
  }

  initializing() {
    this._initializing();
    this.precompileScripts = this.options.precompileScripts;

    _.defaults(this.props, _.pick(this.options, ['bundleRef', 'frontendRef', 'structureRef', 'precompileScripts']));

    if (this.options.defaults) {
      this.props.bundle = {
        ref: 'core',
        artifactId: `${this.props.appId}.core`,
      };
      this.props.frontend = {
        ref: 'ui.frontend',
        artifactId: `${this.props.appId}.ui.frontend`,
      };
      this.props.structure = {
        ref: 'ui.apps.structure',
        artifactId: `${this.props.appId}.ui.apps.structure`,
      };
      this.precompileScripts = true;
    }

    this.availableBundles = this._findModules(bundleGeneratorName);
    this.availableFrontends = this._findModules(frontendGeneratorName);
    this.availableStructures = this._findModules(structureGeneratorName);

    if (this.props.bundleRef) {
      this.props.bundle = _.find(this.availableBundles, ['artifactId', this.props.bundleRef]);
      if (this.props.bundle === undefined) {
        // Look up module based on pom
        this.props.bundle = this._lookupArtifact(this.props.bundleRef);
      }
      delete this.props.bundleRef;
    }
    if (this.props.frontendRef) {
      this.props.frontend = _.find(this.availableFrontends, ['artifactId', this.props.frontendRef]);
      if (this.props.frontend === undefined) {
        // Look up module based on pom
        this.props.frontend = this._lookupArtifact(this.props.frontendRef);
      }
      delete this.props.frontendRef;
    }
    if (this.props.structureRef) {
      this.props.structure = _.find(this.availableStructures, ['artifactId', this.props.structureRef]);
      if (this.props.structure === undefined) {
        // Look up module based on pom
        this.props.structure = this._lookupArtifact(this.props.structureRef);
      }
      delete this.props.structureRef;
    } else if (this.availableStructures.length > 0) {
     this.props.structure = this.availableStructures[0];
    }
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
            if (this.options.defaults && this.props.bundle !== undefined) {
              resolve(false);
            }
            resolve(true);
          });
        }
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
            if (this.options.defaults && this.props.frontend !== undefined) {
              resolve(false);
            }
            resolve(true);
          });
        }
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
        this.props.bundle = _.find(this.availableBundles, ['artifactId', answers.bundleRef]);
      }

      delete this.props.frontendRef;
      if (answers.frontendRef !== 'None') {
        this.props.frontend = _.find(this.availableFrontends, ['artifactId', answers.frontendRef]);
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

    const tplProps = {
      ..._.pick(this.props, ['name', 'artifactId', 'appId', 'bundle', 'frontend', 'structure']),
      parent: this.parentProps,
    };
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

  _findModules = (type) => {
    const modules = [];
    const root = path.dirname(this.destinationRoot());

    const moduleList = this._listParentPomModules();
    _.each(moduleList, (module) => {
      const yorcFile = path.join(root, module, '.yo-rc.json');
      if (this.fs.exists(yorcFile)) {
        const yorc = this.fs.readJSON(path.join(yorcFile));
        if (yorc[type] !== undefined) {
          modules.push({ ref: module, artifactId: yorc[type].artifactId });
        }
      }
    });
    return modules;
  };

  _lookupArtifact(name) {
    const root = path.dirname(this.destinationRoot());
    const moduleList = this._listParentPomModules();
    let artifact = undefined;
    _.each(moduleList, (module) => {
      const pom = new XMLParser().parse(this.fs.read(path.join(root, module, 'pom.xml')));
      if (pom.project.artifactId === name) {
        artifact = { ref: module, artifactId: pom.project.artifactId };
        return false;
      }
    });
    return artifact;
  }

  _listParentPomModules() {
    const root = path.dirname(this.destinationRoot());
    if (!this.fs.exists(path.join(root, 'pom.xml'))) {
      return [];
    }
    const pom = new XMLParser().parse(this.fs.read(path.join(root, 'pom.xml')));
    if (!pom.project.modules || !pom.project.modules.module) {
      return [];
    }
    return Array.isArray(pom.project.modules.module) ? pom.project.modules.module : [pom.project.modules.module];
  }

  _writePom(tplProps) {

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
      PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'build', 'plugins'), PomUtils.findPomNodeArray(existingPom, 'build', 'plugins'), PomUtils.pluginPredicate);
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

_.extendWith(AppsPackageGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default AppsPackageGenerator;
