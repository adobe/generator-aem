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

export const MixinOptions = Object.freeze({
  cc(parentProps, modules) {
    const options = {};
    if (parentProps.defaults) {
      _.merge(options, {
        bundlePath: 'core',
        appsPath: 'ui.apps',
      });
    } else {
      if (modules.bundle && _.keys(modules.bundle).length === 1) {
        options.bundlePath = _.keys(modules.bundle)[0];
      }

      if (modules['package-apps'] && _.keys(modules['package-apps']).length === 1) {
        options.appsPath = _.keys(modules['package-apps'])[0];
      }

      if (modules['package-content'] && _.keys(modules['package-content']).length === 1) {
        options.contentPath = _.keys(modules['package-content'])[0];
      }
    }

    return options;
  },
});
