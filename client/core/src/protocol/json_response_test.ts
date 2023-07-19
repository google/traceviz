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

import {fromObject} from './json_response.js';
import {ResponseNode} from './response_interface.js';
import {int, strs, str, ints, dbl, dur, ts, valueMap} from '../value/test_value.js';
import {Duration} from '../duration/duration.js';
import {Timestamp} from '../timestamp/timestamp.js';

describe('json response node test', () => {
  it('loads a response', () => {
    const response = fromObject(`{
    "StringTable": [
      "stridx", "stridxs", "int", "ints", "dbl", "dur", "ts",
      "hello", "goodbye"
    ],
    "DataSeries": [
      {
        "SeriesName": "0",
        "Root": [ [],
          [
            [
              [
                [ 0, [ 2, 7 ] ],
                [ 1, [ 4, [ 7, 8 ] ] ],
                [ 2, [ 5, 100 ] ],
                [ 3, [ 6, [ 50, 150, 250 ] ] ],
                [ 4, [ 7, 3.14159 ] ],
                [ 5, [ 8, 150000000 ] ],
                [ 6, [ 9, [ 500, 100 ] ] ]
              ],
              []
            ]
          ]
        ]
      }
    ]
  }`);
    expect(response).toEqual({
      series: new Map<string, ResponseNode>([
        [
          '0', {
            properties: valueMap(),
            children: [{
              properties: valueMap(
                {key: 'stridx', val: str('hello')},
                {key: 'stridxs', val: strs('hello', 'goodbye')},
                {key: 'int', val: int(100)},
                {key: 'ints', val: ints(50, 150, 250)},
                {key: 'dbl', val: dbl(3.14159)},
                {key: 'dur', val: dur(new Duration(150000000))},
                {key: 'ts', val: ts(new Timestamp(500, 100))}),
              children: []
            }],
          }
        ],
      ])
    });
  });
});
