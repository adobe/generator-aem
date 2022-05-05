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

import { merge } from 'webpack-merge';
import TerserPlugin from 'terser-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';

import common from './webpack.common.js';

const webpack = merge(common, {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['default', {
            calc: true,
            convertValues: { removeAll: true },
            discardDuplicates: true,
            discardEmpty: true,
            mergeRules: true,
            normalizeCharset: true,
            reduceInitial: true,
            svgo: true,
          }]
        }
      })
    ],
    splitChunks: {
      cacheGroups: {
        main: {
          chunks: 'all',
          name: 'site',
          test: 'main',
          enforce: true,
        }
      }
    }
  },
  performance: { hints: false }
});

export default webpack;
