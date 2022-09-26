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
import crypto from 'node:crypto';

import _ from 'lodash';
import { globbySync } from 'globby';
import ejs from 'ejs';

import Generator from 'yeoman-generator';
import ModuleMixins from '../../lib/module-mixins.js';
import PomUtils from '../../lib/pom-utils.js';

export const generatorName = '@adobe/generator-aem:dispatcher';

const docLink = (aemVersion) => {
  if (aemVersion === 'cloud') {
    return 'https://docs.adobe.com/content/help/en/experience-manager-cloud-service/implementing/content-delivery/disp-overview.html#file-structure';
  }

  return 'https://helpx.adobe.com/experience-manager/kb/ams-dispatcher-manual/immutable-files.html';
};

class DispatcherGenerator extends Generator {
  constructor(args, options, features) {
    features = features || {};
    features.customInstallTask = true;
    super(args, options, features);

    const dispOptions = _.pick(this.moduleOptions, ['generateInto', 'showBuildOutput', 'name', 'appId']);

    _.forOwn(dispOptions, (v, k) => {
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
    const prompts = _.filter(this._modulePrompts(), (prompt) => {
      return prompt.name === 'name' || prompt.name === 'appId';
    });

    return this.prompt(prompts).then((answers) => {
      _.merge(this.props, answers);
      return answers;
    });
  }

  configuring() {
    this._configuring();
  }

  default() {
    this._duplicateCheck();
  }

  writing() {
    const tplProps = {
      ...this.props,
      docLink: docLink(this.parentProps.aemVersion),
      parent: this.parentProps,
      immutable: [],
    };
    const files = [];
    files.push(...this._listTemplates('shared'));
    const context = this.parentProps.aemVersion === 'cloud' ? 'cloud' : 'ams';
    files.push(...this._listTemplates(context));
    const rootPath = this.templatePath(context);

    const immutableFileList = this.fs.read(this.templatePath(context, 'immutable.files')).split(/\r?\n/);

    return Promise.all(this._buildImmutablePromises(rootPath, immutableFileList, tplProps)).then(() => {
      this._writing(files, tplProps);

      _.each(immutableFileList, (line) => {
        if (line === '') {
          return;
        }

        const parts = line.split('/');
        this.fs.copy(path.join(rootPath, ...parts), this.destinationPath(...parts));
      });
      this._writeSymlinks(context);

      if (this.env.rootGenerator() === this) {
        PomUtils.addModuleToParent(this);
      }
    });
  }

  install() {
    // Make sure build is run with this new/updated module
    if (this.env.rootGenerator() === this) {
      return this._install({ cwd: path.dirname(this.destinationPath()) });
    }
  }

  _buildImmutablePromises(rootPath, immutableList, tplProps) {
    const promises = [];
    _.each(immutableList, (line) => {
      if (line === '') {
        return;
      }

      promises.push(
        new Promise((resolve) => {
          const parts = line.split('/');
          const fd = fs.createReadStream(path.join(rootPath, ...parts), 'utf-8');
          const hash = crypto.createHash('md5');
          hash.setEncoding('hex');

          fd.on('end', () => {
            hash.end();
            const file = {
              path: line,
              md5: hash.read(),
            };
            tplProps.immutable.push(file);
            fd.close();
            resolve();
          });
          fd.pipe(hash);
        })
      );
    });
    return promises;
  }

  _writeSymlinks(context) {
    const symPath = this.templatePath('symlinks', context);
    const symlinks = globbySync([path.join(symPath, '**/*')], { onlyFiles: true });
    for (const entry of symlinks) {
      const relPath = path.relative(symPath, entry);
      const temporary = relPath.replace(/_{2}([^_]+)_{2}/gi, `<%= $1 %>`);
      const dest = ejs.render(temporary, this.props);
      const temporaryAvailable = dest.replaceAll('enabled', 'available');
      const src = path.join('..', path.basename(path.dirname(dest)), path.basename(dest)).replaceAll('enabled', 'available');
      fs.mkdirSync(this.destinationPath(path.dirname(dest)), { recursive: true });
      fs.mkdirSync(this.destinationPath(path.dirname(temporaryAvailable)), { recursive: true });
      if (!this.fs.exists(this.destinationPath(temporaryAvailable))) {
        fs.cpSync(entry, this.destinationPath(temporaryAvailable));
      }

      fs.symlinkSync(src, this.destinationPath(dest));
    }
  }
}

_.extendWith(DispatcherGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export default DispatcherGenerator;
