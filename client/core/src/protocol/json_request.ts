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
 * @fileoverview A set of backend-compatible request types, and functions
 * converting into them from standard frontend Requests.
 */

import {Request, SeriesRequest} from './request_interface.js';

// These objects are serialized to JSON, so their names must be formatted as
// expected on the backend.
// tslint:disable:enforce-name-casing
interface DataSeriesRequest {
  QueryName: string;
  SeriesName: string;
  Options: object;
}

interface DataRequest {
  GlobalFilters: object;
  SeriesRequests: DataSeriesRequest[];
}
// tslint:enable:enforce-name-casing

function fromSeriesRequest(req: SeriesRequest): DataSeriesRequest {
  return {
    QueryName: req.queryName,
    SeriesName: req.seriesName,
    Options: req.parameters.toVMap(),
  };
}

/**
 * Converts a standard frontend Request to a backend-compatible DataRequest.
 */
export function toObject(req: Request): DataRequest {
  return {
    GlobalFilters: req.filters.toVMap(),
    SeriesRequests:
      req.seriesRequests.map((seriesReq) => fromSeriesRequest(seriesReq)),
  };
}
