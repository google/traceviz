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
 * @fileoverview A set of tools for working with deferred-evaluation references
 * to Values.
 */

import {Value} from './value.js';
import {ValueMap} from './value_map.js';

/** A reference to a Value. */
export interface ValueRef {
  get(localState: ValueMap|undefined): Value|undefined;
  label(): string;
}

/**
 * A reference to a 'local' value: one whose definition varies in different
 * local contexts, represented as distinct ValueMaps.  For example, each row in
 * a table could have its own local properties in a ValueMap, and `new
 * LocalValue('ID')` would support access to each row's ID.
 */
export class LocalValue implements ValueRef {
  constructor(private readonly key: string) { }

  get(localState: ValueMap|undefined): Value|undefined {
    if (localState===undefined||!localState.has(this.key)) {
      return undefined;
    }
    return localState.get(this.key);
  }

  label(): string {
    return `local value '${this.key}'`;
  }
}

/** A reference to a fixed value: one whose definition never changes. */
export class FixedValue implements ValueRef {
  constructor(private readonly val: Value, private readonly name='') {
  }

  get(localState: ValueMap|undefined): Value|undefined {
    return this.val;
  }

  label(): string {
    return `value '${this.name}'`;
  }
}

/** A reference to a value with a key. */
export interface KeyedValueRef extends ValueRef {
  key: string;
}

/** A keyed map of ValueRefs. */
export class ValueRefMap {
  constructor(private readonly refMap: KeyedValueRef[]) { }

  get(localState: ValueMap|undefined): ValueMap|undefined {
    const ret=new Map<string, Value>();
    for (const keyedValueRef of this.refMap) {
      const val=keyedValueRef.get(localState);
      if (val!==undefined) {
        ret.set(keyedValueRef.key, val);
      }
    }
    return new ValueMap(ret);
  }
}
