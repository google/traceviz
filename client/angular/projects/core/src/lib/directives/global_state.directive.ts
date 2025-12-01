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
 * @fileoverview A directive defining an app's global state.
 */

import {ContentChild, Directive} from '@angular/core';
import {AppCore, ConfigurationError, Severity} from '@google/traceviz-client-core';

import {ValueMapDirective} from './value_map.directive';

const SOURCE = 'global_state.directive';

/**
 * Populates the global state key/value map, setting all keys, Value types, and
 * initial values from its contained ValueMap.
 * This is the only way to set a key in the global state.
 */
@Directive({standalone: false, selector: 'global-state'})
export class GlobalStateDirective {
  @ContentChild(ValueMapDirective) values: ValueMapDirective|undefined;

  init(appCore: AppCore): void {
    if (this.values === undefined) {
      throw new ConfigurationError('global-state lacks a value-map')
          .from(SOURCE)
          .at(Severity.FATAL);
    }
    for (const [key, value] of this.values.getValueMap().entries()) {
      appCore.globalState.set(key, value);
    }
    this.values = undefined;
  }
}
