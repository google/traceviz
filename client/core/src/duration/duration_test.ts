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

import { Duration } from './duration.js';

function dur(nanos: number): Duration {
  return new Duration(nanos);
}

describe('duration test', () => {

  it('compares', () => {
    expect(dur(100).cmp(dur(200))).toBeLessThan(0);
    expect(dur(100).cmp(dur(100))).toEqual(0);
    expect(dur(200).cmp(dur(100))).toBeGreaterThan(0);
  });
  it('formats as string', () => {
    expect(new Duration(500).toString()).toEqual('500ns');
    expect(new Duration(-500).toString()).toEqual('-500ns');
    expect(new Duration(5000).toString()).toEqual('5.000μs');
    expect(new Duration(-5000).toString()).toEqual('-5.000μs');
    expect(new Duration(50000000).toString()).toEqual('50.000ms');
    expect(new Duration(-50000000).toString()).toEqual('-50.000ms');
    expect(new Duration(3000000000).toString()).toEqual('3.000s');
    expect(new Duration(-3000000000).toString()).toEqual('-3.000s');
    expect(new Duration(180000000000).toString()).toEqual('3.000m');
    expect(new Duration(-180000000000).toString()).toEqual('-3.000m');
    expect(new Duration(12600000000000).toString()).toEqual('3.500h');
    expect(new Duration(-12600000000000).toString()).toEqual('-3.500h');
  });
});
