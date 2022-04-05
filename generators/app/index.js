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
import _ from 'lodash';
import chalk from 'chalk';

import got from 'got';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import Generator from 'yeoman-generator';
import GeneratorCommons from '../../lib/common.js';

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

      javaVersion: {
        type: String,
        desc: 'Java version to use for project (8 or 11)',
      },

      aemVersion: {
        type: String,
        desc: 'Target AEM version (6.5 or cloud)',
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

    const unique = ['groupId', 'version', 'javaVersion', 'aemVersion'];

    // Populate Root unique properties
    this.props = {};
    _.defaults(this.props, _.pick(this.options, unique));

    if (this.props.javaVersion && (this.props.javaVersion.toString() !== '8' || this.props.javaVersion.toString() !== '11')) {
      delete this.props.javaVersion;
    }

    if (this.props.aemVersion && (this.props.aemVersion.toString() !== '6.5' || this.props.aemVersion.toString() !== 'cloud')) {
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
    }

    // Populate Shared
    _.defaults(this.props, GeneratorCommons.props(this));

    // Fall back to defaults
    if (this.options.defaults) {
      _.defaults(this.props, { version: '1.0.0-SNAPSHOT', javaVersion: '11', aemVersion: 'cloud' });
    }
  }

  prompting() {
    const prompts = GeneratorCommons.prompts(this).concat([
      {
        name: 'groupId',
        message: 'Base Maven Group ID (e.g. "com.mysite").',
        when: !this.props.groupId,
        validate(groupId) {
          return new Promise((resolve) => {
            if (!groupId || groupId.length === 0) {
              resolve('GroupId must be provided.');
            }

            resolve(true);
          });
        },
      },
      {
        name: 'version',
        message: 'Project version (e.g. 1.0.0-SNAPSHOT).',
        when: !this.options.defaults,
        default: this.props.version || '1.0.0-SNAPSHOT',
      },
      {
        name: 'javaVersion',
        message: 'Java Version',
        type: 'list',
        choices: ['8', '11'],
        default: 1,
        when: !this.options.defaults || !this.props.javaVersion,
      },
      {
        name: 'aemVersion',
        type: 'list',
        choices: ['6.5', 'cloud'],
        default: 1,
        when: !this.options.defaults || !this.options.aemVersion,
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
    for (const idx in modules) {
      if (Object.prototype.hasOwnProperty.call(modules, idx)) {
        this.composeWith(modules[idx], moduleOptions);
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

    return this._latestApi().then((apiVersion) => {
      this.props.aem = this._coordinates();
      this.props.aem.version = apiVersion;
      if (this.aemVersion !== 'cloud') {
        const depPom = this.fs.read(this.templatePath('partials', 'v6.5', 'dependency-management', 'pom.xml'));

        const parser = new XMLParser({
          ignoreAttributes: true,
          ignoreDeclaration: true,
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
    return this.spawnCommand('mvn', ['clean', 'verify'])
      .then(() => {
        this.log('Successfully verified the Maven project.');
      })
      .catch((error) => {
        this.log(chalk.red('Maven build failed with error: \n\n\t' + error.message + '\n\nPlease retry the build manually to determine the issue.'));
      });
  }

  end() {
    this.log('Thanks for using the AEM Project Generator.');
  }

  _coordinates() {
    if (this.props.aemVersion === 'cloud') {
      return {
        groupId: 'com.adobe.aem',
        artifactId: 'aem-sdk-api',
        path: 'com/adobe/aem/aem-sdk-api',
      };
    }

    return {
      groupId: 'com.adobe.aem',
      artifactId: 'uber-jar',
      path: 'com/adobe/aem/uber-jar',
    };
  }

  /*
   *
   * Returns a promise that resolves to the current version of the SDK.
   */
  _latestApi() {
    return new Promise((resolve, reject) => {
      try {
        got.get(`https://repo1.maven.org/maven2/${this._coordinates().path}/maven-metadata.xml`, { responseType: 'text', resolveBodyOnly: true }).then((body) => {
          try {
            const parser = new XMLParser({
              ignoreAttributes: true,
              ignoreDeclaration: true,
            });
            const data = parser.parse(body);
            resolve(data.metadata.versioning.latest);
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error.response ? error.response.body : error);
      }
    });
  }
}

export default AEMGenerator;
