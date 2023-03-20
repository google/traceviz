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

import { Category, categoryEquals, categoryProperties, getDefinedCategory } from '../category/category.js';
import { Duration } from '../duration/duration.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { Timestamp } from '../timestamp/timestamp.js';
import { ValueMap } from '../value/value_map.js';

const SOURCE = 'continuous_axis';

enum Key {
  AXIS_TYPE = 'axis_type',
  AXIS_MIN = 'axis_min',
  AXIS_MAX = 'axis_max',
}

enum AxisType {
  TIMESTAMP_AXIS_TYPE = 'timestamp',
  DURATION_AXIS_TYPE = 'duration',
  DOUBLE_AXIS_TYPE = 'double',
}

/** The set of properties used to define an axis. */
export const axisProperties =
  [Key.AXIS_TYPE, Key.AXIS_MIN, Key.AXIS_MAX, ...categoryProperties];

/** Represents an axis with a domain of type T. */
export abstract class Axis<T> {
  constructor(readonly category: Category, readonly min: T, readonly max: T) { }

  // Given a point's properties, return the value of that point.
  abstract pointValue(properties: ValueMap): T;

  // Given a value, returns a point on the range [0,1] corresponding to the
  // given value's position in the axis domain.
  abstract toDomainFraction(val: T): number;

  // Returns true if the provided value is within the axis's domain.
  abstract contains(val: T): boolean;
}

/** Represents a temporal domain with a known starting point. */
export class TimestampAxis extends Axis<Timestamp> {
  private readonly duration: Duration;

  constructor(cat: Category, min: Timestamp, max: Timestamp) {
    super(cat, min, max);
    this.duration = max.sub(min);
  }

  override pointValue(properties: ValueMap): Timestamp {
    return properties.expectTimestamp(this.category.id);
  }

  override toDomainFraction(val: Timestamp): number {
    const offsetFromMin = val.sub(this.min);
    return offsetFromMin.nanos / this.duration.nanos;
  }

  override contains(val: Timestamp): boolean {
    return this.min.cmp(val) <= 0 && this.max.cmp(val) >= 0;
  }

  // Converts an axis offset into an absolute time.
  atOffset(val: Duration): Timestamp {
    return this.min.add(val);
  }
}

/** Represents a temporal domain with an unknown starting point. */
export class DurationAxis extends Axis<Duration> {
  private readonly duration: Duration;

  constructor(cat: Category, min: Duration, max: Duration) {
    super(cat, min, max);
    this.duration = max.sub(min);
  }

  override pointValue(properties: ValueMap): Duration {
    return properties.expectDuration(this.category.id);
  }

  override toDomainFraction(val: Duration): number {
    const offsetFromMin = val.sub(this.min);
    return offsetFromMin.nanos / this.duration.nanos;
  }

  override contains(val: Duration): boolean {
    return this.min.cmp(val) <= 0 && this.max.cmp(val) >= 0;
  }
}

/** Represents a numeric domain. */
export class NumberAxis extends Axis<number> {
  private readonly width: number;

  constructor(cat: Category, min: number, max: number) {
    super(cat, min, max);
    this.width = max - min;
  }

  pointValue(properties: ValueMap): number {
    return properties.expectNumber(this.category.id);
  }

  override toDomainFraction(val: number): number {
    return (val - this.min) / this.width;
  }

  contains(val: number): boolean {
    return this.min <= val && this.max >= val;
  }
}

/** Returns the axis defined within the provided properties. */
export function getAxis(properties: ValueMap): NumberAxis | DurationAxis |
  TimestampAxis {
  const axisType = properties.expectString(Key.AXIS_TYPE);
  const cat = getDefinedCategory(properties);
  if (!cat) {
    throw new ConfigurationError(`an axis must define a category`)
      .from(SOURCE)
      .at(Severity.ERROR);
  }
  switch (axisType) {
    case AxisType.TIMESTAMP_AXIS_TYPE:
      return new TimestampAxis(
        cat, properties.expectTimestamp(Key.AXIS_MIN),
        properties.expectTimestamp(Key.AXIS_MAX));
    case AxisType.DURATION_AXIS_TYPE:
      return new DurationAxis(
        cat, properties.expectDuration(Key.AXIS_MIN),
        properties.expectDuration(Key.AXIS_MAX));
    case AxisType.DOUBLE_AXIS_TYPE:
      return new NumberAxis(
        cat, properties.expectNumber(Key.AXIS_MIN),
        properties.expectNumber(Key.AXIS_MAX));
    default:
      throw new ConfigurationError(`unsupported axis type ${axisType}`)
        .from(SOURCE)
        .at(Severity.ERROR);
  }
}

function cmp(a: unknown, b: unknown): number {
  if (a instanceof Timestamp && b instanceof Timestamp) {
    return a.cmp(b);
  }
  if (a instanceof Duration && b instanceof Duration) {
    return a.cmp(b);
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return b - a;
  }
  throw new ConfigurationError(`can't compare incomparable types`)
    .from(SOURCE)
    .at(Severity.ERROR);
}

/**
 * Unions the specified set of axes, returning a new Axis of the same type
 * and with the same category, covering all of the arguments' domains.
 */
export function unionAxes(
  ...axes: Array<DurationAxis | TimestampAxis | NumberAxis>): DurationAxis |
  TimestampAxis | NumberAxis {
  if (axes.length < 2) {
    throw new ConfigurationError(`unionAxes() requires at least two axes`)
      .from(SOURCE)
      .at(Severity.ERROR);
  }
  const cat = axes[0].category;
  let min = axes[0].min;
  let max = axes[0].max;
  for (let idx = 1; idx < axes.length; idx++) {
    if (!categoryEquals(cat, axes[idx].category)) {
      throw new ConfigurationError(
        `can't merge axes with different categories`);
    }
    if (cmp(min, axes[idx].min) > 0) {
      min = axes[idx].min;
    }
    if (cmp(max, axes[idx].max) < 0) {
      max = axes[idx].max;
    }
  }
  if (min instanceof Timestamp && max instanceof Timestamp) {
    return new TimestampAxis(cat, min, max);
  }
  if (min instanceof Duration && max instanceof Duration) {
    return new DurationAxis(cat, min, max);
  }
  if (typeof min === 'number' && typeof max === 'number') {
    return new NumberAxis(cat, min, max);
  }
  throw new ConfigurationError('can\'t union timestamps of incompatible types');
}
