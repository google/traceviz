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

import {Timestamp} from './timestamp.js';
import {Duration} from '../duration/duration.js';

describe('timestamp test', () => {
  it('converts to a Date', () => {
    const t = new Timestamp(123456789, 0); // Thu Nov 29 1973 21:33:09 GMT
    expect(t.toDate()).toEqual(new Date(Date.UTC(1973, 10, 29, 21, 33, 9, 0)));
  });

  it('adds a duration', () => {
    const t = new Timestamp(0, 0);
    expect(t.add(new Duration(1000000))).toEqual(new Timestamp(0, 1000000));
  });
});
