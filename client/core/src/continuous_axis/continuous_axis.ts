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

import {Category, categoryEquals, categoryProperties, getDefinedCategory} from '../category/category.js';
import {Duration} from '../duration/duration.js';
import {ConfigurationError, Severity} from '../errors/errors.js';
import {Timestamp} from '../timestamp/timestamp.js';
import {ValueMap} from '../value/value_map.js';

const SOURCE = 'continuous_axis';

enum Key {
  AXIS_TYPE = 'axis_type',
  AXIS_MIN = 'axis_min',
  AXIS_MAX = 'axis_max',
}

/** Supported axis types. */
export enum AxisType {
  TIMESTAMP = 'timestamp',
  DURATION = 'duration',
  DOUBLE = 'double',
}

/** The set of properties used to define an axis. */
export const axisProperties =
    [Key.AXIS_TYPE, Key.AXIS_MIN, Key.AXIS_MAX, ...categoryProperties];

/** Represents an axis with a domain of type T. */
export class Axis<T> {
  constructor(
      readonly type: AxisType,
      readonly category: Category,
      readonly min: T,
      readonly max: T,
      readonly value: (properties: ValueMap, key: string) => T,
      // Returns the unitless distance between a and b, as `b - a`.
      readonly dist: (a: T, b: T) => number,
  ) {}

  static fromProperties<T>(
      properties: ValueMap, value: (properties: ValueMap, key: string) => T,
      // Returns a unitless distance between a and b, as `b - a`.
      dist: (a: T, b: T) => number): Axis<T> {
    const cat = getDefinedCategory(properties);
    if (!cat) {
      throw new ConfigurationError(`an axis must define a category`)
          .from(SOURCE)
          .at(Severity.ERROR);
    }
    return new Axis<T>(
        axisType(properties), cat, value(properties, Key.AXIS_MIN),
        value(properties, Key.AXIS_MAX), value, dist);
  }

  union(other: Axis<unknown>): Axis<T> {
    if (!categoryEquals(this.category, other.category)) {
      throw new ConfigurationError(
          `can't merge axes with different categories`).from(SOURCE).at(Severity.ERROR);
    }
    if (this.type !== other.type) {
      throw new ConfigurationError(
        `can't merge axes with different types`).from(SOURCE).at(Severity.ERROR);
    }
    const typedOther = other as Axis<T>;
    let min = this.min;
    let max = this.max;
    if (this.dist(this.min, typedOther.min) < 0) {
      min = typedOther.min;
    }
    if (this.dist(this.max, typedOther.max) > 0) {
      max = typedOther.max;
    }
    return new Axis<T>(
        this.type, this.category, min, max, this.value, this.dist);
  }

  valueToDomainFraction(properties: ValueMap, key: string): number {
    return this.toDomainFraction(this.value(properties, key));
  }

  // Given a value, returns a point on the range [0,1] corresponding to the
  // given value's position in the axis domain.
  toDomainFraction(val: T): number {
    return this.dist(this.min, val) / this.dist(this.min, this.max);
  }

  // Returns true if the provided value is within the axis's domain.
  contains(val: T): boolean {
    return this.dist(this.min, val) >= 0 && this.dist(val, this.max) >= 0;
  }
}

/** Returns the AxisType of the axis defined in the provided properties. */
function axisType(properties: ValueMap): AxisType {
  const t = properties.expectString(Key.AXIS_TYPE);
  if (t !== AxisType.DOUBLE && t !== AxisType.DURATION &&
      t !== AxisType.TIMESTAMP) {
    throw new ConfigurationError(
        `continuous axes must be of double, duration, or timestamp type`)
        .from(SOURCE)
        .at(Severity.ERROR);
  }
  return t;
}

/** Returns a double axis defined in the provided properties. */
function getDoubleAxis(properties: ValueMap): Axis<number> {
  return Axis.fromProperties<number>(
      properties, (itemProperties: ValueMap, key: string) => {
        return itemProperties.expectNumber(key);
      }, (a: number, b: number) => b - a);
}

/** Returns a Duration axis defined in the provided properties. */
function getDurationAxis(properties: ValueMap): Axis<Duration> {
  return Axis.fromProperties<Duration>(
      properties, (itemProperties: ValueMap, key: string) => {
        return itemProperties.expectDuration(key);
      }, (a: Duration, b: Duration) => b.sub(a).nanos);
}

/** Returns a Timestamp axis defined in the provided properties. */
function getTimestampAxis(properties: ValueMap): Axis<Timestamp> {
  return Axis.fromProperties<Timestamp>(
      properties, (itemProperties: ValueMap, key: string) => {
        return itemProperties.expectTimestamp(key);
      }, (a: Timestamp, b: Timestamp) => b.sub(a).nanos);
}

/**
 * Returns a double, Duration, or Timestamp axis from the provided properties.
 */
export function getAxis(properties: ValueMap): Axis<unknown> {
  switch (axisType(properties)) {
    case AxisType.DOUBLE:
      return getDoubleAxis(properties) as Axis<unknown>;
    case AxisType.DURATION:
      return getDurationAxis(properties) as Axis<unknown>;
    case AxisType.TIMESTAMP:
      return getTimestampAxis(properties) as Axis<unknown>;
    default:
      throw new ConfigurationError(
          `trace continuous axis must be of double, duration, or timestamp type`)
          .from(SOURCE)
          .at(Severity.ERROR);
  }
}
