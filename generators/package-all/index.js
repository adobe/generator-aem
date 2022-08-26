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
import ejs from 'ejs';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import Generator from 'yeoman-generator';
import ModuleMixins from '../../lib/module-mixins.js';
import MavenUtils from '../../lib/maven-utils.js';
import PomUtils, { filevaultPlugin } from '../../lib/pom-utils.js';

import { generatorName as bundleGeneratorName } from '../bundle/index.js';
import { generatorName as configGeneratorName } from '../package-config/index.js';
import { generatorName as appsGeneratorName } from '../package-apps/index.js';

export const generatorName = '@adobe/generator-aem:package-all';
const analyserCoordinates = {
  groupId: 'com.adobe.aem',
  artifactId: 'aemanalyser-maven-plugin',
};

class AllPackageGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);
    _.forOwn(this.moduleOptions, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function () {
      return generatorName;
    };
  }

  initializing() {
    this._initializing();
  }

  prompting() {
    return this._prompting();
  }

  configuring() {
    if (this.parentProps.aemVersion === 'cloud') {
      return MavenUtils.latestRelease(analyserCoordinates).then((metadata) => {
        this.props.analyserVersion = metadata.version;
        this._configuring();
      });
    }

    this._configuring();
  }

  default() {
    this._duplicateCheck();
  }

  writing() {
    this._writeFilter();
    this._writePom();
    if (this.env.rootGenerator() === this) {
      PomUtils.addModuleToParent(this);
    }
  }

  install() {
    // Make sure build is run with this new/updated module
    if (this.env.rootGenerator() === this) {
      return this._install({ cwd: path.dirname(this.destinationRoot()) });
    }
  }

  _writeFilter() {
    const filter = {
      src: this.templatePath('filter.xml'),
      dest: this.destinationPath('src', 'main', 'content', 'META-INF', 'vault', 'filter.xml'),
    };
    this._writing([filter], { appId: this.props.appId });
  }

  _writePom() {
    // Read the template and parse w/ properties.
    const tplProps = _.pick(this.props, ['name', 'artifactId', 'appId']);
    tplProps.parent = this.parentProps;
    if (this.parentProps.aemVersion === 'cloud') {
      tplProps.analyserVersion = this.props.analyserVersion;
    }

    tplProps.embeddeds = this._buildEmbeddeds();

    const genPom = ejs.render(this.fs.read(this.templatePath('pom.xml')), tplProps);

    const pomFile = this.destinationPath('pom.xml');
    if (this.fs.exists(pomFile)) {
      this._mergeWritePom(genPom, pomFile);
    } else {
      this.fs.write(pomFile, genPom);
    }
  }

  _buildEmbeddeds() {
    const embeddeds = [...this._findModules(bundleGeneratorName)];

    const apps = this._findModules(appsGeneratorName);
    _.each(apps, (module) => {
      embeddeds.push({ artifactId: module.artifactId, type: 'zip' });
      if (module.precompileScripts) {
        embeddeds.push({ artifactId: module.artifactId, classifier: 'precompiled-scripts' });
      }
    });
    _.each([configGeneratorName], (type) => {
      const modules = this._findModules(type);
      _.each(modules, (module) => {
        embeddeds.push({ artifactId: module.artifactId, type: 'zip' });
      });
    });
    return embeddeds;
  }

  _mergeWritePom(genPom, existingFile) {
    const parser = new XMLParser(PomUtils.xmlOptions);
    const builder = new XMLBuilder(PomUtils.xmlOptions);
    const parsedGenPom = parser.parse(genPom);
    const genProject = PomUtils.findPomNodeArray(parsedGenPom, 'project');
    const existingPom = PomUtils.findPomNodeArray(parser.parse(this.fs.read(existingFile)), 'project');

    // Merge the filevault's embeddeds
    const existingEmbeddeds = this._findPluginEmbeddeds(PomUtils.findPomNodeArray(existingPom, 'build', 'plugins'));
    const genEmbeddeds = this._findPluginEmbeddeds(PomUtils.findPomNodeArray(genProject, 'build', 'plugins'));
    PomUtils.mergePomSection(genEmbeddeds, existingEmbeddeds, embeddedPredicate);

    // Merge the dependencies
    PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'dependencies'), PomUtils.findPomNodeArray(existingPom, 'dependencies'), PomUtils.dependencyPredicate);
    PomUtils.mergePomSection(PomUtils.findPomNodeArray(genProject, 'profiles'), PomUtils.findPomNodeArray(existingPom, 'profiles'), PomUtils.profilePredicate);
    this.fs.write(existingFile, PomUtils.fixXml(builder.build(parsedGenPom)));
  }

  _findPluginEmbeddeds(pluginList) {
    const plugin = _.find(pluginList, (plugin) => {
      if (!plugin.plugin) {
        return false;
      }

      return (
        /* eslint-disable unicorn/prefer-array-some */
        _.find(plugin.plugin, (item) => {
          return item.artifactId && item.artifactId[0]['#text'] === filevaultPlugin;
        }) !== undefined
        /* eslint-enable unicorn/prefer-array-some */
      );
    }).plugin;

    return PomUtils.findPomNodeArray(plugin, 'configuration', 'embeddeds');
  }
}

const embeddedPredicate = (target, embedded) => {
  if (!embedded.embedded) {
    return false;
  }

  const groupId = PomUtils.findPomNodeArray(embedded.embedded, 'groupId')[0]['#text'];
  const artifactId = PomUtils.findPomNodeArray(embedded.embedded, 'artifactId')[0]['#text'];

  return _.find(target, (item) => {
    if (!item.embedded) {
      return false;
    }

    const findGroupId = PomUtils.findPomNodeArray(item.embedded, 'groupId');
    const findArtifactId = PomUtils.findPomNodeArray(item.embedded, 'artifactId');

    return groupId === findGroupId[0]['#text'] && artifactId === findArtifactId[0]['#text'];
  });
};

_.extendWith(AllPackageGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default AllPackageGenerator;
