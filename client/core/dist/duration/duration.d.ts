/** A nanosecond-granularity duration. */
export declare class Duration {
    readonly nanos: number;
    constructor(nanos: number);
    add(duration: Duration): Duration;
    sub(other: Duration): Duration;
    /**
     * Returns a negative number, 0, or a positive number, if `this` is
     * respectively less than, equal to, or greater than the argument.
     */
    cmp(other: Duration): number;
    /** Formats `this` as a human-readable string. */
    toString(): string;
}
