import { ValueMap } from '../value/value_map.js';
/**
 * Returns the provided color string converted to a hexadecimal color string.
 */
export declare function hex(color: string): string;
/** A single datum's defined colors. */
export interface Colors {
    primary: string | undefined;
    secondary: string | undefined;
    stroke: string | undefined;
}
/**
 * Returns a list of colors from a color space contained in the map
 */
export declare function getColors(valueMap: ValueMap): string[];
/**
 * Provides a single access point for a set of color spaces, and performs
 * color lookup for ValueMaps that include coloring data.
 */
export declare class Coloring {
    readonly spacesByName: ReadonlyMap<string, (colorValue: number) => string>;
    readonly colorRangesByColorSpaceName: ReadonlyMap<string, string[]>;
    constructor(vm: ValueMap);
    /**
     * Returns the color specified within the provided ValueMap, or undefined if
     * the ValueMap specifies no color.  Throws a ConfigurationError if the
     * ValueMap specifies a nonexistent color space.
     */
    colors(vm: ValueMap): Colors;
    /**
     * Returns the color stops for the primary color space specified within the
     * provided ValueMap, or an empty array if the ValueMap specifies no color.
     * Throws a ConfigurationError if the ValueMap specifies a nonexistent color
     * space.
     */
    colorSpaceRange(colorSpace: string): string[];
    private getColorString;
}
