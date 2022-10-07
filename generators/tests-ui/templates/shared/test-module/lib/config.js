/*
 *  Copyright 2020 Adobe Systems Incorporated
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import path from 'node:path';
import url from 'node:url';

// Common constants
const CHROME = 'chrome';
const FIREFOX = 'firefox';

// Headless Mode
const headless = process.env.HEADLESS_BROWSER === 'true';

// Environment Variables sent by CloudManager
// Selenium Endpoint
const selenium_base_url = process.env.SELENIUM_BASE_URL || 'http://localhost:4444';
// Browser
const browser = process.env.SELENIUM_BROWSER || 'chrome';
// Results Reports
const reports_path = process.env.REPORTS_PATH || './reports/';
// Handle resources for upload testing
const shared_folder = process.env.SHARED_FOLDER || null;
const upload_url = process.env.UPLOAD_URL || null;
// AEM Author
const aem_author_basel_url = process.env.AEM_AUTHOR_URL || 'http://localhost:4502';
const aem_author_username = process.env.AEM_AUTHOR_USERNAME || 'admin';
const aem_author_password = process.env.AEM_AUTHOR_PASSWORD || 'admin';
// AEM Publish
const aem_publish_basel_url = process.env.AEM_PUBLISH_URL || 'http://localhost:4503';
const aem_publish_username = process.env.AEM_PUBLISH_USERNAME || 'admin';
const aem_publish_password = process.env.AEM_PUBLISH_PASSWORD || 'admin';

export const config = {
  selenium: {
    base_url: selenium_base_url,
    hostname: url.parse(selenium_base_url).hostname,
    port: parseInt(url.parse(selenium_base_url).port),
    browser: browser,
    headless: headless
  },
  aem: {
    author: {
      base_url: aem_author_basel_url,
      username: aem_author_username,
      password: aem_author_password,
    },
    publish: {
      base_url: aem_publish_basel_url,
      username: aem_publish_username,
      password: aem_publish_password,
    }
  },
  reports_path: reports_path,
  shared_folder: shared_folder,
  upload_url: upload_url,
  screenshots_path: path.join(reports_path, 'html/screenshots/'),
  CHROME: CHROME,
  FIREFOX: FIREFOX
};

export default config;
