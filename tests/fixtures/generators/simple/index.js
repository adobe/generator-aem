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

import GeneratorCommons from '../../../../lib/common.js';

const generator = class extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    _.forIn(GeneratorCommons.options, (v, k) => {
      this.option(k, v);
    });
  }

  initializing() {
    const cb = (props) => {
      props.added = 'Added';
    };

    const subdir = this.options.generateInto || '';

    this.props = {};
    _.defaults(this.props, _.pick(this.options, ['parent']), GeneratorCommons.props(this, subdir, cb));
  }

  writing() {
    const dest = this.destinationPath('simple', 'props.json');
    if (this.props.generateInto) {
      this.destinationPath(this.props.generateInto, 'props.json');
    }

    this.fs.write(dest, JSON.stringify(this.props));
  }
};

export default generator;
