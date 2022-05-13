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
import { versions } from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import _ from 'lodash';
import chalk from 'chalk';

import Generator from 'yeoman-generator';

import ModuleMixins, { SharedOptions } from '../../lib/module-mixins.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const ModuleOptions = Object.freeze({
  '@adobe/aem:bundle'(parentProps) {
    return {
      generateInto: 'core',
      package: parentProps.groupId,
      name: `${parentProps.name} - Core Bundle`,
      artifactId: `${parentProps.artifactId}.core`,
    };
  },
  '@adobe/aem:frontend-general'(parentProps) {
    return {
      generateInto: 'ui.frontend',
      name: `${parentProps.name} - UI Frontend`,
      artifactId: `${parentProps.artifactId}.ui.frontend`,
    };
  },
  '@adobe/aem:package-structure'(parentProps) {
    return {
      generateInto: 'ui.apps.structure',
      name: `${parentProps.name} - Repository Structure Package`,
      artifactId: `${parentProps.artifactId}.ui.apps.structure`,
    };
  },
  '@adobe/aem:package-apps'(parentProps) {
    return {
      generateInto: 'ui.apps',
      name: `${parentProps.name} - UI Apps Package`,
      artifactId: `${parentProps.artifactId}.ui.apps`,
      bundleRef: `core`,
      frontendRef: `ui.frontend`,
    };
  },
  '@adobe/aem:package-config'(parentProps) {
    return {
      generateInto: 'ui.config',
      name: `${parentProps.name} - UI Config Package`,
      artifactId: `${parentProps.artifactId}.ui.config`,
    };
  },
  '@adobe/aem:package-all'(parentProps) {
    return {
      generateInto: 'all',
      name: `${parentProps.name} - All`,
      artifactId: `${parentProps.artifactId}.all`,
    };
  },
  '@adobe/aem:tests-it'(parentProps) {
    return {
      generateInto: 'it.tests',
      name: `${parentProps.name} - Integration Tests`,
      artifactId: `${parentProps.artifactId}.it.tests`,
    };
  },
});

const ModuleOrder = Object.freeze([
  '@adobe/aem:bundle',
  '@adobe/aem:frontend-general',
  '@adobe/aem:package-structure',
  '@adobe/aem:package-apps',
  '@adobe/aem:package-config',
  '@adobe/aem:package-all',
  '@adobe/aem:tests-it',
]);

const npmVersion = execFileSync('npm', ['--version'])
  .toString()
  .replaceAll(/\r\n|\n|\r/gm, '');

class AEMGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    _.defaults(this._options, {
      groupId: {
        type: String,
        desc: 'Base Maven Group ID (e.g. "com.mysite").',
      },

      version: {
        type: String,
        desc: 'Project version (e.g. 1.0.0-SNAPSHOT).',
      },

      javaVersion: {
        type: String,
        desc: 'Java version to use for project (8 or 11)',
      },

      aemVersion: {
        type: String,
        desc: 'Target AEM version (6.5 or cloud)',
      },

      nodeVersion: {
        type: String,
        desc: 'Node version to use for module projects.',
      },

      npmVersion: {
        type: String,
        desc: 'NPM version to use for module projects.',
      },

      modules: {
        type(arg) {
          return arg.split(',');
        },
        desc: 'List of modules to generate.',
      },
    });

    _.forOwn(this._options, (v, k) => {
      this.option(k, v);
    });
  }

  initializing() {
    // Order of precedence:
    // * CLI Options
    // * Yeoman Config
    // * Pom Values

    let dest = this.options.generateInto || path.relative(this.destinationRoot(), this.contextRoot);

    if (this.fs.exists(this.destinationPath(dest, '.yo-rc.json'))) {
      this.destinationRoot(this.destinationPath(dest));
      dest = '';
    }

    // Populate Root unique properties
    const unique = ['groupId', 'version', 'javaVersion', 'aemVersion', 'nodeVersion', 'npmVersion'];
    this.props = {};
    _.defaults(this.props, _.pick(this.options, unique));

    if (this.props.javaVersion && this.props.javaVersion.toString() !== '8' && this.props.javaVersion.toString() !== '11') {
      delete this.props.javaVersion;
    }

    if (this.props.aemVersion && this.props.aemVersion.toString() !== '6.5' && this.props.aemVersion.toString() !== 'cloud') {
      delete this.props.aemVersion;
    }

    _.defaults(this.props, _.pick(this.config.getAll(), unique));

    const pom = this._readPom(this.destinationPath(dest));
    _.defaults(this.props, _.omit(pom, ['pomProperties']));
    if (pom.pomProperties) {
      if (pom.pomProperties['aem.version']) {
        this.props.aemVersion = this.props.aemVersion || pom.pomProperties['aem.version'];
      }

      if (pom.pomProperties['java.version']) {
        this.props.javaVersion = this.props.javaVersion || `${pom.pomProperties['java.version']}`;
      }

      if (pom.pomProperties['node.version']) {
        this.props.nodeVersion = this.props.nodeVersion || `${pom.pomProperties['node.version']}`;
      }

      if (pom.pomProperties['npm.version']) {
        this.props.npmVersion = this.props.npmVersion || `${pom.pomProperties['npm.version']}`;
      }
    }

    // Populate Shared
    _.defaults(this.props, _.pick(this.options, SharedOptions));

    const config = this.config.getAll();
    _.defaults(this.props, _.pick(config, SharedOptions));

    const pomProps = this._readPom(this.destinationPath());
    _.defaults(this.props, _.pick(pomProps, SharedOptions));

    // Fall back to defaults
    if (this.options.defaults) {
      if (this.props.appId) {
        _.defaults(this.props, { artifactId: this.props.appId });
      }

      _.defaults(this.props, {
        examples: false,
        version: '1.0.0-SNAPSHOT',
        javaVersion: '11',
        aemVersion: 'cloud',
        nodeVersion: versions.node,
        npmVersion,
      });
    }
  }

  prompting() {
    const prompts = [
      {
        name: 'groupId',
        message: 'Base Maven Group ID (e.g. "com.mysite").',
        when: !this.props.groupId,
        /* c8 ignore start */
        validate(groupId) {
          return new Promise((resolve) => {
            if (!groupId || groupId.length === 0) {
              resolve('GroupId must be provided.');
            }

            resolve(true);
          });
          /* c8 ignore stop */
        },
      },
      {
        name: 'version',
        message: 'Project version (e.g. 1.0.0-SNAPSHOT).',
        when: !this.options.defaults && !this.props.version,
        default: this.props.version || '1.0.0-SNAPSHOT',
      },
      {
        name: 'aemVersion',
        message: 'AEM Release',
        type: 'list',
        choices: ['6.5', 'cloud'],
        default: 1,
        when: !this.options.defaults && !this.props.aemVersion,
      },
      {
        name: 'javaVersion',
        message: 'Java Version',
        type: 'list',
        choices: ['8', '11'],
        default: 1,
        when: (answers) => {
          return new Promise((resolve) => {
            if (this.options.defaults || this.props.javaVersion) {
              resolve(false);
            }

            if (this.props.aemVersion === 'cloud' || answers.aemVersion === 'cloud') {
              resolve(false);
            }

            resolve(true);
          });
        },
      },

      {
        name: 'nodeVersion',
        message: 'Node version to use for module projects.',
        when: !this.options.defaults && !this.props.nodeVersion,
        default: versions.node,
      },
      {
        name: 'npmVersion',
        message: 'NPM version to use for module projects.',
        when: !this.options.defaults && !this.props.npmVersion,
        default: npmVersion,
      },
    ];

    return this._prompting(prompts).then((answers = {}) => {
      if (this.props.aemVersion === 'cloud' || answers.aemVersion === 'cloud') {
        this.props.javaVersion = '11';
      }
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

      const pomData = this._readPom(dest);
      if (!_.isEmpty(pomData) && pomData.groupId !== this.props.groupId && pomData.artifactId !== this.props.artifactId) {
        throw new Error(
          chalk.red('Refusing to update existing project with different group/artifact identifiers.') +
            '\n\n' +
            'You are trying to run the AEM Generator in a project with different Maven coordinates than provided.\n' +
            'This is not a supported feature. Please manually update or use the defaults flag.'
        );
      }

      this.destinationRoot(dest);
    }

    // Props will overwrite any current values.
    _.merge(current, this.props);
    this.config.set(current);
  }

  default() {
    const modules = this.options.modules;
    const meta = this.env.getGeneratorsMeta();

    const compose = new Map();
    for (const idx in modules) {
      if (Object.prototype.hasOwnProperty.call(modules, idx)) {
        let name;
        if (meta[`@adobe/aem:${modules[idx]}`]) {
          name = `@adobe/aem:${modules[idx]}`;
        } else if (meta[modules[idx]]) {
          name = modules[idx];
        } else {
          throw new Error(
            /* eslint-disable prettier/prettier */
            chalk.red(`Module '${modules[idx]}' is not installed.`) +
            '\n\nInstall it with ' + chalk.yellow(`npm install -g 'generator-${modules[idx]}'`) + ' then rerun this generator.\n'
            /* eslint-enable prettier/prettier */
          );
        }

        const optionList = compose.get(name) || [];
        optionList.push({});
        compose.set(name, optionList);
      }
    }

    _.each(this.config.getAll(), (value, key) => {
      if (value.moduleType && this.env.rootGenerator().relativePath !== key) {
        let name;
        if (meta[`@adobe/aem:${value.moduleType}`]) {
          name = `@adobe/aem:${value.moduleType}`;
        } else if (meta[value.moduleType]) {
          name = value.moduleType;
        }

        const optionList = compose.get(name) || [];
        optionList.push({ generateInto: key });
        compose.set(name, optionList);
      }
    });

    _.each(ModuleOrder, (value, idx) => {
      const moduleName = ModuleOrder[idx];
      _.each(compose.get(moduleName) || [], (options) => {
        if (ModuleOptions[moduleName]) {
          _.defaults(options, ModuleOptions[moduleName](this.props));
        }

        _.defaults(options, { parent: this.props }, _.pick(this.props, _.keys(ModuleMixins._options)));
        this.composeWith(moduleName, options);
      });
    });

    this.composeWith(path.join(dirname, 'pom'), { showBuildOutput: this.options.showBuildOutput, ...this.props });
  }

  end() {
    this.log(chalk.greenBright('\n\nThanks for using the AEM Project Generator.\n\n'));
  }
}

_.extendWith(AEMGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { AEMGenerator };
export default AEMGenerator;
