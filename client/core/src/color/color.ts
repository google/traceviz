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

const d3 = await import('d3');
// import * as d3 from 'd3';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { ValueMap } from '../value/value_map.js';

const SOURCE = 'colors';

enum Keys {
  COLOR_SPACE = 'color_space',
  PRIMARY_COLOR_SPACE = 'primary_color_space',
  PRIMARY_COLOR_SPACE_VALUE = 'primary_color_space_value',
  PRIMARY_COLOR = 'primary_color',
  SECONDARY_COLOR_SPACE = 'secondary_color_space',
  SECONDARY_COLOR_SPACE_VALUE = 'secondary_color_space_value',
  SECONDARY_COLOR = 'secondary_color',
  STROKE_COLOR_SPACE = 'stroke_color_space',
  STROKE_COLOR_SPACE_VALUE = 'stroke_color_space_value',
  STROKE_COLOR = 'stroke_color',
}

const COLOR_SPACE_NAME_PREFIX = 'color_space_';

/** A color space linearly interpolating across a set of colors. */
function linearColorSpace(...colors: string[]): (colorValue: number) => string {
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
  const domains: number[] = [];
  for (let i = 0; i < colors.length; i++) {
    domains.push(i / (colors.length - 1));
    const d3color = d3.color(colors[i]);
    if (d3color) {
      colors[i] = d3color.toString();
    }
  }
  return d3.scaleLinear<string>().domain(domains).range(colors);
}

/**
 * Returns the provided color string converted to a hexadecimal color string.
 */
export function hex(color: string): string | undefined {
  return d3.color(color)?.hex();
}

/** A single datum's defined colors. */
export interface Colors {
  primary: string | undefined;
  secondary: string | undefined;
  stroke: string | undefined;
}

/**
 * Provides a single access point for a set of color spaces, and performs
 * color lookup for ValueMaps that include coloring data.
 */
export class Coloring {
  readonly spacesByName: ReadonlyMap<string, (colorValue: number) => string>;
  constructor(vm: ValueMap) {
    const spacesByName = new Map<string, (colorValue: number) => string>();
    for (const key of vm.keys()) {
      if (key.startsWith(COLOR_SPACE_NAME_PREFIX)) {
        const colors = vm.expectStringList(key);
        spacesByName.set(key, linearColorSpace(...colors));
      }
    }
    this.spacesByName = spacesByName;
  }

  /**
   * Returns the color specified within the provided ValueMap, or undefined if
   * the ValueMap specifies no color.  Throws a ConfigurationError if the
   * ValueMap specifies a nonexistent color space.
   */
  colors(vm: ValueMap): Colors {
    return {
      primary: this.getColorString(
        vm, Keys.PRIMARY_COLOR, Keys.PRIMARY_COLOR_SPACE,
        Keys.PRIMARY_COLOR_SPACE_VALUE),
      secondary: this.getColorString(
        vm, Keys.SECONDARY_COLOR, Keys.SECONDARY_COLOR_SPACE,
        Keys.SECONDARY_COLOR_SPACE_VALUE),
      stroke: this.getColorString(
        vm, Keys.STROKE_COLOR, Keys.STROKE_COLOR_SPACE,
        Keys.STROKE_COLOR_SPACE_VALUE),
    };
  }

  private getColorString(
    vm: ValueMap, colorKey: string, colorSpaceKey: string,
    colorSpaceValueKey: string): string | undefined {
    let colorString: string | undefined;
    if (vm.has(colorKey)) {
      return vm.expectString(colorKey);
    } else if (vm.has(colorSpaceKey)) {
      const colorSpaceName = vm.expectString(colorSpaceKey);
      const colorValue = vm.expectNumber(colorSpaceValueKey);
      const colorSpace = this.spacesByName.get(colorSpaceName);
      if (!colorSpace) {
        throw new ConfigurationError(
          `Color space '${colorSpaceName} is not defined`)
          .at(Severity.ERROR)
          .from(SOURCE);
      }
      colorString = colorSpace(colorValue);
    }
    return colorString;
  }
}
