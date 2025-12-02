/**
 * @fileoverview A type representing a fine-granularity trace timestamp.
 */
import { Duration } from '../duration/duration.js';
/**
 * JS's native Date type has millisecond resolution, whereas trace data is at
 * nanosecond resolution.  This Timestamp type supports nanosecond resolution
 * and duration-offset
 */
export declare class Timestamp {
    readonly seconds: number;
    readonly nanos: number;
    constructor(seconds: number, nanos: number);
    static fromDate(date: Date): Timestamp;
    add(duration: Duration): Timestamp;
    sub(other: Timestamp): Duration;
    /**
     * Returns `this` as a JS Date object.  This conversion loses nanosecond
     * granularity.
     */
    toDate(): Date;
    /**
     * Returns a negative number, 0, or a positive number, if `this` is
     * respectively less than, equal to, or greater than the argument.
     */
    cmp(other: Timestamp): number;
}
