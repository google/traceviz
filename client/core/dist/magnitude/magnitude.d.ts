/**
 * @fileoverview Tools for working with item magnitudes included in ValueMaps.
 *
 * getSelfMagnitude returns the self-magnitude defined in a provided ValueMap,
 * or 0 if there is no self-magnitude defined in the ValueMap.  If it defines a
 * self-magnitude, this ValueMap should contain:
 *   * Keys.SELF_MAGNITUDE: a number specifying the self-magnitude.
 */
import { ValueMap } from '../value/value_map.js';
/**
 * The set of property keys expected by this package.
 */
export declare const properties: string[];
/**
 * Returns the self-magnitude in the provided ValueMap, or 0 if there is none.
 */
export declare function getSelfMagnitude(vm: ValueMap): number;
