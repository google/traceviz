import { Observable } from 'rxjs';
import { Duration } from '../duration/duration.js';
import { Timestamp } from '../timestamp/timestamp.js';
import { ExportedValue, StringTableBuilder, V, Value } from './value.js';
/** Type created when turning a ValueMap into JSON. */
export interface ExportedKeyValueMap {
    [key: string]: ExportedValue;
}
/**
 * A serializable type representing an entry in a value map.
 */
export type KV = [number | string, V];
/**
 * A read-only (string) key-to-Value mapping, such as a <value-map> in a
 * TraceViz template.
 */
export declare class ValueMap {
    private readonly map;
    constructor(props?: KV[] | Map<string, Value>, stringTable?: string[]);
    toVMap(stringTableBuilder?: StringTableBuilder): {
        [k: string]: V;
    };
    exportKeyValueMap(): ExportedKeyValueMap;
    updateFromExportedKeyValueMap(update: ExportedKeyValueMap): void;
    entries(): IterableIterator<[string, Value]>;
    values(): IterableIterator<Value>;
    keys(): IterableIterator<string>;
    get size(): number;
    has(key: string): boolean;
    get(key: string): Value;
    expectString(key: string): string;
    expectStringList(key: string): string[];
    expectNumber(key: string): number;
    expectIntegerList(key: string): number[];
    expectTimestamp(key: string): Timestamp;
    expectDuration(key: string): Duration;
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
    format(fmtString: string): string;
    /**
     * Returns a ValueMap containing all entries in the receiver except
     * those whose keys are provided.
     */
    without(...keys: string[]): ValueMap;
    with(...entries: Array<[string, Value]>): ValueMap;
    /**
     * Returns an Observable that sends the receiver when any contained Value
     * changes.  When first subscribed, this observable will update once for each
     * member of the receiving map.
     */
    watch(): Observable<ValueMap>;
    /**
     * Returns a new ValueMap unioning the receiver and the argument.  If the same
     * key maps to different values in the unioned maps, throws a
     * ConfigurationError.
     */
    static union(...vms: ValueMap[]): ValueMap;
}
