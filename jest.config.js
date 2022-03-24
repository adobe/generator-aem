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

module.exports = {
  testPathIgnorePatterns: ['<rootDir>/__tests__/fixtures/'],
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/**/*.js',
    'generators/**/*.js',
    '!generators/**/templates/**/*.js',
    '!generators/**/common-templates/**/*.js',
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      lines: 100,
      statements: 100,
    },
  },
  transformIgnorePatterns: [
    "node_modules/(?!@adobe/generator-aem)"
  ]
};
