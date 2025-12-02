/**
 * @fileoverview Tools for working with graph data in DOT format, as defined in
 * .../traceviz/server/go/dot/dot.got.  See that file for more information
 * about the format.
 */
import { Coloring } from '../color/color.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
/**
 * A graph supporting dot output and providing per-node and -edge properties.
 */
export declare class Graph {
    readonly nodePropertiesByID: Map<string, ValueMap>;
    readonly edgePropertiesByID: Map<string, ValueMap>;
    readonly dot: string;
    readonly coloring: Coloring;
    readonly layoutEngine: string;
    constructor(node: ResponseNode);
    private toDot;
    private getAttributes;
    private getAttributesString;
}
