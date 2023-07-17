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

import 'jasmine';

import { toObject } from './json_request.js';
import { Request } from './request_interface.js';
import { int, strs, str, ints, dbl, dur, ts, valueMap } from '../value/test_value.js';
import { Duration } from '../duration/duration.js';
import { Timestamp } from '../timestamp/timestamp.js';

describe('json request test', () => {
  it('prepares a request', () => {
    const request: Request = {
      filters: valueMap(
          {key: 'str', val: str('hello')},
          {key: 'strs', val: strs('hello', 'goodbye')},
          {key: 'int', val: int(100)}, {key: 'ints', val: ints(50, 150, 250)},
          {key: 'dbl', val: dbl(3.14159)},
          {key: 'dur', val: dur(new Duration(150000000))},
          {key: 'ts', val: ts(new Timestamp(500, 100))}),
      seriesRequests: [{
        queryName: 'q1',
        seriesName: '1',
        parameters: valueMap(
            {key: 'str', val: str('hello')},
            {key: 'strs', val: strs('hello', 'goodbye')},
            {key: 'int', val: int(100)}, {key: 'ints', val: ints(50, 150, 250)},
            {key: 'dbl', val: dbl(3.14159)},
            {key: 'dur', val: dur(new Duration(150000000))},
            {key: 'ts', val: ts(new Timestamp(500, 100))})
      }],
    };

    expect(JSON.stringify(toObject(request))).toEqual(`{
  "GlobalFilters": {
    "str": [ 1, "hello" ],
    "strs": [ 3, [ "hello", "goodbye" ] ],
    "int": [ 5, 100 ],
    "ints": [ 6, [ 50, 150, 250 ] ],
    "dbl": [ 7, 3.14159 ],
    "dur": [ 8, 150000000 ],
    "ts": [ 9, [ 500, 100 ] ]
  },
  "SeriesRequests": [
    {
      "QueryName": "q1",
      "SeriesName": "1",
      "Options": {
        "str": [ 1, "hello" ],
        "strs": [ 3, [ "hello", "goodbye" ] ],
        "int": [ 5, 100 ],
        "ints": [ 6, [ 50, 150, 250 ] ],
        "dbl": [ 7, 3.14159 ],
        "dur": [ 8, 150000000 ],
        "ts": [ 9, [ 500, 100 ] ]
      }
    }
  ]
}`.replace(/\s/g, ''));
  });
});
