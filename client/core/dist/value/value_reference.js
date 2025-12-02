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
import { ValueMap } from './value_map.js';
/**
 * A reference to a 'local' value: one whose definition varies in different
 * local contexts, represented as distinct ValueMaps.  For example, each row in
 * a table could have its own local properties in a ValueMap, and `new
 * LocalValue('ID')` would support access to each row's ID.
 */
export class LocalValue {
    key;
    constructor(key) {
        this.key = key;
    }
    get(localState) {
        if (localState === undefined || !localState.has(this.key)) {
            return undefined;
        }
        return localState.get(this.key);
    }
    label() {
        return `local value '${this.key}'`;
    }
}
/** A reference to a fixed value: one whose definition never changes. */
export class FixedValue {
    val;
    name;
    constructor(val, name = '') {
        this.val = val;
        this.name = name;
    }
    get(localState) {
        return this.val;
    }
    label() {
        return `value '${this.name}'`;
    }
}
/** A keyed map of ValueRefs. */
export class ValueRefMap {
    refMap;
    constructor(refMap) {
        this.refMap = refMap;
    }
    get(localState) {
        const ret = new Map();
        for (const keyedValueRef of this.refMap) {
            const val = keyedValueRef.get(localState);
            if (val !== undefined) {
                ret.set(keyedValueRef.key, val);
            }
        }
        return new ValueMap(ret);
    }
}
//# sourceMappingURL=value_reference.js.map