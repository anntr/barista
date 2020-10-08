/**
 * @license
 * Copyright 2020 Dynatrace LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { join } from 'path';
import * as ts from 'typescript';
import { findNodes, getSourceFile } from '../utils/ast-utils';
import { strings } from '@angular-devkit/core';
import {
  apply,
  chain,
  mergeWith,
  Rule,
  template,
  Tree,
  url,
} from '@angular-devkit/schematics';
import { formatFiles } from '@nrwl/workspace';
import { commitChanges, InsertChange } from '../utils/change';

function generateBazelFileContent(schema: any): string {
  // BUILD.bazel file has to be generated this way, and not via a template,
  // in order to not get picked up by bazel
  return `load("//tools/bazel_rules:index.bzl", "stylelint")

package(default_visibility = ["//visibility:public"])

filegroup(
  name = "${schema.name}",
  srcs = glob(
      include = ["**/*.ts"],
      exclude = [
          "**/*.spec.ts",
          "src/test-setup.ts",
      ],
  ) + glob([
      "**/*.html",
      "**/*.scss",
  ]),
)

stylelint(
  name = "stylelint",
  srcs = glob(["**/*.scss"]),
)

ts_config(
  name = "tsconfig_lib",
  src = "tsconfig.lib.json",
  deps = [
      "tsconfig.json",
      "//libs/barista-components:tsconfig",
  ],
)
`;
}

export function modifyBazelConfig(schema): Rule {
  return (host: Tree) => {
    const configPath = join('libs', 'barista-components', 'config.bzl');
    const sourceFile = getSourceFile(host, configPath);

    host.create(
      `libs/barista-components/${strings.dasherize(schema.name)}/BUILD.bazel`,
      generateBazelFileContent(schema),
    );

    const componentsDeclaration = findNodes(
      sourceFile,
      ts.SyntaxKind.BinaryExpression,
    ).find(
      (node: ts.BinaryExpression) => node.left.getText() === 'COMPONENTS',
    ) as ts.BinaryExpression;

    const bazelArrayElements = (componentsDeclaration.right as ts.ArrayLiteralExpression)
      .elements;
    const lastElement = bazelArrayElements[
      bazelArrayElements.length - 1
    ] as ts.StringLiteral;
    const end = bazelArrayElements.hasTrailingComma
      ? lastElement.end + 1
      : lastElement.end;
    const change = new InsertChange(
      configPath,
      end,
      `
    "${strings.dasherize(schema.name)}",`,
    );
    return commitChanges(host, change, configPath);
  };
}

export default function (schema: any): Rule {
  const templateSource = apply(url('./files'), [
    template({
      ...strings,
      ...schema,
    }),
  ]);
  return chain([
    mergeWith(templateSource),
    modifyBazelConfig(schema),
    formatFiles(),
  ]);
}
