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

import fs from 'node:fs';
import path from 'node:path';

import _ from 'lodash';
import ejs from 'ejs';

import Generator from 'yeoman-generator';

import ModuleMixins from '../../lib/module-mixins.js';
import PomUtils from '../../lib/pom-utils.js';
import { generatorName as bundleGeneratorName } from '../bundle/index.js';
import { generatorName as contentGeneratorName } from '../package-content/index.js';
import { generatorName as structureGeneratorName } from '../package-structure/index.js';

export const generatorName = '@adobe/generator-aem:package-config';

class ConfigPackageGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    _.forOwn(this.moduleOptions, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function() {
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
    const bundles = [];
    const contents = [];

    // if (this.props.parent.aemVersion !== 'cloud' && this.props.loggerPackages) {
    //   files.push(...this._listTemplates('loggers'));
    // }

    const root = path.dirname(this.destinationRoot());
    const modules = PomUtils.listParentPomModules(this, root);
    _.each(modules, (module) => {
      const yorcFile = path.join(root, module, '.yo-rc.json');
      if (this.fs.exists(yorcFile)) {
        const yorc = this.fs.readJSON(path.join(yorcFile));
        if (yorc[bundleGeneratorName] !== undefined) {
          bundles.push({ appId: yorc[bundleGeneratorName].appId, package: yorc[bundleGeneratorName].package });
        } else if (yorc[contentGeneratorName] !== undefined) {
          contents.push({ appId: yorc[contentGeneratorName].appId });
        }
      }
    });

    const appIds = new Set([this.props.appId]);
    _.map(bundles, 'appId').forEach(item => appIds.add(item));
    _.map(contents, 'appId').forEach(item => appIds.add(item));
    const mappings = _.map(contents, (item) => {
      return `/content/${item.appId}/</`;
    });
    mappings.push('/:/');

    this.writeDestinationJSON(
      path.join('src', 'main', 'content', 'jcr_root', 'apps', this.props.appId, 'osgiconfig', 'config.publish', 'org.apache.sling.jcr.resource.internal.JcrResourceResolverFactoryImpl.cfg.json'),
      { 'resource.resolver.mapping': mappings }
    );

    this._writing(this._listTemplates('shared'), { appIds: [...appIds] });

    _.each(contents, (p) => {
      this._writing(this._listTemplates('content'), { appId: p.appId, name: this.props.name });
    });
    _.each(bundles, (b) => {
      this._writing(this._listTemplates('loggers'), { appId: b.appId, loggerPackage: b.package });
    });


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


  _writePom() {

    const tplProps = _.pick(this.props, ['name', 'artifactId', 'appId']);
    tplProps.parent = this.parentProps;
    const structures = this._findModules(structureGeneratorName);
    if (structures.length > 0) {
      tplProps.structure = structures[0];
    }

    // Read the template and parse w/ properties.
    const genPom = ejs.render(fs.readFileSync(this.templatePath('pom.xml'), PomUtils.fileOptions), tplProps);
    const pomFile = this.destinationPath('pom.xml');
    this.fs.write(pomFile, genPom);
  }
}

_.extendWith(ConfigPackageGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default ConfigPackageGenerator;
