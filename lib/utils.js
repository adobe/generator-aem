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

/**
 * Returns a promise that resolves to the current maven metadata of SDK.
 *
 * @returns
 */
import got from 'got';
import { XMLParser } from 'fast-xml-parser';

const coordinates = (version) => {
  if (version === 'cloud') {
    return {
      groupId: 'com.adobe.aem',
      artifactId: 'aem-sdk-api',
      path: 'com/adobe/aem/aem-sdk-api',
    };
  }

  return {
    groupId: 'com.adobe.aem',
    artifactId: 'uber-jar',
    path: 'com/adobe/aem/uber-jar',
  };
};

const latestApi = (version) => {
  return new Promise((resolve, reject) => {
    const metadata = coordinates(version);

    try {
      got.get(`https://repo1.maven.org/maven2/${metadata.path}/maven-metadata.xml`, { responseType: 'text', resolveBodyOnly: true }).then((body) => {
        try {
          const parser = new XMLParser({
            ignoreAttributes: true,
            ignoreDeclaration: true,
          });
          const data = parser.parse(body);
          metadata.version = data.metadata.versioning.latest;
          resolve(metadata);
          /* c8 ignore next 3 */
        } catch (error) {
          reject(error);
        }
      });
      /* c8 ignore next 3 */
    } catch (error) {
      reject(error.response ? error.response.body : error);
    }
  });
};

export { latestApi };
const Utils = { latestApi };
export default Utils;
