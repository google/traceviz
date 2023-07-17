import { Duration } from '../duration/duration.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
import { PAYLOAD_KEYS } from '../payload/payload.js';
import { Span, Subspan } from '../trace/trace.js';

enum Key {
    NODE_ID = 'trace_edge_node_id',
    OFFSET = 'trace_edge_offset',
    ENDPOINT_NODE_IDS = 'trace_edge_endpoint_node_ids',
  }
  
  const PAYLOAD_TYPE = 'trace_edge_payload';
  
  /** A trace edge node. */
  export class Node {
    // This Node's start offset.
    readonly offset: Duration;
    // This Node's ID.
    readonly nodeID: string;
    // The endpoints of all edges originating in this Node.
    readonly endpointNodeIDs: string[];
    readonly properties: ValueMap;
  
    constructor(readonly node: ResponseNode) {
      this.offset = node.properties.expectDuration(Key.OFFSET);
      this.nodeID = node.properties.expectString(Key.NODE_ID);
      this.endpointNodeIDs =
          node.properties.expectStringList(Key.ENDPOINT_NODE_IDS);
      this.properties = node.properties.without(
          Key.NODE_ID, Key.OFFSET, Key.ENDPOINT_NODE_IDS, ...PAYLOAD_KEYS);
    }
  
    // Returns all traceedge Nodes defined in the provided Span or Subspan, in
    // definition order.
    static fromSpan(span: Span|Subspan): Node[] {
      if (span.payloads.has(PAYLOAD_TYPE)) {
        return span.payloads.get(PAYLOAD_TYPE)!.map(
            (node: ResponseNode) => new Node(node));
      }
      return [];
    }
  }