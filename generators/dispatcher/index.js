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
import { fileURLToPath } from 'node:url';

import _ from 'lodash';
import { globbySync } from 'globby';
import ejs from 'ejs';

import Generator from 'yeoman-generator';
import ModuleMixins from '../../lib/module-mixins.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const DispatcherModuleType = 'dispatcher';

const docLink = (aemVersion) => {
  if (aemVersion === 'cloud') {
    return 'https://docs.adobe.com/content/help/en/experience-manager-cloud-service/implementing/content-delivery/disp-overview.html#file-structure';
  }

  return 'https://helpx.adobe.com/experience-manager/kb/ams-dispatcher-manual/immutable-files.html';
};

class AEMDispatcherGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);

    this.moduleType = DispatcherModuleType;
    _.forOwn(this._moduleOptions, (v, k) => {
      this.option(k, v);
    });
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
    if (_.isEmpty(this.options.parent)) {
      const config = this.config.getAll();
      _.each(config, (value, key) => {
        if (value.moduleType && value.moduleType === DispatcherModuleType && key !== this.relativePath) {
          throw new Error('Refusing to create a second Dispatcher module.');
        }
      });

      // Need to have parent update module list.
      const options = { generateInto: this.destinationRoot(), showBuildOutput: this.options.showBuildOutput };
      this.composeWith(path.join(dirname, '..', 'app'), options);
    }
  }

  writing() {
    const files = [];
    files.push(...this._listTemplates('shared'));

    let rootPath;
    let immutableFileList;
    if (this.props.parent.aemVersion === 'cloud') {
      files.push(...this._listTemplates('cloud'));
      rootPath = this.templatePath('cloud');
      immutableFileList = fs.readFileSync(this.templatePath('cloud', 'immutable.files'), 'utf-8').split(/\r?\n/);
    } else {
      files.push(...this._listTemplates('ams'));
      rootPath = this.templatePath('ams');
      immutableFileList = fs.readFileSync(this.templatePath('ams', 'immutable.files'), 'utf-8').split(/\r?\n/);
    }

    _.remove(immutableFileList, (value) => {
      return value === '';
    });

    this.props.immutable = [];
    const promises = [];
    for (const line of immutableFileList) {
      promises.push(
        new Promise((resolve) => {
          const fd = fs.createReadStream(path.join(rootPath, line), 'utf-8');
          const hash = crypto.createHash('md5');
          hash.setEncoding('hex');

          fd.on('end', () => {
            hash.end();
            const file = {
              path: line,
              md5: hash.read(),
            };
            this.props.immutable.push(file);
            fd.close();
            resolve();
          });
          fd.pipe(hash);
        })
      );
    }

    return Promise.all(promises).then(() => {
      this.props.docLink = docLink(this.props.parent.aemVersion);
      this._writing(files);
      for (const line of immutableFileList) {
        this.fs.copy(path.join(rootPath, line), this.destinationPath(this.relativePath, line));
      }

      this._writeSymlinks();
    });
  }

  _writeSymlinks() {
    const symPath = this.props.parent.aemVersion === 'cloud' ? this.templatePath('symlinks', 'cloud') : this.templatePath('symlinks', 'ams');
    const symlinks = globbySync([path.join(symPath, '**/*')], { onlyFiles: true });
    for (const entry of symlinks) {
      const relPath = path.relative(symPath, entry);
      const temporary = relPath.replace(/_{2}([^_]+)_{2}/gi, `<%= $1 %>`);
      const dest = ejs.render(temporary, this.props);
      const temporaryAvailable = dest.replaceAll('enabled', 'available');
      const src = path.join('..', path.basename(path.dirname(dest)), path.basename(dest)).replaceAll('enabled', 'available');
      fs.mkdirSync(this.destinationPath(this.relativePath, path.dirname(dest)), { recursive: true });
      fs.mkdirSync(this.destinationPath(this.relativePath, path.dirname(temporaryAvailable)), { recursive: true });
      if (!fs.existsSync(this.destinationPath(this.relativePath, temporaryAvailable))) {
        fs.cpSync(entry, this.destinationPath(this.relativePath, temporaryAvailable));
      }

      fs.symlinkSync(src, this.destinationPath(this.relativePath, dest));
    }
  }
}

_.extendWith(AEMDispatcherGenerator.prototype, ModuleMixins, (objectValue, srcValue) => {
  return _.isFunction(srcValue) ? srcValue : _.cloneDeep(srcValue);
});

export { AEMDispatcherGenerator, DispatcherModuleType };
export default AEMDispatcherGenerator;
