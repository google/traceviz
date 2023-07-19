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
 * @fileoverview Tools for working with item magnitudes included in ValueMaps.
 *
 * getSelfMagnitude returns the self-magnitude defined in a provided ValueMap,
 * or 0 if there is no self-magnitude defined in the ValueMap.  If it defines a
 * self-magnitude, this ValueMap should contain:
 *   * Keys.SELF_MAGNITUDE: a number specifying the self-magnitude.
 */

import {ValueMap} from '../value/value_map.js';

enum Keys {
  SELF_MAGNITUDE='self_magnitude',
}

/**
 * The set of property keys expected by this package. 
 */
export const properties: string[]=[Keys.SELF_MAGNITUDE];

/**
 * Returns the self-magnitude in the provided ValueMap, or 0 if there is none.
 */
export function getSelfMagnitude(vm: ValueMap): number {
  if (!vm.has(Keys.SELF_MAGNITUDE)) {
    return 0;
  }
  return vm.expectNumber(Keys.SELF_MAGNITUDE);
}
