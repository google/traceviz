/**
 * @fileoverview Tools for working with structured data embedded as payloads.
 */
import { ResponseNode } from '../protocol/response_interface.js';
declare enum Key {
    TYPE = "payload_type"
}
/**
 * The set of keys marking a payload.  May be used with ValueMap.without().
 */
export declare const PAYLOAD_KEYS: Key[];
/** A response struct for the children() function. */
export interface Children {
    structural: ResponseNode[];
    payload: Map<string, ResponseNode[]>;
}
/**
 * Returns the Children of the provided ResponseNode, separating out structural
 * children from payload children, and placing the latter in a map keyed by
 * payload type.
 */
export declare function children(node: ResponseNode): Children;
export {};
