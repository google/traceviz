/**
 * @fileoverview Tools for working with structured data embedded as payloads.
 */

import { ResponseNode } from '../protocol/response_interface.js';

enum Key {
  TYPE = 'payload_type',
}

/**
 * The children of a ResponseNode, with structural children separated from
 * payloads.  Payloads are stored as a map of arrays.
 */
export interface Children {
  structural: ResponseNode[];
  payload: Map<string, ResponseNode[]>;
}

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
