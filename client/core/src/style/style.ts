
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
 * @fileoverview Utilities for extracting styles defined within ValueMaps.
 */

import {ValueMap} from '../value/value_map.js';

const STYLE_KEY_PREFIX = 'style_';

/**
 * Fetches the named attribute from the provided ValueMap, or undefined if the
 * named attribute does not exist.
 */
export function getStyle(attrName: string, vm: ValueMap): string|undefined {
  const key = STYLE_KEY_PREFIX + attrName;
  if (!vm.has(key)) {
    return;
  }
  return vm.expectString(key);
}

export function getStyles(vm: ValueMap): {[klass: string]: string} {
  const ret: {[klass: string]: string;} = {};
  for (const key of vm.keys()) {
    if (key.startsWith(STYLE_KEY_PREFIX)) {
      ret[key.slice(STYLE_KEY_PREFIX.length)] = vm.get(key).toString();
    }
  }
  return ret;
}
