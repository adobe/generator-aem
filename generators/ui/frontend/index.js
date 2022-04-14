import Generator from 'yeoman-generator';
import _ from 'lodash';

import GeneratorCommons from '../../../lib/common.js';
import AEMModuleFunctions from '../../../lib/module.js';

class AEMUIFrontendGenerator extends Generator {
  constructor(args, options, features) {
    super(args, options, features);
    const options_ = {};
    _.defaults(options_, GeneratorCommons.options);

    _.forIn(options_, (v, k) => {
      this.option(k, v);
    });
    this.moduleType = 'ui:frontend';
  }

  prompting() {
    const prompts = GeneratorCommons.prompts(this);
    return this.prompt(prompts).then((answers) => {
      GeneratorCommons.processAnswers(this, answers);
      _.merge(this.props, answers);
    });
  }

  writing() {

  }
}

_.extend(AEMUIFrontendGenerator.prototype, AEMModuleFunctions);

export default AEMUIFrontendGenerator;
