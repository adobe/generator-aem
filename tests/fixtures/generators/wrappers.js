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

export function init(clazz, resolved) {
  return class extends clazz {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    initializing() {
      this.props = this.props || this.options.props || {};
      this.parentProps = this.options.parentProps || {};
      return super.initializing();
    }

    _initializing() {}
  };
}

export function prompt(clazz, resolved) {
  return class extends clazz {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
      this.props = options.props || {};
    }

    prompting() {
      return super.prompting();
    }

    _prompting(prompts) {
      this.prompts = prompts;
      return this.prompt(prompts).then((answers) => {
        _.merge(this.props, answers);
        return answers;
      });
    }
  };
}

export function config(clazz, resolved) {
  return class extends clazz {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
      this.props = options.props || {};
      this.parentProps = options.parentProps || {};
    }

    configuring() {
      return super.configuring();
    }
  };
}

export function Default(clazz, resolved) {
  return class extends clazz {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
      this.props = options.props;
      this.parentProps = options.parent;
    }

    default() {
      return super.default();
    }
  };
}

export function writeInstall(clazz, resolved) {
  return class extends clazz {
    constructor(args, options, features) {
      options.resolved = resolved;
      features = features || {};
      features.customInstallTask = true;
      super(args, options, features);
      this.props = options.props;
      this.modules = options.modules;
      this.parentProps = options.parentProps;
      this.runInstall = true;
    }

    writing() {
      return super.writing();
    }

    install() {
      if (super.install) {
        return super.install();
      }
    }
  };
}

const wrappers = {
  Init: init,
  Prompt: prompt,
  Config: config,
  Default,
  WriteInstall: writeInstall,
};

export default wrappers;
