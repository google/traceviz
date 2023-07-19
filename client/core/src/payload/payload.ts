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

/**
 * @fileoverview Tools for working with structured data embedded as payloads.
 */

import {ResponseNode} from '../protocol/response_interface.js';

enum Key {
  TYPE='payload_type',
}

/**
 * The set of keys marking a payload.  May be used with ValueMap.without().
 */
export const PAYLOAD_KEYS=[Key.TYPE];

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
  const structural: ResponseNode[]=[];
  const payload=new Map<string, ResponseNode[]>();
  node.children.forEach((child) => {
    if (child.properties.has(Key.TYPE)) {
      const payloadType=child.properties.expectString(Key.TYPE);
      const children=payload.get(payloadType);
      if (children===undefined) {
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