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
import PomUtils, { filevaultPlugin } from '../../lib/pom-utils.js';
import { generatorName as parentGeneratorName } from '../app/index.js';

export const generatorName = '@adobe/generator-aem:package-structure';

class StructurePackageGenerator extends Generator {
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
    this._configuring();
  }

  default() {
    this._duplicateCheck();
  }

  writing() {
    this.fs.copy(this.templatePath('README.md'), this.destinationPath('README.md'));
    this.fs.copy(this.templatePath('.yo-resolve'), this.destinationPath('.yo-resolve'));

    this._writePom();
    if (this.env.rootGenerator() === this) {
      PomUtils.addModuleToParent(this);
    }
  }

  install() {
    // Make sure build is run with this new/updated module
    if (this.env.rootGenerator() === this) {
      return this._install({ cwd: path.dirname(this.destinationPath()) });
    }
  }

  _writePom() {
    // Collect all the AppIds - Should this check only for Apps/Content/Config types?
    const root = path.dirname(this.destinationPath());
    const modules = PomUtils.listParentPomModules(this, root);
    const appIds = new Set([this.props.appId]);
    _.each(modules, (module) => {
      const yorcFile = path.join(root, module, '.yo-rc.json');
      if (this.fs.exists(yorcFile)) {
        const yorc = this.fs.readJSON(path.join(yorcFile));
        _.forOwn(yorc, (value, key) => {
          if (key.startsWith(parentGeneratorName) && value.appId) {
            appIds.add(value.appId);
          }
        });
      }
    });

    const tplProps = _.pick(this.props, ['name', 'artifactId']);
    tplProps.appIds = [...appIds];
    tplProps.parent = this.parentProps;

    // Read the template and parse w/ properties.
    const genPom = ejs.render(this.fs.read(this.templatePath('pom.xml')), tplProps);

    const pomFile = this.destinationPath('pom.xml');
    if (this.fs.exists(pomFile)) {
      this._mergeWritePom(genPom, pomFile);
    } else {
      this.fs.write(pomFile, genPom);
    }
  }

  _mergeWritePom(genPom, existingFile) {
    const parser = new XMLParser(PomUtils.xmlOptions);
    const builder = new XMLBuilder(PomUtils.xmlOptions);
    const parsedGenPom = parser.parse(genPom);
    const existingPlugin = PomUtils.findPomNodeArray(parser.parse(this.fs.read(existingFile)), 'project', 'build', 'plugins');

    // Find and merge the filevault package filters
    const existingFilters = this._findPluginFilters(existingPlugin);
    const genFilters = this._findPluginFilters(PomUtils.findPomNodeArray(parsedGenPom, 'project', 'build', 'plugins'));

    genFilters.push({ '#comment': [{ '#text': ' Filter roots from existing pom. ' }] });
    PomUtils.mergePomSection(genFilters, existingFilters, (target, filter) => {
      /* eslint-disable unicorn/prefer-array-some */
      return _.find(target, (targetFilter) => _.isEqual(filter, targetFilter)) !== undefined;
      /* eslint-enable unicorn/prefer-array-some */
    });
    this.fs.write(existingFile, this._flattenFilters(PomUtils.fixXml(builder.build(parsedGenPom))));
  }

  _findPluginFilters(pluginList) {
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

    return PomUtils.findPomNodeArray(plugin, 'configuration', 'filters');
  }

  _flattenFilters(xml) {
    // Make the filter entries be one line w/ the root as well.
    return xml.replace(/(<filter>)\s*\n\s*(\S+)\s*\n\s*(<\/filter>)/g, '$1$2$3');
  }
}

_.extendWith(StructurePackageGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default StructurePackageGenerator;
