/**
 * @fileoverview A set of tools for working with deferred-evaluation references
 * to Values.
 */
import { Value } from './value.js';
import { ValueMap } from './value_map.js';
/** A reference to a Value. */
export interface ValueRef {
    get(localState: ValueMap | undefined): Value | undefined;
    label(): string;
}
/**
 * A reference to a 'local' value: one whose definition varies in different
 * local contexts, represented as distinct ValueMaps.  For example, each row in
 * a table could have its own local properties in a ValueMap, and `new
 * LocalValue('ID')` would support access to each row's ID.
 */
export declare class LocalValue implements ValueRef {
    private readonly key;
    constructor(key: string);
    get(localState: ValueMap | undefined): Value | undefined;
    label(): string;
}
/** A reference to a fixed value: one whose definition never changes. */
export declare class FixedValue implements ValueRef {
    private readonly val;
    private readonly name;
    constructor(val: Value, name?: string);
    get(localState: ValueMap | undefined): Value | undefined;
    label(): string;
}
/** A reference to a value with a key. */
export interface KeyedValueRef extends ValueRef {
    key: string;
}
/** A keyed map of ValueRefs. */
export declare class ValueRefMap {
    private readonly refMap;
    constructor(refMap: KeyedValueRef[]);
    get(localState: ValueMap | undefined): ValueMap | undefined;
}
