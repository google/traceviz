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
