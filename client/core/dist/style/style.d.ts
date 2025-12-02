/**
 * @fileoverview Utilities for extracting styles defined within ValueMaps.
 */
import { ValueMap } from '../value/value_map.js';
/**
 * Fetches the named attribute from the provided ValueMap, or undefined if the
 * named attribute does not exist.
 */
export declare function getStyle(attrName: string, vm: ValueMap): string | undefined;
export declare function getStyles(vm: ValueMap): {
    [klass: string]: string;
};
