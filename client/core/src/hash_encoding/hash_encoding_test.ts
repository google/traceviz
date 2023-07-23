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

import {compress, decompress, serializeHashFragment, unserializeHashFragment} from './hash_encoding.js';

describe('hash encoding test', () => {
  it('should compress and decompress an object', () => {
    const testObj = {
      'abc': 123,
    };
    let actualCompressed = '';
    expect(() => {
      actualCompressed = compress(testObj);
    }).not.toThrow();
    expect(actualCompressed).toBe('eMKcwqtWSkxKVsKyMjQywq4FABQBAzM%3D');

    expect(() => {
      const actualDecompress = decompress<{abc: number}>(actualCompressed);
      expect(actualDecompress).not.toBeNull();
      expect(actualDecompress!.abc).toBe(123);
    }).not.toThrow();
  });

  it('discards all but the last occurrence of the same field', () => {
    expect(unserializeHashFragment('#abc=123&xyz=456&xyz=789'))
        .toEqual({'abc': '123', 'xyz': '789'});
  });

  it('parses and serializes hashes', () => {
    const testCases: Array<[string, {[k: string]: string}]> = [
      ['', {}],
      ['#abc', {'abc': ''}],
      ['#abc=0', {'abc': '0'}],
      ['#abc=false', {'abc': 'false'}],
      ['#abc&xyz=456', {'abc': '', 'xyz': '456'}],
      ['#abc=123&xyz=456', {'abc': '123', 'xyz': '456'}],
      [
        '#abc=123%204&def=567&xyz=890',
        {'abc': '123 4', 'def': '567', 'xyz': '890'}
      ],
    ];
    testCases.forEach(([hash, parsed]) => {
      expect(unserializeHashFragment(hash)).toEqual(parsed);
      expect(serializeHashFragment(parsed)).toEqual(hash);
    });
  });
})
