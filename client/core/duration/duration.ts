/**
 * @fileoverview A type representing a fine-granularity trace duration.
 */

const NANOS_PER_SECOND = 1000000000;

/** A nanosecond-granularity duration. */
export class Duration {
  constructor(readonly nanos: number) {}

  add(duration: Duration): Duration {
    return new Duration(this.nanos + duration.nanos);
  }

  sub(other: Duration): Duration {
    return new Duration(this.nanos - other.nanos);
  }

  /**
   * Returns a negative number, 0, or a positive number, if `this` is
   * respectively less than, equal to, or greater than the argument.
   */
  cmp(other: Duration): number {
    return this.nanos - other.nanos;
  }

  /** Formats `this` as a human-readable string. */
  toString(): string {
    if (Math.abs(this.nanos) < 1000) {
      return `${this.nanos}ns`;
    } else if (Math.abs(this.nanos) < (1000*1000)) {
      return `${(this.nanos/1000.0).toFixed(3)}μs`;
    } else if (Math.abs(this.nanos) < NANOS_PER_SECOND) {
      return `${(this.nanos/1000000.0).toFixed(3)}ms`;
    } else if (Math.abs(this.nanos) < (NANOS_PER_SECOND*60)) {
      return `${(this.nanos/NANOS_PER_SECOND).toFixed(3)}s`;
    } else if (Math.abs(this.nanos) < (NANOS_PER_SECOND*60*60)) {
      return `${(this.nanos/(60*NANOS_PER_SECOND)).toFixed(3)}m`;
    } else {
      return `${(this.nanos/(60*60*NANOS_PER_SECOND)).toFixed(3)}h`;
    }
  }
}
