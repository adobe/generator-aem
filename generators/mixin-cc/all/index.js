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
import { XMLBuilder } from 'fast-xml-parser';

import Generator from 'yeoman-generator';

import PomUtils, { filevaultPlugin } from '../../../lib/pom-utils.js';
import { bundleGav, configGav, contentGav, exampleAppsGav, exampleConfigGav, exampleContentGav } from '../index.js';

import { apiCoordinates } from '../../app/index.js';
import { embeddedPredicate, generatorName as allGeneratorName } from '../../package-all/index.js';

const generatorName = '@adobe/generator-aem:mixin-cc:all';

class AllPackageModuleCoreComponentMixin extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    const options_ = {
      generateInto: {
        type: String,
        required: true,
        desc: 'Relocate the location in which files are generated.',
      },
      examples: {
        desc: 'Include demo/example code and content.',
      },
      aemVersion: {
        type: String,
        required: true,
        desc: 'Version of AEM used by this project, (6.5 or cloud).',
      },
    };

    _.forOwn(options_, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function () {
      return generatorName;
    };
  }

  initializing() {
    if (this.options.generateInto) {
      this.destinationRoot(this.destinationPath(this.options.generateInto));
    }

    this.props = {};
    _.defaults(this.props, _.pick(this.options, ['examples', 'aemVersion']));
  }

  writing() {
    return new Promise((resolve) => {
      const appId = this.fs.readJSON(this.destinationPath('.yo-rc.json'))[allGeneratorName].appId;

      const pomData = PomUtils.readPom(this);
      const project = PomUtils.findPomNodeArray(pomData, 'project');
      const deps = PomUtils.findPomNodeArray(project, 'dependencies');

      const bundle = { dependency: _.cloneDeep(bundleGav) };
      const content = { dependency: _.cloneDeep(contentGav) };
      const config = { dependency: _.cloneDeep(configGav) };
      const exampleConfig = { dependency: _.cloneDeep(exampleConfigGav) };
      const exampleApps = { dependency: _.cloneDeep(exampleAppsGav) };
      const exampleContent = { dependency: _.cloneDeep(exampleContentGav) };

      // Delete then re-add - always easier;
      PomUtils.removeDependencies(deps, [bundle, content, config, exampleConfig, exampleApps, exampleContent]);

      // Filevault Plugin Logic
      const plugins = PomUtils.findPomNodeArray(project, 'build', 'plugins');
      const fvPlugin = _.find(plugins, (plugin) => {
        if (!plugin.plugin) {
          return false;
        }

        return _.find(plugin.plugin, (def) => {
          return def.artifactId && def.artifactId[0]['#text'] === filevaultPlugin;
        });
      }).plugin;
      const fvPluginEmbeddeds = PomUtils.findPomNodeArray(fvPlugin, 'configuration', 'embeddeds');

      const makeEmbed = (dependency) => {
        return {
          embedded: [..._.cloneDeep(dependency.dependency), { target: [{ '#text': `/apps/${appId}-vendor-packages/application/install` }] }],
        };
      };

      const embeddeds = [makeEmbed(bundle), makeEmbed(content), makeEmbed(content), makeEmbed(exampleConfig), makeEmbed(exampleApps), makeEmbed(exampleContent)];
      _.remove(fvPluginEmbeddeds, (item) => {
        return embeddedPredicate(embeddeds, item);
      });

      const depsToAdd = [];
      const embedsToAdd = [];

      if (this.props.aemVersion !== 'cloud') {
        depsToAdd.push(bundle, content, config);
        embedsToAdd.push(makeEmbed(bundle), makeEmbed(content), makeEmbed(config));
      }

      if (this.props.examples) {
        depsToAdd.push(exampleConfig, exampleApps, exampleContent);
        embedsToAdd.push(makeEmbed(exampleConfig), makeEmbed(exampleApps), makeEmbed(exampleContent));
      }

      PomUtils.addDependencies(deps, depsToAdd, apiCoordinates(this.props.aemVersion));
      PomUtils.addDependencies(fvPluginEmbeddeds, embedsToAdd);
      const builder = new XMLBuilder(PomUtils.xmlOptions);
      this.fs.write(this.destinationPath('pom.xml'), PomUtils.fixXml(builder.build(pomData)));
      resolve();
    });
  }
}

export default AllPackageModuleCoreComponentMixin;
