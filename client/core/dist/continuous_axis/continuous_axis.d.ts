import { Category } from '../category/category.js';
import { ValueMap } from '../value/value_map.js';
/** Supported axis types. */
export declare enum AxisType {
    TIMESTAMP = "timestamp",
    DURATION = "duration",
    DOUBLE = "double"
}
/** The set of properties used to define an axis. */
export declare const axisProperties: string[];
/** Represents an axis with a domain of type T. */
export declare class Axis<T> {
    readonly type: AxisType;
    readonly category: Category;
    readonly min: T;
    readonly max: T;
    readonly value: (properties: ValueMap, key: string) => T;
    readonly dist: (a: T, b: T) => number;
    constructor(type: AxisType, category: Category, min: T, max: T, value: (properties: ValueMap, key: string) => T, dist: (a: T, b: T) => number);
    static fromProperties<T>(properties: ValueMap, value: (properties: ValueMap, key: string) => T, dist: (a: T, b: T) => number): Axis<T>;
    union(other: Axis<unknown>): Axis<T>;
    valueToDomainFraction(properties: ValueMap, key: string): number;
    toDomainFraction(val: T): number;
    contains(val: T): boolean;
}
/**
 * Returns a double, Duration, or Timestamp axis from the provided properties.
 */
export declare function getAxis(properties: ValueMap): Axis<unknown>;
