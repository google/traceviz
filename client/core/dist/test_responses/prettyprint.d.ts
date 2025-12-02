/**
 * @fileoverview A test-only package for pretty-printing TraceViz frontend
 * response types.
 */
import { Category } from '../category/category.js';
import { Axis } from '../continuous_axis/continuous_axis.js';
import { Timestamp } from '../timestamp/timestamp.js';
import { Trace } from '../trace/trace.js';
/** Returns a Timestamp at the specified seconds after epoch. */
export declare function sec(sec: number): Timestamp;
/** Pretty-prints the provided category for testing. */
export declare function prettyPrintCategory(category: Category): string;
/** Pretty-prints the provided axis for testing. */
export declare function prettyPrintAxis<T>(axis: Axis<T>): string;
/** Pretty-prints the provided trace for testing. */
export declare function prettyPrintTrace<T>(trace: Trace<T>, prefix?: string): string;
