import 'jasmine';
import { Duration } from '../duration/duration.js';
import { Timestamp } from '../timestamp/timestamp.js';
/** Returns a Timestamp at the specified seconds after epoch. */
export declare function sec(sec: number): Timestamp;
/** Returns a Duration of the specified seconds. */
export declare function d(sec: number): Duration;
