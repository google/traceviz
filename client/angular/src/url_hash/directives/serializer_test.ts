/*
        Copyright 2025 Google Inc.
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

import {compress, decompress, parseHashFragment, serializeHashFragment} from './serializer.js';

describe('serializer test', () => {
  it('should compress and decompress an object', () => {
    const testObj = {
      'abc': 123,
    };

    const actualCompressed = compress(testObj);
    expect(actualCompressed).toBe('eJyrVkpMSlayMjQyrgUAFAEDMw%3D%3D');

    const actualDecompress = decompress<{abc: number}>(actualCompressed);
    expect(actualDecompress).not.toBeNull();
    expect(actualDecompress!.abc).toBe(123);
  });

  it('should only care about the last occurrence of a field', () => {
    expect(parseHashFragment('#abc=123&xyz=456&xyz=789'))
        .toEqual({'abc': '123', 'xyz': '789'});
  });

  it('should not get infinitely stuck when decoding super encoded urls', () => {
    let encoded = 'eJyrVkpMSlayMjQyrgUAFAEDMw==';
    // Max tries is 10 before aborting.
    for (let i = 0; i < 11; i++) {
      encoded = encodeURIComponent(encoded);
    }
    // Result has no meaning in this case.
    expect(parseHashFragment(encoded)).toEqual({});
  });

  pit('should parse and serialize hashes',
      [
        ['', {}],
        ['#abc', {'abc': ''}],
        ['#abc=0', {'abc': '0'}],
        ['#abc=false', {'abc': 'false'}],
        ['#abc&xyz=456', {'abc': '', 'xyz': '456'}],
        ['#abc=123', {'abc': '123'}],
        ['#abc=123&xyz=456', {'abc': '123', 'xyz': '456'}],
        [
          '#abc=123%204&def=567&xyz=890',
          {'abc': '123 4', 'def': '567', 'xyz': '890'}
        ],
      ] as Array<[string, {[k: string]: string}]>,
      ([hash, parsed]) => {
        expect(parseHashFragment(hash)).toEqual(parsed);
        expect(serializeHashFragment(parsed)).toEqual(hash);
      });
});