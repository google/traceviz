/**
 * @fileoverview Tools for working with trace edge data, as defined in
 * .../traceviz/server/data_source/trace_edge.go.  See that file for more
 * information about the format.
 */

/*
        Copyright 2023 Google Inc.
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
                https://www.apache.org/licenses/LICENSE-2.0
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
*/

import {PAYLOAD_KEYS} from '../payload/payload.js';
import {ResponseNode} from '../protocol/response_interface.js';
import {Span, Subspan} from '../trace/trace.js';
import {ValueMap} from '../value/value_map.js';

enum Key {
  NODE_ID = 'trace_edge_node_id',
  START = 'trace_edge_start',
  ENDPOINT_NODE_IDS = 'trace_edge_endpoint_node_ids',
}

/** The key of the start value of a trace edge node. */
export const startKey = Key.START; 

const PAYLOAD_TYPE = 'trace_edge_payload';

/** A trace edge node. */
export class Node {
  // This Node's ID.
  readonly nodeID: string;
  // The endpoints of all edges originating in this Node.
  readonly endpointNodeIDs: string[];
  readonly properties: ValueMap;

  constructor(readonly node: ResponseNode) {
    this.nodeID = node.properties.expectString(Key.NODE_ID);
    this.endpointNodeIDs =
        node.properties.expectStringList(Key.ENDPOINT_NODE_IDS);
    this.properties = node.properties.without(
        Key.NODE_ID, Key.ENDPOINT_NODE_IDS, ...PAYLOAD_KEYS);
  }

  // Returns all traceedge Nodes defined in the provided Span or Subspan, in
  // definition order.
  static fromSpan<T>(span: Span<T>|Subspan<T>): Node[] {
    if (span.payloads.has(PAYLOAD_TYPE)) {
      return span.payloads.get(PAYLOAD_TYPE)!.map(
          (node: ResponseNode) => new Node(node));
    }
    return [];
  }
}
