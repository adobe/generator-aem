import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import _ from 'lodash';
import ejs from 'ejs';
import { globbySync } from 'globby';

import Generator from 'yeoman-generator';

import PomUtils, { filevaultPlugin } from '../../../lib/pom-utils.js';
import { generatorName as rootGeneratorName, apiCoordinates } from '../../app/index.js';
import { generatorName as appsGeneratorName } from '../../package-apps/index.js';
import { bundleGav, contentGav, configGav } from '../index.js';
import { XMLBuilder } from 'fast-xml-parser';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const generatorName = '@adobe/generator-aem:mixin-cc:apps';


class AppsPackageModuleCoreComponentMixin extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    const opts = {
      generateInto: {
        type: String,
        required: true,
        desc: 'Relocate the location in which files are generated.',
      },
      aemVersion: {
        type: String,
        required: true,
        desc: 'Version of AEM used by this project, (6.5 or cloud).',
      },
      version: {
        type: String,
        desc: 'Version of the Core Components to use.',
      }
    };

    _.forOwn(opts, (v, k) => {
      this.option(k, v);
    });

    this.rootGeneratorName = function() {
      return generatorName;
    };
  }

  initializing() {
    this.destinationRoot(this.destinationPath(this.options.generateInto));
    this.props = {
      aemVersion: this.options.aemVersion,
    };
  }

  writing() {
    const promises = [this._writePom(), ...this._writeProxies()];
    return Promise.all(promises);
  }

  _writePom() {
    return new Promise((resolve) => {
      const pomData = PomUtils.readPom(this);
      const project = PomUtils.findPomNodeArray(pomData, 'project');
      const deps = PomUtils.findPomNodeArray(project, 'dependencies');

      const bundle = { dependency: _.cloneDeep(bundleGav) };
      const content = { dependency: _.cloneDeep(contentGav) };
      const config = { dependency: _.cloneDeep(configGav) };

      const toAdd = [bundle, content, config];

      // Delete then re-add - always easier;
      PomUtils.removeDependencies(deps, toAdd);

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
      const fvPluginDeps = PomUtils.findPomNodeArray(fvPlugin, 'configuration', 'dependencies');
      PomUtils.removeDependencies(fvPluginDeps, toAdd);

      if (this.props.aemVersion !== 'cloud') {
        PomUtils.addDependencies(deps, toAdd, apiCoordinates(this.props.aemVersion));

        // Can't have 'type' in the filevault list. need to remove it from content/config dependencies

        const fvToAdd = [bundle];
        let tmp = _.cloneDeep(content);
        tmp.dependency.pop();
        fvToAdd.push(tmp);
        tmp = _.cloneDeep(config);
        tmp.dependency.pop();
        fvToAdd.push(tmp);
        PomUtils.addDependencies(fvPluginDeps, fvToAdd);
      }
      const builder = new XMLBuilder(PomUtils.xmlOptions);
      this.fs.write(this.destinationPath('pom.xml'), PomUtils.fixXml(builder.build(pomData)));
      resolve();
    });
  }

  _writeProxies() {
    const rootYorc = this.fs.readJSON(path.join(path.dirname(this.destinationRoot()), '.yo-rc.json'))[rootGeneratorName];
    const appsYorc = this.fs.readJSON(this.destinationPath('.yo-rc.json'))[appsGeneratorName];
    const appId = appsYorc.appId;
    const tplProps = {
      appId: appId,
      projName: rootYorc.name,
    };

    const fileVersion = this.props.version.match(/(\d+\.\d+)\.\d+/)[1];
    const componentFile = path.join(dirname, 'versions', fileVersion, 'components.json');
    if (!this.fs.exists(componentFile)) {
      throw new Error(`Unable to find Core Component list for version '${fileVersion}'`);
    }
    const componentGroups = this.fs.readJSON(componentFile);
    const outputRoot = path.join(this.destinationPath('src', 'main', 'content', 'jcr_root', 'apps', appId, 'components'));
    const promises = [];

    _.each(componentGroups, (group) => {
      group.relativePath ||= '';
      promises.push(...this._buildCompPromises(tplProps, path.join(outputRoot, group.relativePath), group.components, group.relativePath));
    });
    return promises;
  }

  _buildCompPromises = (properties, outputRoot, components, folderQualifier) => {
    const promises = [];
    if (!fs.existsSync(path.join(outputRoot))) {
      fs.mkdirSync(path.join(outputRoot));
    }
    _.each(components, (comp) => {
      const transformed = _.transform(
        comp,
        (result, value, key) => {
          result[key] = typeof value === 'string' || value instanceof String ? ejs.render(value, properties) : value;
        },
        {}
      );

      const ref = _.find(components, (c) => {
        return c.name && c.name === comp.superType;
      });

      const relPath = folderQualifier.length === 0 ? folderQualifier : folderQualifier + '/';

      const superType = ref ? `core/wcm/components/${relPath}${ref.name}/v${ref.version}/${ref.name}` : `core/wcm/components/${relPath}${comp.name}/v${comp.version}/${comp.name}`;

      const tplProps = {
        superType,
      };
      _.defaults(tplProps, properties, transformed);

      promises.push(this._buildCompPromise(comp, tplProps, outputRoot));
    });
    return promises;
  };

  _buildCompPromise = (config, tplProperties, outputRoot) => {
    return new Promise((resolve) => {
      const outputDir = path.join(outputRoot, config.name);
      fs.mkdirSync(outputDir);
      const files = [];
      let templates = globbySync([this.templatePath('shared', '**/*'), this.templatePath('shared', '**/.*')], { onlyFiles: true });
      _.each(templates, (t) => {
        files.push({
          src: t,
          dest: this.destinationPath(outputDir, path.relative(this.templatePath('shared'), t)),
        });
      });
      templates = globbySync([this.templatePath('unique', config.name, '**/*'), this.templatePath('unique', config.name, '**/.*')], { onlyFiles: true });
      _.each(templates, (t) => {
        files.push({
          src: t,
          dest: this.destinationPath(outputDir, path.relative(this.templatePath('unique', config.name), t)),
        });
      });

      if (config.newContainerType) {
        templates = globbySync([this.templatePath('container-types', '**/*'), this.templatePath('container-types', '**/.*')], { onlyFiles: true });
        _.each(templates, (t) => {
          files.push({
            src: t,
            dest: this.destinationPath(outputDir, path.relative(this.templatePath('container-types'), t)),
          });
        });
      }

      for (const f of files) {
        this.fs.copyTpl(f.src, f.dest, tplProperties);
      }

      resolve();
    });
  };
}

export default AppsPackageModuleCoreComponentMixin;
