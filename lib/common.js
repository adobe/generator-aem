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

import { XMLParser } from 'fast-xml-parser';

/**
 * Defines options available to all Generators.
 */
const options = {
  generateInto: {
    type: String,
    required: false,
    desc: 'Relocate the location in which files are generated.',
  },

  showBuildOutput: {
    desc: 'Display the build output after generation.',
    default: true,
  },

  defaults: {
    desc: 'Use all defaults for user input.',
  },

  examples: {
    desc: 'Include demo/example code and content.',
  },

  name: {
    type: String,
    desc: 'Application title, will be used for website title and components groups (e.g. "My Site").',
  },

  appId: {
    type: String,
    desc: 'Technical name used for component, config, content, and client library names (e.g. "mysite").',
  },

  artifactId: {
    type: String,
    desc: 'Base Maven Artifact ID (e.g. "mysite").',
  },
};

/**
 * Returns properties based on Generator's context. List of properties are the keys in `options`.
 *
 *  Properties are looked up and take precedence in the following order (if exists):
 *
 *  * CLI Options passed
 *  * .yo-rc.json Configuration
 *  * pom.xml
 *  * Reasonable Defaults
 *
 *  Set the Generator's `options.generateInto` for the following:
 *  *  Use generateInto value for determining Generators properties in Yeoman Config  (.yo-rc.json)
 *  * Check parent folder for pom.
 *
 * If parent information is found, it is set to `props.parent` Parent will only contain:
 *
 *
 * @param {Generator} [generator] Generator context for looking up properties.
 * @param {String} [relativeDir] Relative directory from root that the generator output content.
 * @param {function} [callback] a callback which will be executed to set custom property defaults not found in storage, the properties will be passed as the argument
 */
function props(generator, relativeDir = '', callback = undefined) {
  const options = generator.options;
  const properties = {};
  const names = ['defaults', 'examples', 'name', 'appId', 'artifactId'];

  _.defaults(properties, _.pick(options, names));

  const isChild = relativeDir !== '';

  if (isChild) {
    const config = generator.config.get(relativeDir);
    _.defaults(properties, _.pick(config, names));

    const pomProps = GeneratorCommons.readPom(generator.destinationPath(relativeDir));
    _.defaults(properties, _.pick(pomProps, names));

    const parent = {};
    _.defaults(parent, _.pick(generator.config.getAll(), names));

    const parentPomProps = GeneratorCommons.readPom(generator.destinationPath());
    _.defaults(parent, _.pick(parentPomProps, names));
    properties.parent = parent;
  } else {
    const config = generator.config.getAll();
    _.defaults(properties, _.pick(config, names));

    const pomPath = generator.destinationPath();
    const pomProps = GeneratorCommons.readPom(pomPath);
    _.defaults(properties, _.pick(pomProps, names));
  }

  if (options.defaults) {
    if (properties.appId) {
      _.defaults(properties, { artifactId: properties.appId });
    }

    _.defaults(properties, { examples: false });
  }

  if (callback) {
    callback.bind(generator)(properties);
  }

  return properties;
}

/**
 * Creates a list of prompts shared by all generators. Prompts are configured based on provided properties.
 *
 * @param {Generator}  generator list of the Generator properties
 */
