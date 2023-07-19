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

import { ValueMap } from '../value/value_map.js';

/**
 * @fileoverview Tools for working with labels included in ValueMaps.
 *
 * getLabel returns a formatted label given a labelable item's ValueMap, or
 * an empty string if the ValueMap does not specify a label.  If it defines a
 * label, this ValueMap should contain:
 *   * Keys.LABEL_FORMAT: a string specifying the label format.  Any properties
 *     referenced in the format string should exist.
 */

enum Keys {
  LABEL_FORMAT = 'label_format',
}

/**
 * Returns the label for the provided ValueMap, or an empty string otherwise.
 */
export function getLabel(vm: ValueMap): string {
  if (!vm.has(Keys.LABEL_FORMAT)) {
    return '';
  }
  return vm.format(vm.expectString(Keys.LABEL_FORMAT));
}
