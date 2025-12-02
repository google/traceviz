/** @fileoverview A set of test helpers for assembling TraceViz responses. */
import { Response, ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
/** A constructable ResponseNode for use in tests. */
export declare class TestResponseNode implements ResponseNode {
    private internalProperties;
    readonly children: ResponseNode[];
    constructor(internalProperties: ValueMap, children: ResponseNode[]);
    with(properties: ValueMap): ResponseNode;
    get properties(): ValueMap;
}
/** Returns a new TestResponseNode with the provided properties and children. */
export declare function node(properties?: ValueMap, ...children: ResponseNode[]): TestResponseNode;
/** Returns a new TestResponse with the provided series. */
export declare function response(...series: Array<{
    name: string;
    series: ResponseNode;
}>): Response;
