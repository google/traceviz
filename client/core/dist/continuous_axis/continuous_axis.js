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
import { categoryEquals, categoryProperties, getDefinedCategory } from '../category/category.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
const SOURCE = 'continuous_axis';
var Key;
(function (Key) {
    Key["AXIS_TYPE"] = "axis_type";
    Key["AXIS_MIN"] = "axis_min";
    Key["AXIS_MAX"] = "axis_max";
})(Key || (Key = {}));
/** Supported axis types. */
export var AxisType;
(function (AxisType) {
    AxisType["TIMESTAMP"] = "timestamp";
    AxisType["DURATION"] = "duration";
    AxisType["DOUBLE"] = "double";
})(AxisType || (AxisType = {}));
/** The set of properties used to define an axis. */
export const axisProperties = [Key.AXIS_TYPE, Key.AXIS_MIN, Key.AXIS_MAX, ...categoryProperties];
/** Represents an axis with a domain of type T. */
export class Axis {
    type;
    category;
    min;
    max;
    value;
    dist;
    constructor(type, category, min, max, value, 
    // Returns the unitless distance between a and b, as `b - a`.
    dist) {
        this.type = type;
        this.category = category;
        this.min = min;
        this.max = max;
        this.value = value;
        this.dist = dist;
    }
    static fromProperties(properties, value, 
    // Returns a unitless distance between a and b, as `b - a`.
    dist) {
        const cat = getDefinedCategory(properties);
        if (!cat) {
            throw new ConfigurationError(`an axis must define a category`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return new Axis(axisType(properties), cat, value(properties, Key.AXIS_MIN), value(properties, Key.AXIS_MAX), value, dist);
    }
    union(other) {
        if (!categoryEquals(this.category, other.category)) {
            throw new ConfigurationError(`can't merge axes with different categories`).from(SOURCE).at(Severity.ERROR);
        }
        if (this.type !== other.type) {
            throw new ConfigurationError(`can't merge axes with different types`).from(SOURCE).at(Severity.ERROR);
        }
        const typedOther = other;
        let min = this.min;
        let max = this.max;
        if (this.dist(this.min, typedOther.min) < 0) {
            min = typedOther.min;
        }
        if (this.dist(this.max, typedOther.max) > 0) {
            max = typedOther.max;
        }
        return new Axis(this.type, this.category, min, max, this.value, this.dist);
    }
    valueToDomainFraction(properties, key) {
        return this.toDomainFraction(this.value(properties, key));
    }
    // Given a value, returns a point on the range [0,1] corresponding to the
    // given value's position in the axis domain.
    toDomainFraction(val) {
        return this.dist(this.min, val) / this.dist(this.min, this.max);
    }
    // Returns true if the provided value is within the axis's domain.
    contains(val) {
        return this.dist(this.min, val) >= 0 && this.dist(val, this.max) >= 0;
    }
}
/** Returns the AxisType of the axis defined in the provided properties. */
function axisType(properties) {
    const t = properties.expectString(Key.AXIS_TYPE);
    if (t !== AxisType.DOUBLE && t !== AxisType.DURATION &&
        t !== AxisType.TIMESTAMP) {
        throw new ConfigurationError(`continuous axes must be of double, duration, or timestamp type`)
            .from(SOURCE)
            .at(Severity.ERROR);
    }
    return t;
}
/** Returns a double axis defined in the provided properties. */
function getDoubleAxis(properties) {
    return Axis.fromProperties(properties, (itemProperties, key) => {
        return itemProperties.expectNumber(key);
    }, (a, b) => b - a);
}
/** Returns a Duration axis defined in the provided properties. */
function getDurationAxis(properties) {
    return Axis.fromProperties(properties, (itemProperties, key) => {
        return itemProperties.expectDuration(key);
    }, (a, b) => b.sub(a).nanos);
}
/** Returns a Timestamp axis defined in the provided properties. */
function getTimestampAxis(properties) {
    return Axis.fromProperties(properties, (itemProperties, key) => {
        return itemProperties.expectTimestamp(key);
    }, (a, b) => b.sub(a).nanos);
}
/**
 * Returns a double, Duration, or Timestamp axis from the provided properties.
 */
export function getAxis(properties) {
    switch (axisType(properties)) {
        case AxisType.DOUBLE:
            return getDoubleAxis(properties);
        case AxisType.DURATION:
            return getDurationAxis(properties);
        case AxisType.TIMESTAMP:
            return getTimestampAxis(properties);
        default:
            throw new ConfigurationError(`trace continuous axis must be of double, duration, or timestamp type`)
                .from(SOURCE)
                .at(Severity.ERROR);
    }
}
//# sourceMappingURL=continuous_axis.js.map