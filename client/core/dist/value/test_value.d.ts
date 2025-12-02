/**
 * @fileoverview Test helpers for building TraceViz Values.
 */
import { Duration } from '../duration/duration.js';
import { Timestamp } from '../timestamp/timestamp.js';
import { DoubleValue, DurationValue, IntegerListValue, IntegerSetValue, IntegerValue, StringListValue, StringSetValue, StringTableBuilder, StringValue, TimestampValue, Value } from './value.js';
import { ValueMap } from './value_map.js';
/** Builds a StringValue. */
export declare function str(str: string): StringValue;
/** Builds a StringListValue. */
export declare function strs(...strs: string[]): StringListValue;
/** Builds a StringSetValue. */
export declare function strSet(...strs: string[]): StringSetValue;
/** Builds a IntegerValue. */
export declare function int(int: number): IntegerValue;
/** Builds an IntegerListValue. */
export declare function ints(...ints: number[]): IntegerListValue;
/** Builds an IntegerSetValue. */
export declare function intSet(...ints: number[]): IntegerSetValue;
/** Builds a DoubleValue. */
export declare function dbl(dbl: number): DoubleValue;
/** Builds a DurationValue. */
export declare function dur(dur: Duration): DurationValue;
/** Builds a TimestampValue. */
export declare function ts(ts: Timestamp): TimestampValue;
/**
 * Builds a prepopulated StringTableBuilder to which more strings may be added.
 */
export declare function st(...strs: string[]): StringTableBuilder;
/** Builds a ValueMap from an array of key/value pairs. */
export declare function valueMap(...props: Array<{
    key: string;
    val: Value;
}>): ValueMap;
