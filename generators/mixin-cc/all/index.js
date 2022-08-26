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

import Generator from 'yeoman-generator';

const generatorName = '@adobe/generator-aem:mixin-cc:all';

class AllPackageModuleCoreComponentMixin extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.rootGeneratorName = function () {
      return generatorName;
    };
  }

  //
  // _processAll = () => {
  //   return new Promise((resolve) => {
  //     const pom = this.destinationPath('all', 'pom.xml');
  //     const parsed = this._readPom(pom);
  //     const appId = this.config.get('all').appId;
  //
  //     const project = _.find(parsed, (item) => _.has(item, 'project')).project;
  //
  //     const wrap = (def) => {
  //       return {
  //         embedded: _.concat(_.cloneDeep(def), { target: [{ '#text': `/apps/${appId}-vendor-packages/application/install` }] }),
  //       };
  //     };
  //
  //     this._updateFilevaultPlugin(project, [configDef, contentDef, bundleDef], 'embeddeds', wrap);
  //
  //     const dependencies = _.find(project, (item) => _.has(item, 'dependencies')).dependencies;
  //     this._insert(dependencies, { dependency: configDef });
  //     this._insert(dependencies, { dependency: contentDef });
  //     this._insert(dependencies, { dependency: bundleDef });
  //     this._writePom(pom, parsed);
  //     resolve();
  //   });
  // };

  // _updateFilevaultPlugin = (
  //   project,
  //   definitions = [],
  //   wrapperType = 'dependencies',
  //   wrap = (def) => {
  //     return { dependency: def };
  //   }
  // ) => {
  //   // Need to find the filevault plugin configuration child of the wrapper type.
  //   const buildPlugins = _.find(_.find(project, (projectItem) => _.has(projectItem, 'build')).build, (buildItem) => _.has(buildItem, 'plugins')).plugins;
  //
  //   const fvPlugin = _.find(buildPlugins, (plugin) => {
  //     return _.find(plugin.plugin, (def) => {
  //       return def.artifactId && def.artifactId[0]['#text'] === 'filevault-package-maven-plugin';
  //     });
  //   }).plugin;
  //   const fvConfiguration = _.find(fvPlugin, (item) => {
  //     return _.has(item, 'configuration');
  //   }).configuration;
  //   let fvWrapper = _.find(fvConfiguration, (item) => {
  //     return _.has(item, wrapperType);
  //   });
  //   if (!fvWrapper) {
  //     fvWrapper = {};
  //     fvWrapper[wrapperType] = [];
  //     fvConfiguration.splice(fvConfiguration.length, 0, fvWrapper);
  //   }
  //
  //   _.each(definitions, (def) => {
  //     this._insert(fvWrapper[wrapperType], wrap(def));
  //   });
  // };
  //
  // _insert = (list, definition) => {
  //   const name = _.keys(definition)[0];
  //
  //   const found = _.find(list, (item) => {
  //     if (!item[name]) {
  //       return false;
  //     }
  //
  //     return _.find(item[name], (gav) => _.isEqual(gav, definition));
  //   });
  //   if (found) {
  //     return;
  //   }
  //
  //   const insertBefore =
  //     _.findIndex(list, (item) => {
  //       if (!item[name]) {
  //         return false;
  //       }
  //
  //       return _.find(item[name], (gav) => {
  //         return gav.groupId && gav.groupId[0]['#text'] === 'com.adobe.aem';
  //       });
  //     }) + 1; // Insert after index of SDK/Uber jar.
  //   list.splice(insertBefore, 0, definition);
  // };
}

export default AllPackageModuleCoreComponentMixin;
