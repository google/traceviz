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

import { Duration } from '../duration/duration.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { Timestamp } from '../timestamp/timestamp.js';
import { DoubleValue, DurationValue, ExportedValue, fromV, IntegerListValue, IntegerValue, StringListValue, StringTableBuilder, StringValue, TimestampValue, V, Value } from './value.js';
import { merge, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

const SOURCE = 'value_map';

/** Type created when turning a ValueMap into JSON. */
export interface ExportedKeyValueMap {
  [key: string]: ExportedValue;
}

export type KV = [number | string, V];

/**
 * A read-only (string) key-to-Value mapping, such as a <value-map> in a
 * TraceViz template.
 */
export class ValueMap {
  private readonly map: ReadonlyMap<string, Value>;

  constructor(
    props: KV[] | Map<string, Value> = new Map<string, Value>([]),
    stringTable: string[] = []) {
    let map = new Map<string, Value>();
    if (props instanceof Map<string, Value>) {
      map = props;
    } else if (props instanceof Array<KV>) {
      for (const kv of props) {
        const key = (typeof kv[0] === 'string') ? kv[0] : stringTable[kv[0]];
        const value = fromV(kv[1], stringTable);
        if (value === undefined) {
          throw new ConfigurationError(
            `value with key '${key}' can't be parsed`)
            .from(SOURCE)
            .at(Severity.ERROR);
        }
        map.set(key, value);
      }
    } else {
      map = new Map();
    }
    this.map = map;
  }

  toVMap(stringTableBuilder?: StringTableBuilder): object {
    if (stringTableBuilder === undefined) {
      const ret = new Map<string, V>([]);
      for (const [k, v] of this.map) {
        const gotV = v.toV();
        if (gotV !== undefined) {
          ret.set(k, gotV);
        }
      }
      return Object.fromEntries(ret);
    }
    const ret = new Map<number, V>([]);
    for (const [k, v] of this.map) {
      const gotV = v.toV();
      if (gotV !== undefined) {
        console.log(`writing key ${k} to ${v}`);
        ret.set(stringTableBuilder.index(k), gotV);
      }
    }
    return Object.fromEntries(ret);
  }

  exportKeyValueMap(): ExportedKeyValueMap {
    const serializedValues: ExportedKeyValueMap = {};
    for (const [key, value] of this.map.entries()) {
      serializedValues[key] = value.exportTo();
    }
    return serializedValues;
  }

  updateFromExportedKeyValueMap(update: ExportedKeyValueMap) {
    for (const [key, exportedValue] of Object.entries(update)) {
      if (!this.has(key)) {
        throw new ConfigurationError(
          `can't update ValueMap from JSON: missing key ${key}`)
          .from(SOURCE)
          .at(Severity.ERROR);
      }
      const val = this.get(key);
      if (!val.importFrom(exportedValue)) {
        throw new ConfigurationError(`can't update value ${key} from JSON`)
          .from(SOURCE)
          .at(Severity.ERROR);
      }
    }
  }

  entries(): IterableIterator<[string, Value]> {
    return this.map.entries();
  }

  values(): IterableIterator<Value> {
    return this.map.values();
  }

  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  get size(): number {
    return this.map.size;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): Value {
    const ret = this.map.get(key);
    if (ret === undefined) {
      throw new ConfigurationError(`no value with key '${key}'`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    return ret;
  }

  expectString(key: string): string {
    const val = this.get(key);
    if (val instanceof StringValue) {
      return val.val;
    }
    throw new ConfigurationError(`no string-type value with key '${key}'`)
      .from(SOURCE)
      .at(Severity.ERROR);
  }

  expectStringList(key: string): string[] {
    const val = this.get(key);
    if (val instanceof StringListValue) {
      return val.val;
    }
    throw new ConfigurationError(`no string list-type value with key '${key}'`)
      .from(SOURCE)
      .at(Severity.ERROR);
  }

  expectNumber(key: string): number {
    const val = this.get(key);
    if (val instanceof IntegerValue || val instanceof DoubleValue) {
      return val.val;
    }
    throw new ConfigurationError(`no number-type value with key '${key}'`)
      .from(SOURCE)
      .at(Severity.ERROR);
  }

  expectIntegerList(key: string): number[] {
    const val = this.get(key);
    if (val instanceof IntegerListValue) {
      return val.val;
    }
    throw new ConfigurationError(`no integer list-type value with key '${key}'`)
      .from(SOURCE)
      .at(Severity.ERROR);
  }

  expectTimestamp(key: string): Timestamp {
    const val = this.get(key);
    if (val instanceof TimestampValue) {
      return val.val;
    }
    throw new ConfigurationError(`no timestamp-type value with key '${key}'`)
      .from(SOURCE)
      .at(Severity.ERROR);
  }

  expectDuration(key: string): Duration {
    const val = this.get(key);
    if (val instanceof DurationValue) {
      return val.val;
    }
    throw new ConfigurationError(`no duration-type value with key '${key}'`)
      .from(SOURCE)
      .at(Severity.ERROR);
  }

  /**
   * Applies a provided format string to a key-Value mapping, returning the
   * resultant formatted string.
   * The returned string is the same as the provided format string, except:
   *   * literal `$$` is replaced with `$`,
   *   * a literal `$(`, followed by a property key (a string over the
   * characters a-z, A-Z, _, -, and 0-9), followed by a literal `)`, is replaced
   * with the string representation of the Value associated with that key in the
   *     provided properties mapping.
   * A single `$` in the format string *must be* followed with a parenthesized
   * property key.
   *
   * format throws an error if the format string is ill-formed, or if a property
   * key is specified in the format string that does not exist in the provided
   * properties mapping.
   */
  format(fmtString: string): string {
    // re captures all text before a literal $ or the end of the input, then
    // optionally either two adjacent literal $s (which should be replaced with
    // a single $) or a $ followed a valid property key (which should be
    // replaced with that key's value.)
    //
    //          +--- Anchoring at the start of the string
    //          |+-- Matching all text before a '$'
    //          ||       +-- Matching a '$$' or a '$<propName>'
    //          ||       |                            +-- Matching remainder.
    //          vv       v                            v
    const re = /^([^$]*)(\$\$|\$\([a-zA-Z_\-0-9]+\))?((.|\n)*)/;
    let ret = '';
    let formatRemainder: string = fmtString;
    while (true) {
      const matches = formatRemainder.match(re);
      if (matches === null) {
        break;
      }
      // If neither of the first two capture groups found anything, then the
      // format is ill-formed.
      if (!matches[1] && !matches[2]) {
        throw new ConfigurationError(
          `format string '${fmtString}' is ill-formed`)
          .from(SOURCE)
          .at(Severity.ERROR);
      }
      // Append everything before a $ unmodified.
      ret = ret + matches[1];
      if (matches[2] === '$$') {
        // Replace '$$' with a literal '$'.
        ret = ret + '$';
      } else if (!!matches[2]) {
        // Replace '$<propname>' with keysToValues[propName].toString()
        const propName = matches[2].slice(2, -1);
        const val = this.map.get(propName);
        if (val === undefined) {
          throw new ConfigurationError(
            `required property '${propName}' is not present in Datum`)
            .from(SOURCE)
            .at(Severity.ERROR);
        } else {
          ret = ret + val.toString();
        }
      }
      // Repeat on the remainder of the string.
      if (!matches[3]?.length) {
        // If there is no matches[3], or it's empty, we're done.
        break;
      }
      formatRemainder = matches[3];
    }
    return ret;
  }

  /**
   * Returns a ValueMap containing all entries in the receiver except
   * those whose keys are provided.
   */
  without(...keys: string[]): ValueMap {
    const excludedKeys = new Set(keys);
    const newMap = new Map<string, Value>();
    for (const [key, value] of this.map) {
      if (!excludedKeys.has(key)) {
        newMap.set(key, value);
      }
    }
    return new ValueMap(newMap);
  }

  with(...entries: Array<[string, Value]>): ValueMap {
    const combinedMapEntries = [...this.map.entries(), ...entries];
    return new ValueMap(new Map<string, Value>(combinedMapEntries));
  }

  /**
   * Returns an Observable that sends the receiver when any contained Value
   * changes.  When first subscribed, this observable will update once for each
   * member of the receiving map.
   */
  watch(): Observable<ValueMap> {
    return merge(...this.values())
      .pipe(map(() => this));
  }

  /**
   * Returns a new ValueMap unioning the receiver and the argument.  If the same
   * key maps to different values in the unioned maps, throws a
   * ConfigurationError.
   */
  static union(...vms: ValueMap[]): ValueMap {
    if (vms.length < 2) {
      throw new Error(`ValueMap.union requires at least two ValueMaps`);
    }
    const newMap = new Map<string, Value>();
    for (const [key, value] of vms[0].map) {
      newMap.set(key, value);
    }
    for (let idx = 1; idx < vms.length; idx++) {
      for (const [key, value] of vms[idx].map) {
        const existingVal = newMap.get(key);
        if (existingVal !== undefined && existingVal.compare(value) !== 0) {
          throw new ConfigurationError(
            `can't union ValueMaps: key ${key} maps to different values ${value} and ${existingVal}`)
            .from(SOURCE)
            .at(Severity.ERROR);
        }
        if (existingVal === undefined) {
          newMap.set(key, value);
        }
      }
    }
    return new ValueMap(newMap);
  }
}
