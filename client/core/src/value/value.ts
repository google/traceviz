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

import {ReplaySubject} from 'rxjs';

import {Duration} from '../duration/duration.js';
import {Timestamp} from '../timestamp/timestamp.js';

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
export enum ValueType {
  UNSET = 0,
  STRING = 1,
  STRING_INDEX = 2,
  STRINGS = 3,
  STRING_INDICES = 4,
  INTEGER = 5,
  INTEGERS = 6,
  DOUBLE = 7,
  DURATION = 8,
  TIMESTAMP = 9
}

/**
 * Represents a single Value expressed in JSON.
 */
export type V = [ValueType, unknown];

/**
 * Extended by types that provide a unique string-to-number mapping.  Mapping
 * frequently-duplicated strings reduces data size.
 */
export interface StringTableBuilder {
  index(str: string): number;
  strings(): string[];
}

/**
 * Returns a Value from the provided V object, or undefined if no such
 * conversion is possible.  The provided stringTable is used to dereference
 * string-type values provided as string table indices; this stringTable should
 * generally come from the backend Data response.
 */
export function fromV(v: V, stringTable: string[]): Value|undefined {
  switch (v[0]) {
    case ValueType.STRING:
      return new StringValue(v[1] as string);
    case ValueType.STRING_INDEX:
      return new StringValue(stringTable[v[1] as number]);
    case ValueType.STRINGS:
      return new StringListValue(v[1] as string[]);
    case ValueType.STRING_INDICES:
      return new StringListValue(
          (v[1] as number[]).map((idx) => stringTable[idx]));
    case ValueType.INTEGER:
      return new IntegerValue(v[1] as number);
    case ValueType.INTEGERS:
      return new IntegerListValue(v[1] as number[]);
    case ValueType.DOUBLE:
      return new DoubleValue(v[1] as number);
    case ValueType.DURATION:
      return new DurationValue(new Duration(v[1] as number));
    case ValueType.TIMESTAMP:
      const parts = v[1] as number[];
      return new TimestampValue(new Timestamp(parts[0], parts[1]));
    default:
      return undefined;
  }
}

/**
 * Folds otherVal into thisVal, returning the result of the fold.  For more
 * information about fold, see the Value interface.
 */
function foldList<V>(
    thisVal: V[], otherVal: V[], replace: boolean, toggle: boolean): V[] {
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
  } else {
    return thisVal.concat(otherVal);
  }
}

/**
 * Folds otherVal into thisVal, returning the result of the fold.  For more
 * information about fold, see the Value interface.
 */
