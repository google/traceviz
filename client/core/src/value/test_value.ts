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
 * @fileoverview Test helpers for building TraceViz Values.
 */

import { DoubleValue, DurationValue, IntegerListValue, IntegerSetValue, IntegerValue, StringListValue, StringSetValue, StringTableBuilder, StringValue, TimestampValue, Value } from './value.js';
import { ValueMap } from './value_map.js';
import { Duration } from '../duration/duration.js';
import { Timestamp } from '../timestamp/timestamp.js';

/** Builds a StringValue. */
export function str(str: string): StringValue {
  return new StringValue(str);
}

/** Builds a StringListValue. */
export function strs(...strs: string[]): StringListValue {
  return new StringListValue(strs);
}

/** Builds a StringSetValue. */
export function strSet(...strs: string[]): StringSetValue {
  return new StringSetValue(new Set(strs));
}

/** Builds a IntegerValue. */
export function int(int: number): IntegerValue {
  return new IntegerValue(int);
}

/** Builds an IntegerListValue. */
export function ints(...ints: number[]): IntegerListValue {
  return new IntegerListValue(ints);
}

/** Builds an IntegerSetValue. */
export function intSet(...ints: number[]): IntegerSetValue {
  return new IntegerSetValue(new Set(ints));
}

/** Builds a DoubleValue. */
export function dbl(dbl: number): DoubleValue {
  return new DoubleValue(dbl);
}

/** Builds a DurationValue. */
export function dur(dur: Duration): DurationValue {
  return new DurationValue(dur);
}

/** Builds a TimestampValue. */
export function ts(ts: Timestamp): TimestampValue {
  return new TimestampValue(ts);
}

/**
 * Provides unique string-to-number mapping, enabling tests to construct
 * realistic server responses.
 */
class TestStringTableBuilder {
  readonly indicesByString = new Map<string, number>();

  constructor(readonly strs: string[] = []) {
    for (const [idx, str] of strs.entries()) {
      this.indicesByString.set(str, idx);
    }
  }

  /**
   * Returns the string index for the provided string, adding it to the string
   * table if needed.
   */
  index(str: string): number {
    let ret = this.indicesByString.get(str);
    if (ret === undefined) {
      ret = this.strs.length;
      this.strs.push(str);
      this.indicesByString.set(str, ret);
    }
    return ret;
  }

  /**
   * Returns the string table under construction.  A string's index is its
   * offset into the returned array.
   */
  strings(): string[] {
    return this.strs;
  }
}

/**
 * Builds a prepopulated StringTableBuilder to which more strings may be added.
 */
export function st(...strs: string[]): StringTableBuilder {
  return new TestStringTableBuilder(strs);
}

/** Builds a ValueMap from an array of key/value pairs. */
export function valueMap(...props: Array<{ key: string, val: Value }>): ValueMap {
  const valMap = new Map<string, Value>();
  for (const prop of props) {
    valMap.set(prop.key, prop.val);
  }
  return new ValueMap(valMap);
}
