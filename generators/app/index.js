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
import { createRequire } from 'node:module';
import _ from 'lodash';

import Generator from 'yeoman-generator';
import GeneratorCommons from '../../lib/common.js';

const require = createRequire(import.meta.url);

class AEMGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    const options_ = {};
    _.defaults(options_, GeneratorCommons.options, {
      groupId: {
        type: String,
        desc: 'Base Maven Group ID (e.g. "com.mysite").',
      },

      version: {
        type: String,
        desc: 'Project version (e.g. 1.0.0-SNAPSHOT).',
      },

      aemVersion: {
        type: String,
        desc: 'Target AEM version (e.g. 6.5 or cloud)',
      },

      modules: {
        type(arg) {
          return arg.split(',');
        },
        desc: 'List of modules to generate.',
      },
    });

    _.forIn(options_, (v, k) => {
      this.option(k, v);
    });
  }

  initializing() {
    // Order of precedence:
    // * CLI Options
    // * Yeoman Config
    // * Pom Values

    const dest = this.options.generateInto || path.relative(this.destinationRoot(), this.contextRoot);
    delete this.options.generateInto;

    const unique = ['groupId', 'version', 'aemVersion'];

    // Populate Root unique properties
    this.props = {};
    _.defaults(this.props, _.pick(this.options, unique));
    _.defaults(this.props, _.pick(this.config.getAll(), unique));
    const pom = GeneratorCommons.readPom(path.join(this.destinationRoot(), dest));

    _.defaults(this.props, _.omit(pom, ['pomProperties']));
    if (pom.pomProperties && pom.pomProperties['aem.version']) {
      this.props.aemVersion = this.props.aemVersion || pom.pomProperties['aem.version'];
    }

    // Populate Shared
    _.defaults(this.props, GeneratorCommons.props(this));

    // Fall back to defaults
    if (this.options.defaults) {
      _.defaults(this.props, { version: '1.0.0-SNAPSHOT', aemVersion: 'cloud' });
    }
  }

  prompting() {
    const prompts = GeneratorCommons.prompts(this).concat([
      {
        name: 'version',
        message: 'Project version (e.g. 1.0.0-SNAPSHOT).',
        when: !this.options.defaults,
        default: this.props.version,
      },
      {
        name: 'aemVersion',
        when: !this.options.defaults,
        default: this.props.aemVersion,
      },
    ]);

    return this.prompt(prompts).then((answers) => {
      GeneratorCommons.processAnswers(this, answers);
      _.defaults(this.props, answers);
    });
  }

  configuring() {
    const current = this.config.getAll();

    // No config - check if folder contains pom with same properties.
    if (_.isEmpty(current)) {
      let dest;
      if (this.options.generateInto) {
        dest = this.destinationPath(this.options.generateInto);
      } else if (path.basename(this.contextRoot) === this.props.appId) {
        dest = this.contextRoot;
      } else {
        dest = this.destinationPath(this.props.appId);
      }

      const pomData = GeneratorCommons.readPom(dest);
      if (!_.isEmpty(pomData) && pomData.groupId !== this.props.groupId && pomData.artifactId !== this.props.artifactId) {
        throw new Error('Refusing to update existing project with different group/artifact identifiers.');
      }

      this.destinationRoot(dest);
    }

    // Props will overwrite any current values.
    _.merge(current, this.props);
    this.config.set(current);
  }

  default() {
    const moduleOptions = {};
    _.defaults(moduleOptions, _.pick(this.props, _.keys(GeneratorCommons.options)));

    moduleOptions.parent = this.props;

    const modules = this.options.modules;
    for (const m in modules) {
      if (Object.prototype.hasOwnProperty.call(modules, m)) {
        this.composeWith(require.resolve(modules[m]), moduleOptions);
      }
    }
  }

  writing() {}

  conflicts() {}

  install() {}

  end() {
    this.log('Thanks for using the AEM Project Generator.');
  }
}

export default AEMGenerator;
