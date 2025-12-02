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
 * @fileoverview Values are configuration values (filters, selections, and so
 * on) which can multicast changes to subscribers.  They are generally
 * associated with string keys.
 */
import { ReplaySubject } from 'rxjs';
import { Duration } from '../duration/duration.js';
import { Timestamp } from '../timestamp/timestamp.js';
/**
 * The different types a backend Value may hold.
 *
 * Note that while all frontend Value types can convert to a corresponding
 * backend Value type, and vice-versa, the set of distinct Value types supported
 * in the backend and frontend are different.  Specifically:
 *   * the frontend has 'set' variants of repeated Value types (string and
 *     integer) for which order is unimportant and repeated values are dropped.
 *     These are sent to the backend as regular repeated Value types.
 *   * the backend has 'string index' variants of string Value types (string and
 *     strings) which are encoded as indexes into the full response's string
 *     table.  These are converted to the corresponding native String type upon
 *     decoding in the frontend.
 */
export var ValueType;
(function (ValueType) {
    ValueType[ValueType["UNSET"] = 0] = "UNSET";
    ValueType[ValueType["STRING"] = 1] = "STRING";
    ValueType[ValueType["STRING_INDEX"] = 2] = "STRING_INDEX";
    ValueType[ValueType["STRINGS"] = 3] = "STRINGS";
    ValueType[ValueType["STRING_INDICES"] = 4] = "STRING_INDICES";
    ValueType[ValueType["INTEGER"] = 5] = "INTEGER";
    ValueType[ValueType["INTEGERS"] = 6] = "INTEGERS";
    ValueType[ValueType["DOUBLE"] = 7] = "DOUBLE";
    ValueType[ValueType["DURATION"] = 8] = "DURATION";
    ValueType[ValueType["TIMESTAMP"] = 9] = "TIMESTAMP";
})(ValueType || (ValueType = {}));
/**
 * Returns a Value from the provided V object, or undefined if no such
 * conversion is possible.  The provided stringTable is used to dereference
 * string-type values provided as string table indices; this stringTable should
 * generally come from the backend Data response.
 */
export function fromV(v, stringTable) {
    switch (v[0]) {
        case ValueType.STRING:
            return new StringValue(v[1]);
        case ValueType.STRING_INDEX:
            return new StringValue(stringTable[v[1]]);
        case ValueType.STRINGS:
            return new StringListValue(v[1]);
        case ValueType.STRING_INDICES:
            return new StringListValue(v[1].map((idx) => stringTable[idx]));
        case ValueType.INTEGER:
            return new IntegerValue(v[1]);
        case ValueType.INTEGERS:
            return new IntegerListValue(v[1]);
        case ValueType.DOUBLE:
            return new DoubleValue(v[1]);
        case ValueType.DURATION:
            return new DurationValue(new Duration(v[1]));
        case ValueType.TIMESTAMP:
            const parts = v[1];
            return new TimestampValue(new Timestamp(parts[0], parts[1]));
        default:
            return undefined;
    }
}
/**
 * Folds otherVal into thisVal, returning the result of the fold.  For more
 * information about fold, see the Value interface.
 */
function foldList(thisVal, otherVal, replace, toggle) {
    if (toggle) {
        if (thisVal.length === otherVal.length) {
            let equal = true;
            for (let i = 0; i < thisVal.length; i++) {
                if (thisVal[i] !== otherVal[i]) {
                    equal = false;
                }
            }
            if (equal) {
                return [];
            }
        }
    }
    if (replace) {
        return otherVal;
    }
    else {
        return thisVal.concat(otherVal);
    }
}
/**
 * Folds otherVal into thisVal, returning the result of the fold.  For more
 * information about fold, see the Value interface.
 */
