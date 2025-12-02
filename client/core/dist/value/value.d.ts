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
export declare enum ValueType {
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
export declare function fromV(v: V, stringTable: string[]): Value | undefined;
/** An exported TimestampValue. */
export interface ExportedTimestamp {
    nanos: number;
    seconds: number;
}
/** The union of all Value export types. */
export type ExportedValue = {} | number | string | number[] | string[] | ExportedTimestamp;
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
    toV(stringTableBuilder?: StringTableBuilder): V | undefined;
    fold(other: Value, toggle: boolean, replace?: boolean): boolean;
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/** An empty Value. */
export declare class EmptyValue extends ReplaySubject<Value> implements Value {
    constructor();
    importFrom(): boolean;
    exportTo(): ExportedValue;
    toString(): string;
    val: null;
    toV(): V | undefined;
    fold(): boolean;
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/** A Value containing a string. */
export declare class StringValue extends ReplaySubject<Value> implements Value {
    private wrappedVal;
    constructor(wrappedVal: string);
    importFrom(sv: ExportedValue): boolean;
    exportTo(): ExportedValue;
    get val(): string;
    set val(wrappedString: string);
    toString(): string;
    toV(stringTableBuilder?: StringTableBuilder): V | undefined;
    fold(other: Value, toggle: boolean): boolean;
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/** A Value containing an ordered list of strings. */
export declare class StringListValue extends ReplaySubject<Value> implements Value {
    private wrappedStrings;
    constructor(wrappedStrings: string[]);
    importFrom(sv: ExportedValue): boolean;
    exportTo(): ExportedValue;
    get val(): string[];
    set val(wrappedStrings: string[]);
    toString(): string;
    toV(stringTableBuilder?: StringTableBuilder): V | undefined;
    fold(other: Value, toggle: boolean, replace?: boolean): boolean;
    comparable(other: Value): string[];
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/** A Value containing an unordered set of unique strings. */
export declare class StringSetValue extends ReplaySubject<Value> implements Value {
    private wrappedStrings;
    constructor(wrappedStrings: Set<string>);
    importFrom(sv: ExportedValue): boolean;
    exportTo(): ExportedValue;
    get val(): Set<string>;
    set val(wrappedStrings: Set<string>);
    toString(): string;
    toV(stringTableBuilder?: StringTableBuilder): V | undefined;
    fold(other: Value, toggle: boolean, replace?: boolean): boolean;
    comparable(other: Value): string[];
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/**
 * A Value containing an integer.  When set to non-integer numeric values, the
 * floor of the provided value is set.
 */
export declare class IntegerValue extends ReplaySubject<Value> implements Value {
    private wrappedInt;
    constructor(wrappedInt: number);
    importFrom(sv: ExportedValue): boolean;
    exportTo(): ExportedValue;
    get val(): number;
    set val(wrappedInt: number);
    toString(): string;
    toV(): V | undefined;
    fold(other: Value, toggle: boolean): boolean;
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/** A Value containing an ordered list of integers. */
export declare class IntegerListValue extends ReplaySubject<Value> implements Value {
    private wrappedInts;
    constructor(wrappedInts: number[]);
    importFrom(sv: ExportedValue): boolean;
    exportTo(): ExportedValue;
    get val(): number[];
    set val(wrappedInts: number[]);
    toString(): string;
    toV(): V | undefined;
    fold(other: Value, toggle: boolean, replace?: boolean): boolean;
    comparable(other: Value): number[];
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/** A Value containing an unordered set of unique integers. */
export declare class IntegerSetValue extends ReplaySubject<Value> implements Value {
    private wrappedInts;
    constructor(wrappedInts: Set<number>);
    importFrom(sv: ExportedValue): boolean;
    exportTo(): ExportedValue;
    get val(): Set<number>;
    set val(wrappedInts: Set<number>);
    toString(): string;
    toV(): V | undefined;
    fold(other: Value, toggle: boolean, replace?: boolean): boolean;
    comparable(other: Value): number[];
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/** A Value containing a double. */
export declare class DoubleValue extends ReplaySubject<Value> implements Value {
    private wrappedDbl;
    constructor(wrappedDbl: number);
    importFrom(sv: ExportedValue): boolean;
    exportTo(): ExportedValue;
    get val(): number;
    set val(wrappedDbl: number);
    toString(): string;
    toV(): V | undefined;
    fold(other: Value, toggle: boolean): boolean;
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/** A Value containing a duration. */
export declare class DurationValue extends ReplaySubject<Value> implements Value {
    private wrappedDur;
    constructor(wrappedDur: Duration);
    importFrom(sv: ExportedValue): boolean;
    exportTo(): ExportedValue;
    get val(): Duration;
    set val(wrappedDur: Duration);
    toString(): string;
    toV(): V | undefined;
    fold(other: Value, toggle: boolean): boolean;
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
/** A Value containing a high-resolution timestamp. */
export declare class TimestampValue extends ReplaySubject<Value> implements Value {
    private wrappedTs;
    constructor(wrappedTs: Timestamp);
    importFrom(sv: ExportedValue): boolean;
    exportTo(): ExportedValue;
    get val(): Timestamp;
    set val(wrappedTs: Timestamp);
    toString(): string;
    toV(): V | undefined;
    fold(other: Value, toggle: boolean): boolean;
    includes(other: Value): boolean;
    prefixOf(other: Value): boolean;
    compare(other: Value): number;
    typeName(): string;
}
