/**
 * @fileoverview Tools for working with labels included in ValueMaps.
 *
 * getLabel returns a formatted label given a labelable item's ValueMap, or
 * an empty string if the ValueMap does not specify a label.  If it defines a
 * label, this ValueMap should contain:
 *   * Keys.LABEL_FORMAT: a string specifying the label format.  Any properties
 *     referenced in the format string should exist.
 */
import { ValueMap } from '../value/value_map.js';
/**
 * Returns the label for the provided ValueMap, or an empty string otherwise.
 */
export declare function getLabel(vm: ValueMap): string;
