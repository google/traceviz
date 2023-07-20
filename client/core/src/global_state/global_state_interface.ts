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

import {Value} from '../value/value.js';
import {Subject} from 'rxjs';

/**
 * Extended by types that include the portion of the GlobalState API available
 * to all TraceViz components.  Provides lookup by key on global Values, and is
 * an Observable broadcasting changes to its managed set of keys.
 */
export interface GlobalStateInterface extends Subject<string[]> {
  /**
   * Returns the Value associated with the specified key in the global state
   * mapping.  It is an error to call get() on a key not present in the global
   * mapping.
   */
  get(key: string): Value;
}
