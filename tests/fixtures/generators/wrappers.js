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

export function Init(clazz, resolved) {
  return class extends clazz {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
    }

    initializing() {
      super.initializing();
    }
  };
}

export function Config(clazz, resolved) {
  return class extends clazz {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
      this.props = options.props;
    }

    configuring() {
      super.configuring();
    }
  };
}

export function Default(clazz, resolved) {
  return class AEMAppDefault extends clazz {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
      this.props = options.props;
      this.modules = options.moduleStruct;
    }

    configuring() {
      this.config.set(this.props);
    }

    default() {
      super.default();
    }
  };
}

export function WriteInstall(clazz, resolved) {
  return class extends clazz {
    constructor(args, options, features) {
      options.resolved = resolved;
      super(args, options, features);
      this.props = options.props;
      this.modules = options.modules;
    }

    writing() {
      super.writing();
    }

    install() {
      super.install();
    }
  };
}

const wrappers = {
  Init,
  Config,
  Default,
  WriteInstall,
};

export default wrappers;
