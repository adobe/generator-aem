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

/**
 * Configures the this with the common options, as well as any passed.
 *
 * @param {this} this the this on which to configure the options
 * @param {Object} [coptions] custom options to add to the end of the common list
 */
export const options = {
  defaults: {
    desc: 'Use all defaults for user input.',
  },

  examples: {
    desc: 'Include demo/example code and content.',
  },

  generateInto: {
    type: String,
    required: false,
    desc: 'Relocate the location in which files are generated.',
  },

  appTitle: {
    type: String,
    desc: 'Application title, will be used for website title and components groups (e.g. "My Site").',
  },

  appId: {
    type: String,
    desc: 'Technical name used for component, config, content, and client library names (e.g. "mysite").',
  },

  groupId: {
    type: String,
    desc: 'Base Maven Group ID (e.g. "com.mysite").',
  },

  artifactId: {
    type: String,
    desc: 'Base Maven Artifact ID (e.g. "mysite").',
  },

  version: {
    type: String,
    desc: 'Project version (e.g. 1.0.0-SNAPSHOT).',
  },

  aemVersion: {
    type: String,
    desc: 'Target AEM version (e.g. 6.5 or cloud)',
  },
};

export default {
  options
}
