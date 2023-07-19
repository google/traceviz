/*
        Copyright 2023 Google Inc.
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
                https://www.apache.org/licenses/LICENSE-2.0
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
*/

/**
 * @fileoverview Test utilities for working with Documenters.
 */

import {Documenter, DocumenterType} from './documentation.js';

const typeToString=new Map<DocumenterType, string>([
  [DocumenterType.UPDATE, 'Update'],
  [DocumenterType.PREDICATE, 'Predicate'],
  [DocumenterType.WATCH, 'Watch'],
  [DocumenterType.ACTION, 'Action'],
  [DocumenterType.REACTION, 'Reaction'],
  [DocumenterType.INTERACTIONS, 'Interactions'],
  [DocumenterType.COMPONENT, 'Component'],
  [DocumenterType.TOOL, 'Tool'],
]);

/**
 * Returns a deterministic prettyprinted representation of the provided
 * Documenter, indented by the supplied indentation.
 */
export function prettyPrintDocumenter(doc: Documenter, indent=''): string[] {
  const msg=
    (doc.overrideDocument==='')? doc.autoDocument:doc.overrideDocument;
  const ret=[`${indent}${msg} (${typeToString.get(doc.documenterType)})`];
  if (doc.documentChildren) {
    for (const child of doc.children) {
      ret.push(...prettyPrintDocumenter(child, indent+'  '));
    }
  }
  return ret;
}