function prompts(generator) {
  const options = generator.options || {};
  const properties = generator.props || {};
  const list = [
    {
      name: 'examples',
      message: 'Include any examples in generated projects?',
      type: 'confirm',
      when() {
        return new Promise((resolve) => {
          if (properties.defaults) {
            resolve(false);
          }

          resolve(properties.examples === undefined);
        });
      },
      default: false,
    },
    {
      name: 'name',
      message: 'Project name (e.g. "My Site").',
      when: properties.name === undefined,
      validate(name) {
        return new Promise((resolve) => {
          if (!name || name.length === 0) {
            resolve('Name must be provided.');
          }

          resolve(true);
        });
      },
    },
    {
      name: 'appId',
      message: 'App technical name (e.g. "mysite").',
      when: properties.appId === undefined,
      validate(appId) {
        return new Promise((resolve) => {
          if (!appId || appId.length === 0) {
            resolve('AppId must be provided.');
          }

          resolve(true);
        });
      },
    },
    {
      name: 'artifactId',
      message: 'Maven Artifact ID. (e.g. "mysite").',
      when() {
        return new Promise((resolve) => {
          if (properties.defaults) {
            resolve(false);
          }

          resolve(properties.artifactId === undefined);
        });
      },
      default(answers) {
        return new Promise((resolve) => {
          let appId = answers.appId ? answers.appId : properties.appId;
          if (options.generateInto) {
            appId = `${appId}.${options.generateInto}`;
          }

          resolve(appId);
        });
      },
      validate(artifactId) {
        return new Promise((resolve) => {
          if (!artifactId || artifactId.length === 0) {
            resolve('ArtifactId must be provided.');
          }

          if (/[^a-zA-Z.]+/.test(artifactId)) {
            resolve('ArtifactId must only contain letters or periods (.).');
          }

          resolve(true);
        });
      },
    },
  ];

  return list;
}

/**
 * Prompts don't set default or answer value if they were not asked (`when` is false)
 *
 * This method fixes any shared values to be set based on expected values.
 *
 * @param {Generator} generator the generator with processing prompts
 * @param answers the answers of the prompts
 */
function processAnswers(generator, answers) {
  const properties = generator.props;
  const options = generator.options || {};
  if (properties.defaults) {
    let appId = answers.appId ? answers.appId : properties.appId;
    if (options.generateInto) {
      appId = `${appId}.${options.generateInto}`;
    }

    answers.artifactId = properties.artifactId || appId;
  }
}

/**
 * Reads the following properties from a pom file, in the specified path:
 *
 * {
 *   groupId: '',
 *   artifactId: '',
 *   version: '',
 *   name: '',
 *   pomProperties: {}
 * }
 *
 * Any property not found, will not be in the returned object.
 * `pomProperties` will be all properties found in the pom's `properties` section.
 *
 * @param dir path to directory containing pom.xml
 * @returns properties specified in pom.
 */
function readPom(dir) {
  const properties = {};
  const pom = path.join(dir, 'pom.xml');
  if (!fs.existsSync(pom)) {
    return properties;
  }

  const data = fs.readFileSync(pom, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: true,
    ignoreDeclaration: true,
  });
  const parsed = parser.parse(data);

  if (parsed.project.name) {
    properties.name = parsed.project.name;
  }

  const project = _.pick(parsed.project, ['groupId', 'artifactId', 'version']);
  _.defaults(properties, project);
  if (parsed.project.properties) {
    properties.pomProperties = {};
    _.defaults(properties.pomProperties, parsed.project.properties);
  }

  return properties;
}

/**
 * Writes files using the provided fs reference.
 *
 * If the template destinations are in the format:
 *    __propertyname__
 * they will be transformed into an EJS format, and processed using the this's props attribute
 *
 * Templates use the `$` character for the delimiter, unless otherwise specified in `opts`.
 *
 * Files are written from src to dest
 *
 * @param {Generator} generator - The Generator context
 * @param {Object[]} templates - The list of templates to process
 * @param {string} templates[].src - The source location of the template
 * @param {string} templates[].dest - The destination of the processed template
 * @param {Object} options - Optional options to pass to the EJS template processor
 */
function write(generator, templates, options = {}) {
  const properties = generator.props;
  const localOptions = _.defaults(options, { delimiter: '%' });
  const fixpath = (filepath, props, fopts) => {
    const dest = filepath.replace(/_{2}([^_]+)_{2}/gi, `<${fopts.delimiter}= $1 ${fopts.delimiter}>`);
    return ejs.render(dest, props, fopts);
  };

  for (const t of templates) {
    generator.fs.copyTpl(t.src, fixpath(t.dest, properties, localOptions), properties, localOptions);
  }
}

const GeneratorCommons = {
  options,
  props,
  prompts,
  processAnswers,
  readPom,
  write,
};

export default GeneratorCommons;
