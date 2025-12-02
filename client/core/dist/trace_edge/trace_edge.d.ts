/**
 * @fileoverview Tools for working with trace edge data, as defined in
 * .../traceviz/server/data_source/trace_edge.go.  See that file for more
 * information about the format.
 */
import { ResponseNode } from '../protocol/response_interface.js';
import { Span, Subspan } from '../trace/trace.js';
import { ValueMap } from '../value/value_map.js';
declare enum Key {
    NODE_ID = "trace_edge_node_id",
    START = "trace_edge_start",
    ENDPOINT_NODE_IDS = "trace_edge_endpoint_node_ids"
}
/** The key of the start value of a trace edge node. */
export declare const startKey = Key.START;
/** A trace edge node. */
export declare class Node {
    readonly node: ResponseNode;
    readonly nodeID: string;
    readonly endpointNodeIDs: string[];
    readonly properties: ValueMap;
    constructor(node: ResponseNode);
    static fromSpan<T>(span: Span<T> | Subspan<T>): Node[];
}
export {};
