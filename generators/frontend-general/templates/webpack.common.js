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

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import ESLintWebpackPlugin from 'eslint-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const sourceRoot = path.join(dirname, 'src', 'main', 'webpack');

const tsconfig = {
  extensions: ['.js', '.tx'],
  plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })]
};

const webpack = {
  resolve: tsconfig,
  entry: {
    site: path.join(sourceRoot, 'main.ts'),
  },
  output: {
    filename: 'clientlib-[name]/[name].js',
    path: path.join(dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          { loader: 'ts-loader' },
          { loader: 'glob-import-loader', options: { resolve: tsconfig } },
        ],
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { url: false } },
          { loader: 'sass-loader' },
          { loader: 'glob-import-loader', options: { resolve: tsconfig } }
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new ESLintWebpackPlugin({ extensions: ['js', 'ts', 'tsx'] }),
    new MiniCssExtractPlugin({ filename: 'clientlib-[name]/[name].css' }),
    new CopyWebpackPlugin({
      patterns: [{ from: path.resolve(dirname, sourceRoot, 'resources'), to: './clientlib-site/' }]
    }),
  ],
  stats: {
    assetsSort: 'chunks',
    builtAt: true,
    children: false,
    chunkGroups: true,
    chunkOrigins: true,
    colors: false,
    errors: true,
    errorDetails: true,
    env: true,
    modules: false,
    performance: true,
    providedExports: false,
    source: false,
    warnings: true
  }
};

export default webpack;
