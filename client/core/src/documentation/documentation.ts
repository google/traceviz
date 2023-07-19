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
 * @fileoverview Interfaces to be implemented by self-documenting TraceViz
 * entities.
 */

/** Supported types of documenters. */
export enum DocumenterType {
  /** Documents an update in response to some user action. */
  UPDATE=0,
  /** Documents a predicate controlling some reaction. */
  PREDICATE,
  /** Documents a watch on a set of Values. */
  WATCH,
  /** Documents some user action and its resulting updates. */
  ACTION,
  /** Documents some reaction and the predicates that control it. */
  REACTION,
  /** Documents a set of interactions: Watches, Actions, and Reactions. */
  INTERACTIONS,
  /** Documents a tool component. */
  COMPONENT,
  /** Documents a tool. */
  TOOL,
}

/** Implemented by self-documenting types. */
export interface Documenter {
  // An automatically generated document string for this Documenter.
  autoDocument: string;
  // A manually-generated document string for this Documenter.  If nonempty,
  // this should override 'autoDocument'.
  overrideDocument: string;
  // This Documenter's type.
  documenterType: DocumenterType;
  // Whether to recursively document this Documenter's children.
  documentChildren: boolean;
  // This Documenter's children.
  children: Documenter[];
}
