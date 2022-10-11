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

export const ModuleOptions = Object.freeze({
  bundle(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - Core Bundle`,
      artifactId: `${parentProps.appId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        package: parentProps.groupId,
        artifactId: `${parentProps.artifactId}.core`,
      });
    }

    return options;
  },
  'frontend-general'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - UI Frontend`,
      artifactId: `${parentProps.appId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.frontend`,
      });
    }

    return options;
  },
  'package-structure'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - Repository Structure Package`,
      artifactId: `${parentProps.appId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.apps.structure`,
      });
    }

    return options;
  },
  'package-apps'(moduleName, parentProps, modules) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - UI Apps Package`,
      artifactId: `${parentProps.appId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.apps`,
        bundleRef: `${parentProps.artifactId}.core`,
        frontendRef: `${parentProps.artifactId}.ui.frontend`,
        structureRef: `${parentProps.artifactId}.ui.apps.structure`,
      });
    } else {
      if (modules.bundle && _.keys(modules.bundle).length === 1) {
        options.bundleRef = modules.bundle[_.keys(modules.bundle)[0]].artifactId;
      }

      if (modules['frontend-general'] && _.keys(modules['frontend-general']).length === 1) {
        options.frontendRef = modules['frontend-general'][_.keys(modules['frontend-general'])[0]].artifactId;
      } // TODO: add other frontend lookups only add if there's one.

      if (modules['package-structure'] && _.keys(modules['package-structure']).length > 0) {
        options.structureRef = modules['package-structure'][_.keys(modules['package-structure'])[0]].artifactId;
      }
    }

    return options;
  },
  'package-config'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - UI Config Package`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.config`,
      });
    }

    return options;
  },
  'package-content'(moduleName, parentProps, modules) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - UI Content Package`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.content`,
        appsRef: `${parentProps.artifactId}.ui.apps`,
      });
    } else {
      if (modules.bundle && _.keys(modules.bundle).length === 1) {
        options.bundleRef = modules.bundle[_.keys(modules.bundle)[0]].artifactId;
      }

      if (modules['package-apps'] && _.keys(modules['package-apps']).length === 1) {
        options.appsRef = modules['package-apps'][_.keys(modules['package-apps'])[0]].artifactId;
      }
    }

    return options;
  },
  'package-all'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - All Package`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.all`,
      });
    }

    return options;
  },
  'tests-it'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - Integration Tests`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        package: parentProps.groupId,
        artifactId: `${parentProps.artifactId}.it.tests`,
      });
    }

    return options;
  },
  'tests-ui'(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - UI Tests`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.ui.tests`,
      });
    }

    return options;
  },
  dispatcher(moduleName, parentProps) {
    const options = {
      generateInto: moduleName,
      appId: parentProps.appId,
      name: `${parentProps.name} - Dispatcher`,
      artifactId: `${parentProps.artifactId}.${moduleName}`,
    };
    if (parentProps.defaults) {
      _.merge(options, {
        artifactId: `${parentProps.artifactId}.dispatcher`,
      });
    }

    return options;
  },
});
