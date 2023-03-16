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

import {GlobalStateInterface} from '../global_state/global_state_interface.js';
import {ValueMap} from '../value/value_map.js';

/** Implemented by self-documenting types. */
export interface Documenter {
  document(
      globalState: GlobalStateInterface|undefined,
      localState: ValueMap|undefined): string;
}

/** Implemented by self-documenting Actions. */
export interface ActionDocumenter {
  type: string;
  target: string;
  updates: Documenter[];
}

/** Implemented by self-documenting Reactions. */
export interface ReactionDocumenter {
  type: string;
  target: string;
  predicate: Documenter|undefined;
}

/** Implemented by self-documenting Interactions. */
export interface InteractionDocumenter {
  actions: ActionDocumenter[];
  reactions: ReactionDocumenter[];
  watches: Documenter[];
}

/** Documentation for a single component. */
export interface ComponentDocumenter {
  componentName: string;
  componentDocumentation: string;
  interactionDocumenter: InteractionDocumenter|undefined;
}
