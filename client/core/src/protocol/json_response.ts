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
 * @fileoverview A set of response types modeling server-side responses, and
 * functions converting them to standard frontend Responses.
 */

import {KV, ValueMap} from '../value/value_map.js';
import {Response, ResponseNode} from './response_interface.js';

type Datum = [
  KV[],
  Datum[],
];

function newJSONResponseNode(resp: Datum, stringTable: string[]): ResponseNode {
  return {
    properties: new ValueMap(resp[0], stringTable),
        children:
            resp[1].map((child) => newJSONResponseNode(child, stringTable))
  };
}

// These objects are serialized to JSON, so their names must be formatted as
// expected on the backend.
// tslint:disable:enforce-name-casing
interface DataSeries {
  SeriesName: string;
  Root: Datum;
}

/**
 * A Data response from the backend.
 */
export interface Data {
  StringTable: string[];
  DataSeries: DataSeries[];
}
// tslint:enable:enforce-name-casing

/**
 * Prepares a Response from the provided JSON object or JSON-encoded string.
 */
export function fromObject(resp: string|Data): Response {
  if (typeof resp === 'string') {
    resp = JSON.parse(resp) as Data;
  }
  const m = new Map<string, ResponseNode>();
  for (const s of resp.DataSeries) {
    m.set(s.SeriesName, newJSONResponseNode(s.Root, resp.StringTable));
  }
  return {series: m};
}
