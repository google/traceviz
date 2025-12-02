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
 * @fileoverview A set of types for obtaining color and color space information
 * from backend Data responses and using them to obtain colors.  For details
 * on the format, see the file comment for traceviz/server/data_source/color.go.
 */
import * as d3 from 'd3';
import { ConfigurationError, Severity } from '../errors/errors.js';
const SOURCE = 'colors';
var Keys;
(function (Keys) {
    Keys["COLOR_SPACE"] = "color_space";
    Keys["PRIMARY_COLOR_SPACE"] = "primary_color_space";
    Keys["PRIMARY_COLOR_SPACE_VALUE"] = "primary_color_space_value";
    Keys["PRIMARY_COLOR"] = "primary_color";
    Keys["SECONDARY_COLOR_SPACE"] = "secondary_color_space";
    Keys["SECONDARY_COLOR_SPACE_VALUE"] = "secondary_color_space_value";
    Keys["SECONDARY_COLOR"] = "secondary_color";
    Keys["STROKE_COLOR_SPACE"] = "stroke_color_space";
    Keys["STROKE_COLOR_SPACE_VALUE"] = "stroke_color_space_value";
    Keys["STROKE_COLOR"] = "stroke_color";
    Keys["COLOR_SPACE_NAME"] = "color_space_name";
    Keys["COLOR_SPACE_NAME_PREFIX"] = "color_space_";
})(Keys || (Keys = {}));
/** A color space linearly interpolating across a set of colors. */
function linearColorSpace(...colors) {
    if (colors.length === 0) {
        throw new ConfigurationError(`Color spaces must define at least one color`)
            .at(Severity.ERROR)
            .from(SOURCE);
    }
    if (colors.length === 1) {
        // The input domain must vary between 0 and 1, so we need at least two
        // colors.
        colors.push(colors[0]);
    }
    const domains = [];
    for (let i = 0; i < colors.length; i++) {
        domains.push(i / (colors.length - 1));
        colors[i] = d3.color(colors[i])?.toString() || '';
    }
    return d3.scaleLinear().domain(domains).range(colors);
}
/**
 * Returns the provided color string converted to a hexadecimal color string.
 */
export function hex(color) {
    return d3.color(color)?.hex() || '';
}
/**
 * Returns a list of colors from a color space contained in the map
 */
export function getColors(valueMap) {
    const colorSpaceName = valueMap.has(Keys.COLOR_SPACE_NAME) ?
        valueMap.expectString(Keys.COLOR_SPACE_NAME) :
        '';
    if (colorSpaceName) {
        return valueMap.expectStringList(Keys.COLOR_SPACE_NAME_PREFIX + colorSpaceName) ||
            [];
    }
    return [];
}
/**
 * Provides a single access point for a set of color spaces, and performs
 * color lookup for ValueMaps that include coloring data.
 */
export class Coloring {
    spacesByName;
    colorRangesByColorSpaceName;
    constructor(vm) {
        const spacesByName = new Map();
        const colorRangesByColorSpaceName = new Map();
        for (const key of vm.keys()) {
            if (key.startsWith(Keys.COLOR_SPACE_NAME_PREFIX)) {
                const colors = vm.expectStringList(key);
                spacesByName.set(key, linearColorSpace(...colors));
                colorRangesByColorSpaceName.set(key, colors);
            }
        }
        this.spacesByName = spacesByName;
        this.colorRangesByColorSpaceName = colorRangesByColorSpaceName;
    }
    /**
     * Returns the color specified within the provided ValueMap, or undefined if
     * the ValueMap specifies no color.  Throws a ConfigurationError if the
     * ValueMap specifies a nonexistent color space.
     */
    colors(vm) {
        return {
            primary: this.getColorString(vm, Keys.PRIMARY_COLOR, Keys.PRIMARY_COLOR_SPACE, Keys.PRIMARY_COLOR_SPACE_VALUE),
            secondary: this.getColorString(vm, Keys.SECONDARY_COLOR, Keys.SECONDARY_COLOR_SPACE, Keys.SECONDARY_COLOR_SPACE_VALUE),
            stroke: this.getColorString(vm, Keys.STROKE_COLOR, Keys.STROKE_COLOR_SPACE, Keys.STROKE_COLOR_SPACE_VALUE),
        };
    }
    /**
     * Returns the color stops for the primary color space specified within the
     * provided ValueMap, or an empty array if the ValueMap specifies no color.
     * Throws a ConfigurationError if the ValueMap specifies a nonexistent color
     * space.
     */
    colorSpaceRange(colorSpace) {
        return this.colorRangesByColorSpaceName.get(colorSpace) || [];
    }
    getColorString(vm, colorKey, colorSpaceKey, colorSpaceValueKey) {
        let colorString;
        if (vm.has(colorKey)) {
            return vm.expectString(colorKey);
        }
        else if (vm.has(colorSpaceKey)) {
            const colorSpaceName = vm.expectString(colorSpaceKey);
            const colorValue = vm.expectNumber(colorSpaceValueKey);
            const colorSpace = this.spacesByName.get(colorSpaceName);
            if (!colorSpace) {
                throw new ConfigurationError(`Color space '${colorSpaceName} is not defined`)
                    .at(Severity.ERROR)
                    .from(SOURCE);
            }
            colorString = colorSpace(colorValue);
        }
        return colorString;
    }
}
//# sourceMappingURL=color.js.map