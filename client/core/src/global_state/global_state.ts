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
 * @fileoverview GlobalState is a global singleton associating (string) keys
 * with Values, representing global filters, selections, and similar things.
 */

import { GlobalStateInterface } from './global_state_interface.js';

import { ConfigurationError, Severity } from '../errors/errors.js';
import { Value } from '../value/value.js';
import { BehaviorSubject } from 'rxjs';

const SOURCE = 'global_state';

/**
 * Contains globally-shared application state in a key/value mapping.
 * GlobalState implements GlobalStateInterface, and additionally provides
 * methods for resetting the key/value mapping and for adding new keys.
 *
 * All TraceViz components may fetch Values by key from the GlobalState, and
 * may freely read, update, or subscribe to those Values, but may not add new
 * keys, change the set of keys, or change the Value type associated with a
 * given key.
 */
export class GlobalState extends BehaviorSubject<string[]> implements
    GlobalStateInterface {
  private valuesByKey = new Map<string, Value>();

  constructor() {
    super([]);
    this.reset();
  }

  /** Clears the entire key/value map. */
  reset() {
    this.valuesByKey = new Map<string, Value>();
  }

  /**
   * Sets the specified key to the specified value in the global state mapping.
   * It is an error to call set() on a key already present in the global
   * mapping.
   */
  set(key: string, val: Value) {
    if (this.valuesByKey.has(key)) {
      throw new ConfigurationError(`Global state key '${key}' is already set`)
          .from(SOURCE)
          .at(Severity.FATAL);
    }
    this.valuesByKey.set(key, val);
    this.next([...this.valuesByKey.keys()]);
  }

  /**
   * Returns the Value associated with the specified key in the global state
   * mapping.  It is an error to call get() on a key not present in the global
   * mapping.
   */
  get(key: string): Value {
    const storedVal = this.valuesByKey.get(key);
    if (storedVal === undefined) {
      throw new ConfigurationError(`Global state key '${key}' is not set`)
          .from(SOURCE)
          .at(Severity.FATAL);
    }
    return storedVal;
  }
}