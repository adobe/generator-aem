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

import ModuleMixins from '../../../lib/module-mixins.js';
import UtilMixins from '../../../lib/util-mixins.js';

import { BundleModuleType } from '../../bundle/index.js';
import { GeneralFEModuleType } from '../../frontend/general/index.js';
import { StructurePackageModuleType } from '../structure/index.js';

const AppsPackageModuleType = 'package:apps';
const uniqueProperties = ['bundleRef', 'frontendRef'];

class AEMAppsPackageGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.moduleType = AppsPackageModuleType;

    _.defaults(this._options, {
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

    _.forOwn(this._options, (v, k) => {
      this.option(k, v);
    });
  }

  initializing() {
    this.props = {};
    _.defaults(this.props, _.pick(this.options, uniqueProperties));
    this._initializing();
  }

  prompting() {
    const properties = this.props;
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
    const prompts = [
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
    ];

    return this._prompting(prompts);
  }

  configuring() {
    this._configuring();
  }

  default() {
    if (_.isEmpty(this.options.parent)) {
      // Need to have parent update module list.
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith('@adobe/aem:app', options);
    }
  }

  writing() {
    const files = [];

    files.push(...this._listTemplates('shared'));

    if (this.props.examples) {
      files.push(...this._listTemplates('examples'));
    }

    return this._latestApi(this.props.parent.aemVersion).then((aemMetadata) => {
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

      this._writing(files);
    });
  }
}

_.extendWith(AEMAppsPackageGenerator.prototype, ModuleMixins, UtilMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { AEMAppsPackageGenerator, AppsPackageModuleType };

export default AEMAppsPackageGenerator;
