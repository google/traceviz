import { ValueMap } from '../value/value_map.js';
/** Represents a single node in a server-side response. */
export interface ResponseNode {
    properties: ValueMap;
    children: ResponseNode[];
}
/**
 * Represents a backend response, comprising a root ResponseNode for each
 * returned DataSeries.
 */
export interface Response {
    series: ReadonlyMap<string, ResponseNode>;
}
