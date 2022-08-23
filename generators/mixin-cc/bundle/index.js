import path from 'node:path';

import _ from 'lodash';
import { XMLBuilder } from 'fast-xml-parser';

import Generator from 'yeoman-generator';
import PomUtils from '../../../lib/pom-utils.js';
import ModuleMixins from '../../../lib/module-mixins.js';

import { apiCoordinates } from '../../app/index.js';
import { generatorName as bundleGeneratorName } from '../../bundle/index.js';
import { bundleGav, testGav } from '../index.js';

const generatorName = '@adobe/generator-aem:mixin-cc:bundle';

class BundleModuleCoreComponentMixin extends Generator {
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
    this._writeTestHelper();
    this._writePom();
  }

  _writeTestHelper() {
    const yorc = this.fs.readJSON(this.destinationPath('.yo-rc.json'))[bundleGeneratorName];
    const tplProps = {
      package: yorc.package,
      packagePath: yorc.package.replaceAll('.', path.sep),
    };

    const templates = ModuleMixins._listTemplates.call(this);
    ModuleMixins._writing.call(this, templates, tplProps);

  }

  _writePom() {
    const pomData = PomUtils.readPom(this);
    const deps = PomUtils.findPomNodeArray(pomData, 'project', 'dependencies');
    const bundle = { dependency: _.cloneDeep(bundleGav) };
    const test = { dependency: _.clone(testGav) }

    if (this.props.aemVersion === 'cloud') {
      bundle.dependency.splice(2, 0, { scope: [{ '#text': 'test' }] });
    }

    PomUtils.removeDependencies(deps, [bundle, test]);

    PomUtils.addDependencies(deps, [bundle], apiCoordinates(this.props.aemVersion));
    PomUtils.addDependencies(deps, [test], { groupId: 'org.apache.sling', artifactId: 'org.apache.sling.testing.caconfig-mock-plugin' });
    const builder = new XMLBuilder(PomUtils.xmlOptions);
    this.fs.write(this.destinationPath('pom.xml'), PomUtils.fixXml(builder.build(pomData)));
  }

}

export default BundleModuleCoreComponentMixin;
