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

import {Documenter} from '../documentation/documentation.js';
import {GlobalStateInterface} from '../global_state/global_state_interface.js';
import {Value} from '../value/value.js';
import {ValueMap} from '../value/value_map.js';
import {Observable} from 'rxjs';

/**
 * A function accepting a global state and local state and returning an
 * observable boolean indicating whether some predicate holds across a set of
 * Values.
 */
export type MatchFn = (localState: ValueMap|undefined) => Observable<boolean>;

/**
 * The signature for a predicate function.  It should accept a target value and
 * an item value and return a boolean indicating whether the predicate is
 * satisfied over both values.  It should not error: incomparable types should
 * result in a 'false' response.
 */
export type PredicateFn = (targetValue: Value, itemValue: Value) => boolean;

/** A base class for directives serving as action updates. */
export abstract class Update implements Documenter {
  abstract update(
      globalState: GlobalStateInterface|undefined,
      localState: ValueMap|undefined): void;
  abstract document(
      globalState: GlobalStateInterface|undefined,
      localState: ValueMap|undefined): string;
}

/** A base class for directives serving as reaction predicates. */
export abstract class Predicate implements Documenter {
  abstract match(globalState: GlobalStateInterface|undefined): MatchFn;
  abstract document(
      globalState: GlobalStateInterface|undefined,
      localState: ValueMap|undefined): string;
}
