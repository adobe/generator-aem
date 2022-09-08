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

import Generator from 'yeoman-generator';
import _ from 'lodash';
import ModuleMixins from '../../../lib/module-mixins.js';
import { generatorName as contentGeneratorName } from '../../package-content/index.js';

const generatorName = '@adobe/generator-aem:mixin-cc:content';

class ContentPackageModuleCoreComponentMixin extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    const options_ = {
      generateInto: {
        type: String,
        required: true,
        desc: 'Relocate the location in which files are generated.',
      },
      dataLayer: {
        desc: 'Flag to indicate if the Data Layer configuration should be enabled',
      },
    };
    _.forOwn(options_, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function () {
      return generatorName;
    };
  }

  initializing() {
    if (this.options.generateInto) {
      this.destinationRoot(this.destinationPath(this.options.generateInto));
    }

    this.props = {};
    _.defaults(this.props, _.pick(this.options, ['dataLayer']));
  }

  writing() {
    if (this.props.dataLayer) {
      const appId = this.fs.readJSON(this.destinationPath('.yo-rc.json'))[contentGeneratorName].appId;
      const files = this._listTemplates();
      this._writing(files, { appId });
    }
  }
}

ContentPackageModuleCoreComponentMixin.prototype._listTemplates = ModuleMixins._listTemplates;
ContentPackageModuleCoreComponentMixin.prototype._writing = ModuleMixins._writing;

export default ContentPackageModuleCoreComponentMixin;
