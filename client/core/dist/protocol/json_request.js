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
// tslint:enable:enforce-name-casing
function fromSeriesRequest(req) {
    return {
        QueryName: req.queryName,
        SeriesName: req.seriesName,
        Options: req.parameters.toVMap(),
    };
}
/**
 * Converts a standard frontend Request to a backend-compatible DataRequest.
 */
export function toObject(req) {
    return {
        GlobalFilters: req.filters.toVMap(),
        SeriesRequests: req.seriesRequests.map((seriesReq) => fromSeriesRequest(seriesReq)),
    };
}
//# sourceMappingURL=json_request.js.map