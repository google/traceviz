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

/** @fileoverview A set of test helpers for assembling TraceViz responses. */

import {valueMap} from '../value/test_value.js';
import {ValueMap} from '../value/value_map.js';
import {Response, ResponseNode} from '../protocol/response_interface.js';

/** A constructable ResponseNode for use in tests. */
export class TestResponseNode implements ResponseNode {
  constructor(
    private internalProperties: ValueMap, readonly children: ResponseNode[]) {
  }

  with(properties: ValueMap): ResponseNode {
    this.internalProperties=
      ValueMap.union(this.internalProperties, properties);
    return this;
  }

  get properties(): ValueMap {
    return this.internalProperties;
  }
}

/** Returns a new TestResponseNode with the provided properties and children. */
export function node(
  properties?: ValueMap, ...children: ResponseNode[]): TestResponseNode {
  if (properties===undefined) {
    properties=valueMap();
  }
  return new TestResponseNode(properties, [...children]);
}

/** A constructable Response for use in tests. */
class TestResponse implements Response {
  constructor(readonly series: Map<string, ResponseNode>) { }
}

/** Returns a new TestResponse with the provided series. */
export function response(
  ...series: Array<{name: string, series: ResponseNode}>): Response {
  const seriesByName=new Map<string, ResponseNode>();
  for (const dataSeries of series) {
    seriesByName.set(dataSeries.name, dataSeries.series);
  }
  return new TestResponse(seriesByName);
}
