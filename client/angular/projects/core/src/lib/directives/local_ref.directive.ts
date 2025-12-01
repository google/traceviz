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
 * @fileoverview A local reference directive.
 */

import {Directive, forwardRef, Input} from '@angular/core';
import {ConfigurationError, Severity, Value, ValueMap} from '@google/traceviz-client-core';

import {ValueDirective} from './value.directive';

const SOURCE = 'local_ref.directive';

/** A reference to a Value in the calling component. */
@Directive({
  selector: 'local-ref',
  providers: [
    {provide: ValueDirective, useExisting: forwardRef(() => LocalRefDirective)}
  ],
})
export class LocalRefDirective extends ValueDirective {
  @Input() key = '';

  get(localState: ValueMap|undefined): Value|undefined {
    if (localState == null) {
      throw new ConfigurationError(
          `Can't look up local reference with no local ValueMap`)
          .at(Severity.FATAL)
          .from(SOURCE);
    }
    if (!localState.has(this.key)) {
      return undefined;
    }
    return localState.get(this.key);
  }

  label(): string {
    return `local value '${this.key}'`;
  }
}
