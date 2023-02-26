/**
 * @fileoverview A type representing a fine-granularity trace timestamp.
 */

import {Duration} from '../duration/duration';

const NANOS_PER_SECOND = 1000000000.0;

/**
 * JS's native Date type has millisecond resolution, whereas trace data is at
 * nanosecond resolution.  This Timestamp type supports nanosecond resolution
 * and duration-offset
 */
export class Timestamp {
  constructor(readonly seconds: number, readonly nanos: number) {
    this.seconds += Math.floor(this.nanos / NANOS_PER_SECOND);
    this.nanos = this.nanos % NANOS_PER_SECOND;
  }

  static fromDate(date: Date): Timestamp {
    const dateMs = date.getTime();
    return new Timestamp(Math.floor(dateMs / 1000), (dateMs % 1000) * 1000000);
  }

  add(duration: Duration): Timestamp {
    return new Timestamp(this.seconds, this.nanos + duration.nanos);
  }

  sub(other: Timestamp): Duration {
    return new Duration(
        (this.seconds - other.seconds) * NANOS_PER_SECOND + this.nanos -
        other.nanos);
  }

  /**
   * Returns `this` as a JS Date object.  This conversion loses nanosecond
   * granularity.
   */
  toDate(): Date {
    return new Date((this.seconds + (this.nanos / NANOS_PER_SECOND)) * 1000.0);
  }

  /**
   * Returns a negative number, 0, or a positive number, if `this` is
   * respectively less than, equal to, or greater than the argument.
   */
  cmp(other: Timestamp): number {
    if (this.seconds === other.seconds) {
      return this.nanos - other.nanos;
    }
    return this.seconds - other.seconds;
  }
}
