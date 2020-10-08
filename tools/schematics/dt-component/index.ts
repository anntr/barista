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

export function modifyBazelConfig(schema): Rule {
  return (host: Tree) => {
    const configPath = join('libs', 'barista-components', 'config.bzl');
    const sourceFile = getSourceFile(host, configPath);

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
