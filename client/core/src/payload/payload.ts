/**
 * @fileoverview Tools for working with structured data embedded as payloads.
 */

import { ResponseNode } from '../protocol/response_interface.js';

enum Key {
  TYPE = 'payload_type',
}

/**
 * The set of keys marking a payload.  May be used with ValueMap.without().
 */
export const PAYLOAD_KEYS = [Key.TYPE];

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
export function children(node: ResponseNode): Children {
  const structural: ResponseNode[] = [];
  const payload = new Map<string, ResponseNode[]>();
  node.children.forEach((child) => {
    if (child.properties.has(Key.TYPE)) {
      const payloadType = child.properties.expectString(Key.TYPE);
      const children = payload.get(payloadType);
      if (children === undefined) {
        payload.set(payloadType, [child]);
      } else {
        children.push(child);
      }
    } else {
      structural.push(child);
    }
  });
  return {
    structural,
    payload,
  };
}