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

import _ from 'lodash';
import chalk from 'chalk';

import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import Generator from 'yeoman-generator';
import Utils from '../../lib/utils.js';
import GeneratorCommons from '../../lib/common.js';

const ParentProperties = ['groupId', 'artifactId', 'version', 'aemVersion'];

const ModuleOptions = Object.freeze({
  '@adobe/aem:bundle'(parentProps) {
    return {
      generateInto: 'core',
      package: parentProps.groupId,
      name: `${parentProps.name} - Core Bundle`,
      artifactId: `${parentProps.artifactId}.core`,
    };
  },
  '@adobe/aem:ui:apps'(parentProps) {
    return {
      generateInto: 'ui.apps',
      name: `${parentProps.name} - UI Apps Package`,
      artifactId: `${parentProps.artifactId}.ui.apps`,
    };
  },
  '@adobe/aem:ui:frontend'(parentProps) {
    return {
      generateInto: 'ui.frontend',
      name: `${parentProps.name} - UI Frontend`,
      artifactId: `${parentProps.artifactId}.ui.frontend`,
    };
  },
});

const npmVersion = execFileSync('npm', ['--version'])
  .toString()
  .replaceAll(/\r\n|\n|\r/gm, '');

class AEMGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;

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

    _.forIn(options_, (v, k) => {
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

    const unique = ['groupId', 'version', 'javaVersion', 'aemVersion', 'nodeVersion', 'npmVersion'];

    // Populate Root unique properties
    this.props = {};
    _.defaults(this.props, _.pick(this.options, unique));

    if (this.props.javaVersion && this.props.javaVersion.toString() !== '8' && this.props.javaVersion.toString() !== '11') {
      delete this.props.javaVersion;
    }

    if (this.props.aemVersion && this.props.aemVersion.toString() !== '6.5' && this.props.aemVersion.toString() !== 'cloud') {
      delete this.props.aemVersion;
    }

    _.defaults(this.props, _.pick(this.config.getAll(), unique));

    const pom = GeneratorCommons.readPom(this.destinationPath(dest));
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
    _.defaults(this.props, GeneratorCommons.props(this));

    // Fall back to defaults
    if (this.options.defaults) {
      _.defaults(this.props, {
        version: '1.0.0-SNAPSHOT',
        javaVersion: '11',
        aemVersion: 'cloud',
        nodeVersion: versions.node,
        npmVersion,
      });
    }
  }

  prompting() {
    const prompts = GeneratorCommons.prompts(this).concat([
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
        name: 'javaVersion',
        message: 'Java Version',
        type: 'list',
        choices: ['8', '11'],
        default: 1,
        when: !this.options.defaults && !this.props.javaVersion,
      },
      {
        name: 'aemVersion',
        type: 'list',
        choices: ['6.5', 'cloud'],
        default: 1,
        when: !this.options.defaults && !this.props.aemVersion,
      },
      {
        name: 'nodeVersion',
        message: 'Node version to use for module projects.',
        when: !this.options.defaults && !this.props.nodeVersion,
        default: this.props.nodeVersion,
      },
      {
        name: 'npmVersion',
        message: 'NPM version to use for module projects.',
        when: !this.options.defaults && !this.props.npmVersion,
        default: this.props.npmVersion,
      },
    ]);

    return this.prompt(prompts).then((answers) => {
      GeneratorCommons.processAnswers(this, answers);
      _.merge(this.props, answers);
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
    for (const idx in modules) {
      if (Object.prototype.hasOwnProperty.call(modules, idx)) {
        const moduleOptions = {};
        moduleOptions.parent = this.props;

        let name;
        if (meta[`@adobe/aem:${modules[idx]}`]) {
          name = `@adobe/aem:${modules[idx]}`;
          _.defaults(moduleOptions, ModuleOptions[name](this.props), _.pick(this.props, _.keys(GeneratorCommons.options)));
        } else if (meta[`aem:${modules[idx]}`]) {
          name = `aem:${modules[idx]}`;
          _.defaults(moduleOptions, ModuleOptions[`@adobe/${name}`](this.props), _.pick(this.props, _.keys(GeneratorCommons.options)));
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

        this.composeWith(name, moduleOptions);
      }
    }
  }

  writing() {
    const files = [];
    files.push(
      {
        src: this.templatePath('README.md'),
        dest: this.destinationPath('README.md'),
      },
      {
        src: this.templatePath('.gitignore'),
        dest: this.destinationPath('.gitignore'),
      },
      {
        src: this.templatePath('pom.xml'),
        dest: this.destinationPath('pom.xml'),
      }
    );

    const config = this.config.getAll();
    this.props.modules = [];
    _.forIn(config, (value, key) => {
      if (value && value.moduleType) {
        this.props.modules.push(key);
      }
    });

    return Utils.latestApi(this.props.aemVersion).then((aemMetadata) => {
      this.props.aem = aemMetadata;
      if (this.props.aemVersion !== 'cloud') {
        const depPom = this.fs.read(this.templatePath('partials', 'v6.5', 'dependency-management', 'pom.xml'));

        const parser = new XMLParser({
          ignoreAttributes: true,
          ignoreDeclaration: true,
          numberParseOptions: {
            skipLike: /\d+.\d+/,
          },
        });
        const dependencies = parser.parse(depPom).project.dependencies;
        const builder = new XMLBuilder({ format: true });
        this.props.dependencies = builder.build(dependencies);
      }

      GeneratorCommons.write(this, files);
    });
  }

  conflicts() {}

  install() {
    const options = this.options.showBuildOutput ? {} : { stdio: 'ignore' };
    return this.spawnCommand('mvn', ['clean', 'verify'], options).catch((error) => {
      throw new Error(chalk.red('Maven build failed with error: \n\n\t' + error.message + '\n\nPlease retry the build manually to determine the issue.'));
    });
  }

  end() {
    this.log(chalk.greenBright('\n\nThanks for using the AEM Project Generator.\n\n'));
  }
}

export default AEMGenerator;
export { ParentProperties, AEMGenerator };
