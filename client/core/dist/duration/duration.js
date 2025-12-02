/*
        Copyright 2023 Google Inc.
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
                https://www.apache.org/licenses/LICENSE-2.0
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
*/
/**
 * @fileoverview A type representing a fine-granularity trace duration.
 */
const NANOS_PER_SECOND = 1000000000;
/** A nanosecond-granularity duration. */
export class Duration {
    nanos;
    constructor(nanos) {
        this.nanos = nanos;
    }
    add(duration) {
        return new Duration(this.nanos + duration.nanos);
    }
    sub(other) {
        return new Duration(this.nanos - other.nanos);
    }
    /**
     * Returns a negative number, 0, or a positive number, if `this` is
     * respectively less than, equal to, or greater than the argument.
     */
    cmp(other) {
        return this.nanos - other.nanos;
    }
    /** Formats `this` as a human-readable string. */
    toString() {
        if (Math.abs(this.nanos) < 1000) {
            return `${this.nanos}ns`;
        }
        else if (Math.abs(this.nanos) < (1000 * 1000)) {
            return `${(this.nanos / 1000.0).toFixed(3)}μs`;
        }
        else if (Math.abs(this.nanos) < NANOS_PER_SECOND) {
            return `${(this.nanos / 1000000.0).toFixed(3)}ms`;
        }
        else if (Math.abs(this.nanos) < (NANOS_PER_SECOND * 60)) {
            return `${(this.nanos / NANOS_PER_SECOND).toFixed(3)}s`;
        }
        else if (Math.abs(this.nanos) < (NANOS_PER_SECOND * 60 * 60)) {
            return `${(this.nanos / (60 * NANOS_PER_SECOND)).toFixed(3)}m`;
        }
        else {
            return `${(this.nanos / (60 * 60 * NANOS_PER_SECOND)).toFixed(3)}h`;
        }
    }
}
//# sourceMappingURL=duration.js.map