function foldSet(thisVal, otherVal, replace, toggle) {
    if (replace) {
        // Replace replaces thisVal with other.val, unless thisVal == otherVal
        // and toggle is true, in which case it clears thisVal.
        if (toggle && (thisVal.size === otherVal.size)) {
            let equal = true;
            for (const v of thisVal) {
                if (!otherVal.has(v)) {
                    equal = false;
                }
            }
            if (equal) {
                return new Set([]);
            }
        }
        return otherVal;
    }
    if (toggle) {
        // Construct a new Set to avoid mutating thisVal.
        const newVal = new Set(thisVal);
        for (const v of otherVal) {
            if (thisVal.has(v)) {
                newVal.delete(v);
            }
            else {
                newVal.add(v);
            }
        }
        return newVal;
    }
    const newVal = thisVal;
    for (const v of otherVal) {
        newVal.add(v);
    }
    return newVal;
}
/** An empty Value. */
export class EmptyValue extends ReplaySubject {
    constructor() {
        super(1);
        this.next(this);
    }
    importFrom() {
        return true;
    }
    exportTo() {
        return {};
    }
    toString() {
        return '';
    }
    val = null;
    toV() {
        return undefined;
    }
    fold() {
        return false;
    }
    includes(other) {
        return other instanceof EmptyValue;
    }
    prefixOf(other) {
        return false;
    }
    compare(other) {
        return this.includes(other) ? 0 : 1;
    }
    typeName() {
        return 'empty';
    }
}
/** A Value containing a string. */
export class StringValue extends ReplaySubject {
    wrappedVal;
    constructor(wrappedVal) {
        super(1);
        this.wrappedVal = wrappedVal;
        this.next(this);
    }
    importFrom(sv) {
        if (typeof sv === 'string') {
            this.val = sv;
            return true;
        }
        return false;
    }
    exportTo() {
        return this.val;
    }
    get val() {
        return this.wrappedVal;
    }
    set val(wrappedString) {
        if (wrappedString !== this.wrappedVal) {
            this.wrappedVal = wrappedString;
            this.next(this);
        }
    }
    toString() {
        return this.wrappedVal;
    }
    toV(stringTableBuilder) {
        if (stringTableBuilder === undefined) {
            return [
                ValueType.STRING,
                encodeURIComponent(this.val),
            ];
        }
        return [
            ValueType.STRING_INDEX,
            stringTableBuilder.index(encodeURIComponent(this.val)),
        ];
    }
    fold(other, toggle) {
        if (other instanceof EmptyValue) {
            this.val = '';
        }
        else if (other instanceof StringValue) {
            this.val = ((this.val === other.val) && toggle) ? '' : other.val;
        }
        else {
            return false;
        }
        return true;
    }
    includes(other) {
        return this.compare(other) === 0;
    }
    prefixOf(other) {
        if (other instanceof StringValue) {
            return other.val.startsWith(this.val);
        }
        return false;
    }
    compare(other) {
        if (other instanceof StringValue) {
            return this.val.localeCompare(other.val);
        }
        else if (other instanceof EmptyValue) {
            return this.val.localeCompare('');
        }
        else {
            return 1;
        }
    }
    typeName() {
        return 'string';
    }
}
/** A Value containing an ordered list of strings. */
export class StringListValue extends ReplaySubject {
    wrappedStrings;
    constructor(wrappedStrings) {
        super(1);
        this.wrappedStrings = wrappedStrings;
        this.next(this);
    }
    importFrom(sv) {
        if (Array.isArray(sv)) {
            const v = [];
            for (const n of sv) {
                if (typeof n !== 'string') {
                    return false;
                }
                v.push(n);
            }
            this.val = v;
            return true;
        }
        return false;
    }
    exportTo() {
        return this.val;
    }
    get val() {
        return Array.from(this.wrappedStrings);
    }
    set val(wrappedStrings) {
        let update = false;
        if ((wrappedStrings.length !== this.wrappedStrings.length)) {
            update = true;
        }
        else {
            for (let idx = 0; idx < wrappedStrings.length; idx++) {
                if (wrappedStrings[idx] !== this.wrappedStrings[idx]) {
                    update = true;
                    break;
                }
            }
        }
        if (update) {
            this.wrappedStrings = wrappedStrings;
            this.next(this);
        }
    }
    toString() {
        return `[${this.wrappedStrings.join(', ')}]`;
    }
    toV(stringTableBuilder) {
        if (stringTableBuilder === undefined) {
            return [
                ValueType.STRINGS,
                Array.from(this.val),
            ];
        }
        return [
            ValueType.STRING_INDICES,
            Array.from(this.val.map((str) => stringTableBuilder.index(str))),
        ];
    }
    fold(other, toggle, replace = true) {
        let otherVal;
        if (other instanceof EmptyValue) {
            this.val = [];
            return true;
        }
        else if (other instanceof StringValue) {
            otherVal = [other.val];
        }
        else if (other instanceof StringListValue) {
            otherVal = other.val;
        }
        else {
            return false;
        }
        this.val = foldList(this.val, otherVal, replace, toggle);
        return true;
    }
    comparable(other) {
        if (other instanceof StringValue) {
            return [other.val];
        }
        else if (other instanceof StringListValue) {
            return other.val;
        }
        else {
            return [];
        }
    }
    includes(other) {
        const otherVal = this.comparable(other);
        if (this.val.length !== otherVal.length) {
            return false;
        }
        for (let idx = 0; idx < this.val.length; idx++) {
            if (otherVal[idx] !== this.val[idx]) {
                return false;
            }
        }
        return true;
    }
    prefixOf(other) {
        if (other instanceof StringListValue) {
            return this.val.every((element, index) => {
                return element === other.val[index];
            });
        }
        return false;
    }
    // String lists A and B compare:
    //   <0 if A has fewer entries than B, or
    //   >0 if B has fewer entries than A, or
    //   <0 if for the leftmost different position P, A[P] compares less than
    //      B[P], or
    //   >0 if for the leftmost different position P, A[P] compares greater than
    //      B[P], or
    //   0 if there is no different position.
    compare(other) {
        if (other instanceof EmptyValue) {
            return this.val.length - 0;
        }
        const otherVal = this.comparable(other);
        if (this.val.length !== otherVal.length) {
            return this.val.length - otherVal.length;
        }
        for (let idx = 0; idx < this.val.length; idx++) {
            const cmp = this.val[idx].localeCompare(otherVal[idx]);
            if (cmp !== 0) {
                return cmp;
            }
        }
        return 0;
    }
    typeName() {
        return 'string list';
    }
}
/** A Value containing an unordered set of unique strings. */
export class StringSetValue extends ReplaySubject {
    wrappedStrings;
    constructor(wrappedStrings) {
        super(1);
        this.wrappedStrings = wrappedStrings;
        this.next(this);
    }
    importFrom(sv) {
        if (Array.isArray(sv)) {
            const v = new Set();
            for (const n of sv) {
                if (typeof n !== 'string') {
                    return false;
                }
                v.add(n);
            }
            this.val = v;
            return true;
        }
        return false;
    }
    exportTo() {
        return Array.from(this.val);
    }
    get val() {
        return this.wrappedStrings;
    }
    set val(wrappedStrings) {
        let update = false;
        if (wrappedStrings.size !== this.wrappedStrings.size) {
            update = true;
        }
        else {
            for (const str of wrappedStrings) {
                if (!this.wrappedStrings.has(str)) {
                    update = true;
                    break;
                }
            }
        }
        if (update) {
            this.wrappedStrings = wrappedStrings;
            this.next(this);
        }
    }
    toString() {
        return `{${Array.from(this.wrappedStrings).sort().join(', ')}}`;
    }
    toV(stringTableBuilder) {
        if (stringTableBuilder === undefined) {
            return [
                ValueType.STRINGS,
                Array.from(this.val).sort(),
            ];
        }
        return [
            ValueType.STRING_INDICES,
            Array.from(this.val).map((str) => stringTableBuilder.index(str)),
        ];
    }
    fold(other, toggle, replace = true) {
        let otherVal;
        if (other instanceof EmptyValue) {
            this.val = new Set([]);
            return true;
        }
        else if (other instanceof StringValue) {
            otherVal = new Set([other.val]);
        }
        else if (other instanceof StringListValue) {
            otherVal = new Set(other.val);
        }
        else if (other instanceof StringSetValue) {
            otherVal = other.val;
        }
        else {
            return false;
        }
        this.val = foldSet(this.val, otherVal, replace, toggle);
        return true;
    }
    // Returns the elements in other as a sorted array of strings, if possible.
    comparable(other) {
        if (other instanceof StringValue) {
            return [other.val];
        }
        else if (other instanceof StringListValue) {
            return Array.from(other.val).sort();
        }
        else if (other instanceof StringSetValue) {
            return Array.from(other.val).sort();
        }
        else {
            return [];
        }
    }
    includes(other) {
        const otherVal = this.comparable(other);
        for (const v of otherVal) {
            if (!this.val.has(v)) {
                return false;
            }
        }
        return true;
    }
    prefixOf(other) {
        return false;
    }
    // String sets A and B compare:
    //   <0 if A has fewer entries than B, or
    //   >0 if B has fewer entries than A, or
    //   <0 if for the leftmost different position P, A[P] compares less than
    //      B[P], or
    //   >0 if for the leftmost different position P, A[P] compares greater than
    //      B[P], or
    //   0 if there is no different position.
    compare(other) {
        if (other instanceof EmptyValue) {
            return this.val.size - 0;
        }
        const otherVal = this.comparable(other);
        const thisVal = this.comparable(this);
        if (thisVal.length !== otherVal.length) {
            return thisVal.length - otherVal.length;
        }
        for (let idx = 0; idx < thisVal.length; idx++) {
            const cmp = thisVal[idx].localeCompare(otherVal[idx]);
            if (cmp !== 0) {
                return cmp;
            }
        }
        return 0;
    }
    typeName() {
        return 'string set';
    }
}
/**
 * A Value containing an integer.  When set to non-integer numeric values, the
 * floor of the provided value is set.
 */
