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

import Generator from 'yeoman-generator';
import GeneratorCommons from '../../../lib/common.js';
import AEMModuleFunctions from '../../../lib/module.js';
import Utils from '../../../lib/utils.js';

import { BundleModuleType } from '../../bundle/index.js';
import { GeneralFEModuleType } from '../../frontend/general/index.js';
import { StructurePackageModuleType } from '../structure/index.js';

const AppsPackageModuleType = 'package:apps';
const uniqueProperties = ['bundleRef', 'frontendRef'];

/* eslint-disable prettier/prettier */
const tplFiles = [
  'pom.xml',
];
/* eslint-enable prettier/prettier */

class AEMAppsPackageGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.moduleType = AppsPackageModuleType;

    const options_ = {};
    _.defaults(options_, GeneratorCommons.options, {
      bundleRef: {
        type: String,
        desc: 'Module name of optional Java bundle dependency, in this multi-module project.',
      },

      frontendRef: {
        type: String,
        desc: 'Module name of optional Frontend dependency, in this multi-module project.',
      },

      precompileScripts: {
        desc: 'Whether or not to configure Maven build to precompile HTL scripts.',
      },
    });

    _.forOwn(options_, (v, k) => {
      this.option(k, v);
    });
  }

  _preProcessProperties() {
    _.defaults(this.props, _.pick(this.options, uniqueProperties));
  }

  prompting() {
    const config = this.config.getAll();
    const bundleModules = [];
    const feModules = [];
    _.forOwn(config, (value, key) => {
      if (value.moduleType) {
        switch (value.moduleType) {
          case BundleModuleType: {
            bundleModules.push(key);
            break;
          }

          case GeneralFEModuleType: {
            feModules.push(key);
            break;
          }
          // No default
        }
      }
    });
    const properties = this.props;

    const prompts = GeneratorCommons.prompts(this).concat([
      {
        name: 'bundleRef',
        message: 'Module name of optional dependency on OSGi bundle. (e.g. core)',
        type: 'list',
        choices: bundleModules,
        when: !this.options.defaults && bundleModules.length > 0,
      },
      {
        name: 'frontendRef',
        message: 'Module name of optional dependency on a Front End Module containing ClientLibs. (e.g. ui.frontend)',
        type: 'list',
        choices: feModules,
        when: !this.options.defaults && feModules.length > 0,
      },
      {
        name: 'precompileScripts',
        message: 'Whether nor not to precompile HTL scripts.',
        type: 'confirm',
        when: properties.precompileScripts === undefined,
        default: true,
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

      const config = this.config.getAll();
      _.each(config, (value, key) => {
        if (key === this.props.bundleRef) {
          this.props.bundle = { ref: key, artifactId: value.artifactId };
        } else if (key === this.props.frontendRef) {
          this.props.frontend = { ref: key, artifactId: value.artifactId };
        } else if (value.moduleType && value.moduleType === StructurePackageModuleType) {
          this.props.structure = { ref: key, artifactId: value.artifactId };
        }
      });

      GeneratorCommons.write(this, files);
    });
  }
}

_.extend(AEMAppsPackageGenerator.prototype, AEMModuleFunctions);

export { AEMAppsPackageGenerator, AppsPackageModuleType };
export default AEMAppsPackageGenerator;