function foldSet<V>(
    thisVal: Set<V>, otherVal: Set<V>, replace: boolean,
    toggle: boolean): Set<V> {
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
        return new Set<V>([]);
      }
    }
    return otherVal;
  }
  if (toggle) {
    // Construct a new Set to avoid mutating thisVal.
    const newVal = new Set<V>(thisVal);
    for (const v of otherVal) {
      if (thisVal.has(v)) {
        newVal.delete(v);
      } else {
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

/** An exported TimestampValue. */
export interface ExportedTimestamp {
  nanos: number;
  seconds: number;
}

/** The union of all Value export types. */
export type ExportedValue = {}|number|string|number[]|string[]|
    ExportedTimestamp;

/**
 * Extended by types containing a subscribable and updatable datum.  This file
 * includes implementations for (at least) all distinct backend Value types.
 * Value serves as the medium of communication to and from a TraceViz backend,
 * and via a global key-Value mapping, the medium of all intra-frontend
 * communication.
 */
export interface Value extends ReplaySubject<Value> {
  importFrom(exportedValue: ExportedValue): boolean;
  exportTo(): ExportedValue;
  toString(): string;
  toV(stringTableBuilder?: StringTableBuilder): V|undefined;
  // fold folds `other`'s Value into the receiver's, returning false if this
  // cannot be done due to incompatible types.
  //
  // The `toggle` argument specifies whether the receiver should be cleared if
  // its value and `other`'s value are equal.
  //
  // The `replace` argument specifies whether `other`'s Value should replace the
  // receiver's.  For scalar Value types, this is ignored and assumed true; for
  // non-scalar Value types, if `replace` is false, `other` is folded into the
  // receiver; how this is done depends on the receiver's type.
  //
  // fold's options support updating Values from other Values via UI
  // interactions.  For example:
  //
  // - EFFECT ------------------------- OTHER VALUE --------- TOGGLE -- REPLACE
  // * replacing value V with other    : V.fold(U,            false,    true)
  //   value U
  // * extending list V with list U    : V.fold(U,            false,    false)
  // * toggling item U in set V        : V.fold(U,            true,     false)
  // * replacing V with U, but         : V.fold(U,            true,     true)
  //   clearing if already equal
  // * clearing V                      : V.fold(EmptyValue(), false,    true)
  fold(other: Value, toggle: boolean, replace?: boolean): boolean;
  // includes returns true if the receiver's Value includes `other`'s Value.
  // For scalars, inclusion implies equality; generally, if
  // a.includes(b) && b.includes(a), a and b are equal.
  includes(other: Value): boolean;
  // prefixOf returns true if the receiver's Value is a prefix of `other`.
  // Returns false for EmptyValue, scalars, and mismatched types.
  prefixOf(other: Value): boolean;
  // compare returns >0, 0, or <0 if the receiver compares less than, equal to,
  // or greater than `other`. If the two are incomparable, they should return a
  // nonzero value.
  compare(other: Value): number;
  // typeName returns the name of the type the receiver contains. It should
  // only be used for documentation.
  typeName(): string;
}

/** An empty Value. */
export class EmptyValue extends ReplaySubject<Value> implements Value {
  constructor() {
    super(1);
    this.next(this);
  }

  importFrom(): boolean {
    return true;
  }

  exportTo(): ExportedValue {
    return {};
  }

  override toString(): string {
    return '';
  }

  val: null = null;

  toV(): V|undefined {
    return undefined;
  }

  fold(): boolean {
    return false;
  }

  includes(other: Value): boolean {
    return other instanceof EmptyValue;
  }

  prefixOf(other: Value): boolean {
    return false;
  }

  compare(other: Value): number {
    return this.includes(other) ? 0 : 1;
  }

  typeName(): string {
    return 'empty';
  }
}

/** A Value containing a string. */
export class StringValue extends ReplaySubject<Value> implements Value {
  constructor(private wrappedVal: string) {
    super(1);
    this.next(this);
  }

  importFrom(sv: ExportedValue): boolean {
    if (typeof sv === 'string') {
      this.val = sv;
      return true;
    }
    return false;
  }

  exportTo(): ExportedValue {
    return this.val;
  }

  get val(): string {
    return this.wrappedVal;
  }

  set val(wrappedString: string) {
    if (wrappedString !== this.wrappedVal) {
      this.wrappedVal = wrappedString;
      this.next(this);
    }
  }

  override toString(): string {
    return this.wrappedVal;
  }

  toV(stringTableBuilder?: StringTableBuilder): V|undefined {
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

  fold(other: Value, toggle: boolean): boolean {
    if (other instanceof EmptyValue) {
      this.val = '';
    } else if (other instanceof StringValue) {
      this.val = ((this.val === other.val) && toggle) ? '' : other.val;
    } else {
      return false;
    }
    return true;
  }

  includes(other: Value): boolean {
    return this.compare(other) === 0;
  }

  prefixOf(other: Value): boolean {
    if (other instanceof StringValue) {
      return other.val.startsWith(this.val);
    }
    return false;
  }

  compare(other: Value): number {
    if (other instanceof StringValue) {
      return this.val.localeCompare(other.val);
    } else if (other instanceof EmptyValue) {
      return this.val.localeCompare('');
    } else {
      return 1;
    }
  }

  typeName(): string {
    return 'string';
  }
}

/** A Value containing an ordered list of strings. */
export class StringListValue extends ReplaySubject<Value> implements Value {
  constructor(private wrappedStrings: string[]) {
    super(1);
    this.next(this);
  }

  importFrom(sv: ExportedValue): boolean {
    if (Array.isArray(sv)) {
      const v: string[] = [];
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

  exportTo(): ExportedValue {
    return this.val;
  }

  get val(): string[] {
    return Array.from(this.wrappedStrings);
  }

  set val(wrappedStrings: string[]) {
    let update = false;
    if ((wrappedStrings.length !== this.wrappedStrings.length)) {
      update = true;
    } else {
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

  override toString(): string {
    return `[${this.wrappedStrings.join(', ')}]`;
  }

  toV(stringTableBuilder?: StringTableBuilder): V|undefined {
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

  fold(other: Value, toggle: boolean, replace = true): boolean {
    let otherVal: string[];
    if (other instanceof EmptyValue) {
      this.val = [];
      return true;
    } else if (other instanceof StringValue) {
      otherVal = [other.val];
    } else if (other instanceof StringListValue) {
      otherVal = other.val;
    } else {
      return false;
    }
    this.val = foldList<string>(this.val, otherVal, replace, toggle);
    return true;
  }

  comparable(other: Value): string[] {
    if (other instanceof StringValue) {
      return [other.val];
    } else if (other instanceof StringListValue) {
      return other.val;
    } else {
      return [];
    }
  }

  includes(other: Value): boolean {
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

  prefixOf(other: Value): boolean {
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
  compare(other: Value): number {
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

  typeName(): string {
    return 'string list';
  }
}

/** A Value containing an unordered set of unique strings. */
export class StringSetValue extends ReplaySubject<Value> implements Value {
  constructor(private wrappedStrings: Set<string>) {
    super(1);
    this.next(this);
  }

  importFrom(sv: ExportedValue): boolean {
    if (Array.isArray(sv)) {
      const v = new Set<string>();
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

  exportTo(): ExportedValue {
    return Array.from(this.val);
  }

  get val(): Set<string> {
    return this.wrappedStrings;
  }

  set val(wrappedStrings: Set<string>) {
    let update = false;
    if (wrappedStrings.size !== this.wrappedStrings.size) {
      update = true;
    } else {
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

  override toString(): string {
    return `{${Array.from(this.wrappedStrings).sort().join(', ')}}`;
  }

  toV(stringTableBuilder?: StringTableBuilder): V|undefined {
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

  fold(other: Value, toggle: boolean, replace = true): boolean {
    let otherVal: Set<string>;
    if (other instanceof EmptyValue) {
      this.val = new Set<string>([]);
      return true;
    } else if (other instanceof StringValue) {
      otherVal = new Set<string>([other.val]);
    } else if (other instanceof StringListValue) {
      otherVal = new Set<string>(other.val);
    } else if (other instanceof StringSetValue) {
      otherVal = other.val;
    } else {
      return false;
    }
    this.val = foldSet<string>(this.val, otherVal, replace, toggle);
    return true;
  }

  // Returns the elements in other as a sorted array of strings, if possible.
  comparable(other: Value): string[] {
    if (other instanceof StringValue) {
      return [other.val];
    } else if (other instanceof StringListValue) {
      return Array.from(other.val).sort();
    } else if (other instanceof StringSetValue) {
      return Array.from(other.val).sort();
    } else {
      return [];
    }
  }

  includes(other: Value): boolean {
    const otherVal = this.comparable(other);
    for (const v of otherVal) {
      if (!this.val.has(v)) {
        return false;
      }
    }
    return true;
  }

  prefixOf(other: Value): boolean {
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
  compare(other: Value): number {
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

  typeName(): string {
    return 'string set';
  }
}


/**
 * A Value containing an integer.  When set to non-integer numeric values, the
 * floor of the provided value is set.
 */
export class IntegerValue extends ReplaySubject<Value> implements Value {
  constructor(private wrappedInt: number) {
    super(1);
    this.wrappedInt = Math.floor(this.wrappedInt);
    this.next(this);
  }

  importFrom(sv: ExportedValue): boolean {
    if (typeof sv === 'number') {
      this.val = sv;
      return true;
    }
    return false;
  }

  exportTo(): ExportedValue {
    return this.val;
  }

  get val(): number {
    return this.wrappedInt;
  }

  set val(wrappedInt: number) {
    wrappedInt = Math.floor(wrappedInt);
    if (wrappedInt !== this.wrappedInt) {
      this.wrappedInt = wrappedInt;
      this.next(this);
    }
  }

  override toString(): string {
    return this.wrappedInt.toString();
  }

  toV(): V|undefined {
    return [
      ValueType.INTEGER,
      this.val,
    ];
  }

  fold(other: Value, toggle: boolean): boolean {
    if (other instanceof EmptyValue) {
      this.val = 0;
    } else if (other instanceof IntegerValue) {
      this.val = ((this.val === other.val) && toggle) ? 0 : other.val;
    } else {
      return false;
    }
    return true;
  }

  includes(other: Value): boolean {
    return this.compare(other) === 0;
  }

  prefixOf(other: Value): boolean {
    return false;
  }

  compare(other: Value): number {
    if (other instanceof EmptyValue) {
      return this.val - 0;
    } else if (other instanceof IntegerValue) {
      return this.val - other.val;
    } else {
      return 1;
    }
  }

  typeName(): string {
    return 'integer';
  }
}

/** A Value containing an ordered list of integers. */
export class IntegerListValue extends ReplaySubject<Value> implements Value {
  constructor(private wrappedInts: number[]) {
    super(1);
    this.wrappedInts =
        this.wrappedInts.map(wrappedInt => Math.floor(wrappedInt));
    this.next(this);
  }

  importFrom(sv: ExportedValue): boolean {
    if (Array.isArray(sv)) {
      const v: number[] = [];
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

  exportTo(): ExportedValue {
    return this.val;
  }

  get val(): number[] {
    return Array.from(this.wrappedInts);
  }

  set val(wrappedInts: number[]) {
    wrappedInts = wrappedInts.map(wrappedInt => Math.floor(wrappedInt));
    let update = false;
    if ((wrappedInts.length !== this.wrappedInts.length)) {
      update = true;
    } else {
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

  override toString(): string {
    return `[${
        this.wrappedInts.map(wrappedInt => wrappedInt.toString()).join(', ')}]`;
  }

  toV(): V|undefined {
    return [
      ValueType.INTEGERS,
      Array.from(this.val),
    ];
  }

  fold(other: Value, toggle: boolean, replace = true): boolean {
    let otherVal: number[];
    if (other instanceof EmptyValue) {
      this.val = [];
      return true;
    } else if (other instanceof IntegerValue) {
      otherVal = [other.val];
    } else if (other instanceof IntegerListValue) {
      otherVal = other.val;
    } else {
      return false;
    }
    this.val = foldList<number>(this.val, otherVal, replace, toggle);
    return true;
  }

  comparable(other: Value): number[] {
    if (other instanceof IntegerValue) {
      return [other.val];
    } else if (other instanceof IntegerListValue) {
      return other.val;
    } else {
      return [];
    }
  }

  includes(other: Value): boolean {
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

  prefixOf(other: Value): boolean {
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
  compare(other: Value): number {
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

  typeName(): string {
    return 'integer list';
  }
}

/** A Value containing an unordered set of unique integers. */
export class IntegerSetValue extends ReplaySubject<Value> implements Value {
  private wrappedInts = new Set<number>();
  constructor(wrappedInts: Set<number>) {
    super(1);
    for (const wrappedInt of wrappedInts) {
      this.wrappedInts.add(Math.floor(wrappedInt));
    }
    this.next(this);
  }

  importFrom(sv: ExportedValue): boolean {
    if (Array.isArray(sv)) {
      const v = new Set<number>();
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

  exportTo(): ExportedValue {
    return Array.from(this.val);
  }

  get val(): Set<number> {
    return this.wrappedInts;
  }

  set val(wrappedInts: Set<number>) {
    let update = false;
    if (wrappedInts.size !== this.wrappedInts.size) {
      update = true;
    } else {
      const newWrappedInts = new Set<number>();
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

  override toString(): string {
    return `{${
        Array.from(this.wrappedInts)
            .map(wrappedInt => wrappedInt.toString())
            .join(', ')}}`;
  }

  toV(): V|undefined {
    return [
      ValueType.INTEGERS,
      Array.from(this.val).sort(),
    ];
  }

  fold(other: Value, toggle: boolean, replace = true): boolean {
    let otherVal: Set<number>;
    if (other instanceof EmptyValue) {
      this.val = new Set<number>([]);
      return true;
    } else if (other instanceof IntegerValue) {
      otherVal = new Set<number>([other.val]);
    } else if (other instanceof IntegerListValue) {
      otherVal = new Set<number>(other.val);
    } else if (other instanceof IntegerSetValue) {
      otherVal = other.val;
    } else {
      return false;
    }
    this.val = foldSet<number>(this.val, otherVal, replace, toggle);
    return true;
  }

  // Returns the elements in other as a sorted array of strings, if possible.
  comparable(other: Value): number[] {
    if (other instanceof IntegerValue) {
      return [other.val];
    } else if (other instanceof IntegerListValue) {
      return Array.from(other.val).sort();
    } else if (other instanceof IntegerSetValue) {
      return Array.from(other.val).sort();
    } else {
      return [];
    }
  }

  includes(other: Value): boolean {
    const otherVal = this.comparable(other);
    for (const v of otherVal) {
      if (!this.val.has(v)) {
        return false;
      }
    }
    return true;
  }

  prefixOf(other: Value): boolean {
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
  compare(other: Value): number {
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

  typeName(): string {
    return 'integer set';
  }
}

/** A Value containing a double. */
export class DoubleValue extends ReplaySubject<Value> implements Value {
  constructor(private wrappedDbl: number) {
    super(1);
    this.next(this);
  }

  importFrom(sv: ExportedValue): boolean {
    if (typeof sv === 'number') {
      this.val = sv;
      return true;
    }
    return false;
  }

  exportTo(): ExportedValue {
    return this.val;
  }

  get val(): number {
    return this.wrappedDbl;
  }

  set val(wrappedDbl: number) {
    if (wrappedDbl !== this.wrappedDbl) {
      this.wrappedDbl = wrappedDbl;
      this.next(this);
    }
  }

  override toString(): string {
    return this.wrappedDbl.toString();
  }

  toV(): V|undefined {
    return [
      ValueType.DOUBLE,
      this.val,
    ];
  }

  fold(other: Value, toggle: boolean): boolean {
    if (other instanceof EmptyValue) {
      this.val = 0;
    } else if (other instanceof DoubleValue) {
      this.val = ((this.val === other.val) && toggle) ? 0 : other.val;
    } else {
      return false;
    }
    return true;
  }

  includes(other: Value): boolean {
    return this.compare(other) === 0;
  }

  prefixOf(other: Value): boolean {
    return false;
  }

  compare(other: Value): number {
    if (other instanceof EmptyValue) {
      return this.val - 0;
    } else if (other instanceof DoubleValue) {
      return this.val - other.val;
    } else {
      return 1;
    }
  }

  typeName(): string {
    return 'double';
  }
}

/** A Value containing a duration. */
export class DurationValue extends ReplaySubject<Value> implements Value {
  constructor(private wrappedDur: Duration) {
    super(1);
    this.next(this);
  }

  importFrom(sv: ExportedValue): boolean {
    if (typeof sv === 'number') {
      this.val = new Duration(sv);
      return true;
    }
    return false;
  }

  exportTo(): ExportedValue {
    return this.val.nanos;
  }

  get val(): Duration {
    return this.wrappedDur;
  }

  set val(wrappedDur: Duration) {
    if (wrappedDur.cmp(this.wrappedDur) !== 0) {
      this.wrappedDur = wrappedDur;
      this.next(this);
    }
  }

  override toString(): string {
    return this.wrappedDur.toString();
  }

  toV(): V|undefined {
    return [
      ValueType.DURATION,
      this.val.nanos,
    ];
  }

  fold(other: Value, toggle: boolean) {
    if (other instanceof EmptyValue) {
      this.val = new Duration(0);
    } else if (other instanceof DurationValue) {
      this.val = ((this.val.cmp(other.val) === 0) && toggle) ? new Duration(0) :
                                                               other.val;
    } else {
      return false;
    }
    return true;
  }

  includes(other: Value): boolean {
    return this.compare(other) === 0;
  }

  prefixOf(other: Value): boolean {
    return false;
  }

  compare(other: Value): number {
    if (other instanceof DurationValue) {
      return this.val.cmp(other.val);
    } else if (other instanceof EmptyValue) {
      return this.val.nanos - 0;
    }
    return 1;
  }

  typeName(): string {
    return 'duration';
  }
}

/** A Value containing a high-resolution timestamp. */
export class TimestampValue extends ReplaySubject<Value> implements Value {
  constructor(private wrappedTs: Timestamp) {
    super(1);
    this.next(this);
  }

  importFrom(sv: ExportedValue): boolean {
    if (sv != null && typeof sv === 'object' && 'seconds' in sv &&
        'nanos' in sv) {
      this.val = new Timestamp(sv.seconds, sv.nanos);
      return true;
    }
    return false;
  }

  exportTo(): ExportedValue {
    return {
      nanos: this.val.nanos,
      seconds: this.val.seconds,
    };
  }

  get val(): Timestamp {
    return this.wrappedTs;
  }

  set val(wrappedTs: Timestamp) {
    if (wrappedTs.cmp(this.wrappedTs) !== 0) {
      this.wrappedTs = wrappedTs;
      this.next(this);
    }
  }

  override toString(): string {
    return this.wrappedTs.toDate().toISOString();
  }

  toV(): V|undefined {
    return [
      ValueType.TIMESTAMP,
      [this.val.seconds, this.val.nanos],
    ];
  }

  fold(other: Value, toggle: boolean) {
    if (other instanceof EmptyValue) {
      this.val = new Timestamp(0, 0);
    } else if (other instanceof TimestampValue) {
      this.val = ((this.val.cmp(other.val) === 0) && toggle) ?
          new Timestamp(0, 0) :
          other.val;
    } else {
      return false;
    }
    return true;
  }

  includes(other: Value): boolean {
    return this.compare(other) === 0;
  }

  prefixOf(other: Value): boolean {
    return false;
  }

  compare(other: Value): number {
    if (other instanceof TimestampValue) {
      return this.val.cmp(other.val);
    } else if (other instanceof EmptyValue) {
      return this.val.cmp(new Timestamp(0, 0));
    }
    return 1;
  }

  typeName(): string {
    return 'timestamp';
  }
}