export class IntegerValue extends ReplaySubject {
    wrappedInt;
    constructor(wrappedInt) {
        super(1);
        this.wrappedInt = wrappedInt;
        this.wrappedInt = Math.floor(this.wrappedInt);
        this.next(this);
    }
    importFrom(sv) {
        if (typeof sv === 'number') {
            this.val = sv;
            return true;
        }
        return false;
    }
    exportTo() {
        return this.val;
    }
    get val() {
        return this.wrappedInt;
    }
    set val(wrappedInt) {
        wrappedInt = Math.floor(wrappedInt);
        if (wrappedInt !== this.wrappedInt) {
            this.wrappedInt = wrappedInt;
            this.next(this);
        }
    }
    toString() {
        return this.wrappedInt.toString();
    }
    toV() {
        return [
            ValueType.INTEGER,
            this.val,
        ];
    }
    fold(other, toggle) {
        if (other instanceof EmptyValue) {
            this.val = 0;
        }
        else if (other instanceof IntegerValue) {
            this.val = ((this.val === other.val) && toggle) ? 0 : other.val;
        }
        else {
            return false;
        }
        return true;
    }
    includes(other) {
        return this.compare(other) === 0;
    }
    prefixOf(other) {
        return false;
    }
    compare(other) {
        if (other instanceof EmptyValue) {
            return this.val - 0;
        }
        else if (other instanceof IntegerValue) {
            return this.val - other.val;
        }
        else {
            return 1;
        }
    }
    typeName() {
        return 'integer';
    }
}
/** A Value containing an ordered list of integers. */
export class IntegerListValue extends ReplaySubject {
    wrappedInts;
    constructor(wrappedInts) {
        super(1);
        this.wrappedInts = wrappedInts;
        this.wrappedInts =
            this.wrappedInts.map(wrappedInt => Math.floor(wrappedInt));
        this.next(this);
    }
    importFrom(sv) {
        if (Array.isArray(sv)) {
            const v = [];
            for (const n of sv) {
                if (typeof n !== 'number') {
                    return false;
                }
                v.push(n);
            }
            this.val = v;
            return true;
        }
        return false;
    }
    exportTo() {
        return this.val;
    }
    get val() {
        return Array.from(this.wrappedInts);
    }
    set val(wrappedInts) {
        wrappedInts = wrappedInts.map(wrappedInt => Math.floor(wrappedInt));
        let update = false;
        if ((wrappedInts.length !== this.wrappedInts.length)) {
            update = true;
        }
        else {
            for (let idx = 0; idx < wrappedInts.length; idx++) {
                if (wrappedInts[idx] !== this.wrappedInts[idx]) {
                    update = true;
                    break;
                }
            }
        }
        if (update) {
            this.wrappedInts = wrappedInts;
            this.next(this);
        }
    }
    toString() {
        return `[${this.wrappedInts.map(wrappedInt => wrappedInt.toString()).join(', ')}]`;
    }
    toV() {
        return [
            ValueType.INTEGERS,
            Array.from(this.val),
        ];
    }
    fold(other, toggle, replace = true) {
        let otherVal;
        if (other instanceof EmptyValue) {
            this.val = [];
            return true;
        }
        else if (other instanceof IntegerValue) {
            otherVal = [other.val];
        }
        else if (other instanceof IntegerListValue) {
            otherVal = other.val;
        }
        else {
            return false;
        }
        this.val = foldList(this.val, otherVal, replace, toggle);
        return true;
    }
    comparable(other) {
        if (other instanceof IntegerValue) {
            return [other.val];
        }
        else if (other instanceof IntegerListValue) {
            return other.val;
        }
        else {
            return [];
        }
    }
    includes(other) {
        const otherVal = this.comparable(other);
        if (this.val.length !== otherVal.length) {
            return false;
        }
        for (let idx = 0; idx < this.val.length; idx++) {
            if (otherVal[idx] !== this.val[idx]) {
                return false;
            }
        }
        return true;
    }
    prefixOf(other) {
        if (other instanceof IntegerListValue) {
            return this.val.every((element, index) => {
                return element === other.val[index];
            });
        }
        return false;
    }
    // Integer lists A and B compare:
    //   <0 if A has fewer entries than B, or
    //   >0 if B has fewer entries than A, or
    //   <0 if for the leftmost different position P, A[P] compares less than
    //      B[P], or
    //   >0 if for the leftmost different position P, A[P] compares greater than
    //      B[P], or
    //   0 if there is no different position.
    compare(other) {
        if (other instanceof EmptyValue) {
            return this.val.length - 0;
        }
        const otherVal = this.comparable(other);
        if (this.val.length !== otherVal.length) {
            return this.val.length - otherVal.length;
        }
        for (let idx = 0; idx < this.val.length; idx++) {
            const cmp = this.val[idx] - otherVal[idx];
            if (cmp !== 0) {
                return cmp;
            }
        }
        return 0;
    }
    typeName() {
        return 'integer list';
    }
}
/** A Value containing an unordered set of unique integers. */
export class IntegerSetValue extends ReplaySubject {
    wrappedInts = new Set();
    constructor(wrappedInts) {
        super(1);
        for (const wrappedInt of wrappedInts) {
            this.wrappedInts.add(Math.floor(wrappedInt));
        }
        this.next(this);
    }
    importFrom(sv) {
        if (Array.isArray(sv)) {
            const v = new Set();
            for (const n of sv) {
                if (typeof n !== 'number') {
                    return false;
                }
                v.add(n);
            }
            this.val = v;
            return true;
        }
        return false;
    }
    exportTo() {
        return Array.from(this.val);
    }
    get val() {
        return this.wrappedInts;
    }
    set val(wrappedInts) {
        let update = false;
        if (wrappedInts.size !== this.wrappedInts.size) {
            update = true;
        }
        else {
            const newWrappedInts = new Set();
            for (const wrappedInt of wrappedInts) {
                const newWrappedInt = Math.floor(wrappedInt);
                if (!this.wrappedInts.has(newWrappedInt)) {
                    update = true;
                }
                newWrappedInts.add(newWrappedInt);
            }
            wrappedInts = newWrappedInts;
        }
        if (update) {
            this.wrappedInts = wrappedInts;
            this.next(this);
        }
    }
    toString() {
        return `{${Array.from(this.wrappedInts)
            .map(wrappedInt => wrappedInt.toString())
            .join(', ')}}`;
    }
    toV() {
        return [
            ValueType.INTEGERS,
            Array.from(this.val).sort(),
        ];
    }
    fold(other, toggle, replace = true) {
        let otherVal;
        if (other instanceof EmptyValue) {
            this.val = new Set([]);
            return true;
        }
        else if (other instanceof IntegerValue) {
            otherVal = new Set([other.val]);
        }
        else if (other instanceof IntegerListValue) {
            otherVal = new Set(other.val);
        }
        else if (other instanceof IntegerSetValue) {
            otherVal = other.val;
        }
        else {
            return false;
        }
        this.val = foldSet(this.val, otherVal, replace, toggle);
        return true;
    }
    // Returns the elements in other as a sorted array of strings, if possible.
    comparable(other) {
        if (other instanceof IntegerValue) {
            return [other.val];
        }
        else if (other instanceof IntegerListValue) {
            return Array.from(other.val).sort();
        }
        else if (other instanceof IntegerSetValue) {
            return Array.from(other.val).sort();
        }
        else {
            return [];
        }
    }
    includes(other) {
        const otherVal = this.comparable(other);
        for (const v of otherVal) {
            if (!this.val.has(v)) {
                return false;
            }
        }
        return true;
    }
    prefixOf(other) {
        return false;
    }
    // Integer sets A and B compare:
    //   <0 if A has fewer entries than B, or
    //   >0 if B has fewer entries than A, or
    //   <0 if for the leftmost different position P, A[P] compares less than
    //      B[P], or
    //   >0 if for the leftmost different position P, A[P] compares greater than
    //      B[P], or
    //   0 if there is no different position.
    compare(other) {
        if (other instanceof EmptyValue) {
            return this.val.size - 0;
        }
        const otherVal = this.comparable(other);
        const thisVal = this.comparable(this);
        if (thisVal.length !== otherVal.length) {
            return thisVal.length - otherVal.length;
        }
        for (let idx = 0; idx < thisVal.length; idx++) {
            const cmp = thisVal[idx] - otherVal[idx];
            if (cmp !== 0) {
                return cmp;
            }
        }
        return 0;
    }
    typeName() {
        return 'integer set';
    }
}
/** A Value containing a double. */
export class DoubleValue extends ReplaySubject {
    wrappedDbl;
    constructor(wrappedDbl) {
        super(1);
        this.wrappedDbl = wrappedDbl;
        this.next(this);
    }
    importFrom(sv) {
        if (typeof sv === 'number') {
            this.val = sv;
            return true;
        }
        return false;
    }
    exportTo() {
        return this.val;
    }
    get val() {
        return this.wrappedDbl;
    }
    set val(wrappedDbl) {
        if (wrappedDbl !== this.wrappedDbl) {
            this.wrappedDbl = wrappedDbl;
            this.next(this);
        }
    }
    toString() {
        return this.wrappedDbl.toString();
    }
    toV() {
        return [
            ValueType.DOUBLE,
            this.val,
        ];
    }
    fold(other, toggle) {
        if (other instanceof EmptyValue) {
            this.val = 0;
        }
        else if (other instanceof DoubleValue) {
            this.val = ((this.val === other.val) && toggle) ? 0 : other.val;
        }
        else {
            return false;
        }
        return true;
    }
    includes(other) {
        return this.compare(other) === 0;
    }
    prefixOf(other) {
        return false;
    }
    compare(other) {
        if (other instanceof EmptyValue) {
            return this.val - 0;
        }
        else if (other instanceof DoubleValue) {
            return this.val - other.val;
        }
        else {
            return 1;
        }
    }
    typeName() {
        return 'double';
    }
}
/** A Value containing a duration. */
export class DurationValue extends ReplaySubject {
    wrappedDur;
    constructor(wrappedDur) {
        super(1);
        this.wrappedDur = wrappedDur;
        this.next(this);
    }
    importFrom(sv) {
        if (typeof sv === 'number') {
            this.val = new Duration(sv);
            return true;
        }
        return false;
    }
    exportTo() {
        return this.val.nanos;
    }
    get val() {
        return this.wrappedDur;
    }
    set val(wrappedDur) {
        if (wrappedDur.cmp(this.wrappedDur) !== 0) {
            this.wrappedDur = wrappedDur;
            this.next(this);
        }
    }
    toString() {
        return this.wrappedDur.toString();
    }
    toV() {
        return [
            ValueType.DURATION,
            this.val.nanos,
        ];
    }
    fold(other, toggle) {
        if (other instanceof EmptyValue) {
            this.val = new Duration(0);
        }
        else if (other instanceof DurationValue) {
            this.val = ((this.val.cmp(other.val) === 0) && toggle) ? new Duration(0) :
                other.val;
        }
        else {
            return false;
        }
        return true;
    }
    includes(other) {
        return this.compare(other) === 0;
    }
    prefixOf(other) {
        return false;
    }
    compare(other) {
        if (other instanceof DurationValue) {
            return this.val.cmp(other.val);
        }
        else if (other instanceof EmptyValue) {
            return this.val.nanos - 0;
        }
        return 1;
    }
    typeName() {
        return 'duration';
    }
}
/** A Value containing a high-resolution timestamp. */
export class TimestampValue extends ReplaySubject {
    wrappedTs;
    constructor(wrappedTs) {
        super(1);
        this.wrappedTs = wrappedTs;
        this.next(this);
    }
    importFrom(sv) {
        if (sv != null && typeof sv === 'object' && 'seconds' in sv &&
            'nanos' in sv) {
            this.val = new Timestamp(sv.seconds, sv.nanos);
            return true;
        }
        return false;
    }
    exportTo() {
        return {
            nanos: this.val.nanos,
            seconds: this.val.seconds,
        };
    }
    get val() {
        return this.wrappedTs;
    }
    set val(wrappedTs) {
        if (wrappedTs.cmp(this.wrappedTs) !== 0) {
            this.wrappedTs = wrappedTs;
            this.next(this);
        }
    }
    toString() {
        return this.wrappedTs.toDate().toISOString();
    }
    toV() {
        return [
            ValueType.TIMESTAMP,
            [this.val.seconds, this.val.nanos],
        ];
    }
    fold(other, toggle) {
        if (other instanceof EmptyValue) {
            this.val = new Timestamp(0, 0);
        }
        else if (other instanceof TimestampValue) {
            this.val = ((this.val.cmp(other.val) === 0) && toggle) ?
                new Timestamp(0, 0) :
                other.val;
        }
        else {
            return false;
        }
        return true;
    }
    includes(other) {
        return this.compare(other) === 0;
    }
    prefixOf(other) {
        return false;
    }
    compare(other) {
        if (other instanceof TimestampValue) {
            return this.val.cmp(other.val);
        }
        else if (other instanceof EmptyValue) {
            return this.val.cmp(new Timestamp(0, 0));
        }
        return 1;
    }
    typeName() {
        return 'timestamp';
    }
}
//# sourceMappingURL=value.js.map