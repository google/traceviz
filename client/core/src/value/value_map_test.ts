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

import {Value} from './value';
import {int, strs, str, ints, dbl, dur, ts, st, valueMap} from './test_value';
import {ValueMap} from './value_map';
import {Duration} from '../duration/duration';
import {Timestamp} from '../timestamp/timestamp';

describe('value map test', () => {
  it('constructs from object with stridx keys', () => {
    const vm = new ValueMap(
        [
          [0, [2, 7]], [1, [4, [7, 8]]], [2, [5, 100]],
          [3, [6, [50, 150, 250]]], [4, [7, 3.14159]], [5, [8, 150000000]],
          [6, [9, [500, 100]]]
        ],
        [
          'stridx', 'stridxs', 'int', 'ints', 'dbl', 'dur', 'ts', 'hello',
          'goodbye'
        ]);
    expect([...(vm.entries())]).toEqual([
      ['stridx', str('hello')], ['stridxs', strs('hello', 'goodbye')],
      ['int', int(100)], ['ints', ints(50, 150, 250)], ['dbl', dbl(3.14159)],
      ['dur', dur(new Duration(150000000))], ['ts', ts(new Timestamp(500, 100))]
    ]);
  });
  it('constructs from object with str keys', () => {
    const vm = new ValueMap([
      ['str', [1, 'hello']], ['strs', [3, ['hello', 'goodbye']]],
      ['int', [5, 100]], ['ints', [6, [50, 150, 250]]], ['dbl', [7, 3.14159]],
      ['dur', [8, 150000000]], ['ts', [9, [500, 100]]]
    ]);
    expect([...(vm.entries())]).toEqual([
      ['str', str('hello')], ['strs', strs('hello', 'goodbye')],
      ['int', int(100)], ['ints', ints(50, 150, 250)], ['dbl', dbl(3.14159)],
      ['dur', dur(new Duration(150000000))], ['ts', ts(new Timestamp(500, 100))]
    ]);
  });

  it('constructs from raw map', () => {
    const mapMap = new ValueMap(new Map<string, Value>([['key', int(3)]]));
    expect([...mapMap.entries()]).toEqual([['key', int(3)]]);
  });

  it('formats', () => {
    const vm = new ValueMap(new Map<string, Value>([
      ['title', str('Alice\'s Adventures in Wonderland')],
      ['type', str('book')], ['author', str('Lewis Carroll')],
      ['publication_year', int(1865)]
    ]));
    const fmtStr =
        `Let's look at '$(title)', a $(type) published by $(author) in $(publication_year).`;
    expect(vm.format(fmtStr))
        .toEqual(
            `Let's look at 'Alice's Adventures in Wonderland', a book published by Lewis Carroll in 1865.`);
  });

  it('rejects bad formats', () => {
    for (const badFmt
             of [`a bare $`, `paren $(problems`, `missing $(variable)`]) {
      expect(() => {
        valueMap().format(badFmt);
      }).toThrow();
    }
  });

  it('expects types, and complains on incorrect types', () => {
    const vm = new ValueMap(new Map<string, Value>([
      ['str', str('a')],
      ['int', int(1)],
      ['strs', strs('x', 'y', 'z')],
      ['ints', ints(7, 8, 9)],
    ]));

    expect(vm.expectString('str')).toEqual('a');
    expect(vm.expectNumber('int')).toEqual(1);
    expect(vm.expectStringList('strs')).toEqual(['x', 'y', 'z']);
    expect(vm.expectIntegerList('ints')).toEqual([7, 8, 9]);

    expect(() => {
      vm.expectString('int');
    }).toThrow();
    expect(() => {
      vm.expectNumber('str');
    }).toThrow();
  });

  it('serializes to JSON and updates from JSON', () => {
    const vm = new ValueMap(new Map<string, Value>([
      ['str', str('a')],
      ['int', int(1)],
      ['strs', strs('x', 'y', 'z')],
      ['ints', ints(7, 8, 9)],
    ]));
    // Expect the right serialization
    expect(vm.exportKeyValueMap())
        .toEqual(
            {'str': 'a', 'int': 1, 'strs': ['x', 'y', 'z'], 'ints': [7, 8, 9]});
    // Expect working unserialization
    const vm2 = new ValueMap(new Map<string, Value>([
      ['str', str('b')],
      ['int', int(3)],
      ['strs', strs('l', 'm', 'n', 'o', 'p')],
      ['ints', ints(1000, 2000, 3000)],
    ]));
    vm2.updateFromExportedKeyValueMap(vm.exportKeyValueMap());
    expect(vm2.expectString('str')).toEqual('a');
    expect(vm2.expectNumber('int')).toEqual(1);
    expect(vm2.expectStringList('strs')).toEqual(['x', 'y', 'z']);
    expect(vm2.expectIntegerList('ints')).toEqual([7, 8, 9]);
    // Expect a missing key to fail
    expect(() => {
      vm.updateFromExportedKeyValueMap({'absent': 100});
    }).toThrow();
    // Expect a failure to unserialize a value
    expect(() => {
      vm.updateFromExportedKeyValueMap({'str': [1, 2, 3]});
    }).toThrow();
  });

  it('removes properties via without()', () => {
    expect((new ValueMap(new Map<string, Value>([
             ['str', str('b')],
             ['int', int(3)],
             ['strs', strs('l', 'm', 'n', 'o', 'p')],
             ['ints', ints(1000, 2000, 3000)],
           ]))).without('str', 'strs', 'foos'))
        .toEqual(new ValueMap(new Map<string, Value>([
          ['int', int(3)],
          ['ints', ints(1000, 2000, 3000)],
        ])));
  });

  it('watches properly', () => {
    const i = int(1);
    const s = str('hello');
    const vm = valueMap(
        {key: 'foo', val: i},
        {key: 'bar', val: s},
    );
    const obs = vm.watch();
    let updates = 0;
    const sub = obs.subscribe((vm) => {
      updates++;
    });
    // When first subscribed, each value in the map produces one update.
    expect(updates).toEqual(2);
    i.val = 2;
    expect(updates).toEqual(3);
    s.val = 'bye';
    expect(updates).toEqual(4);
    sub.unsubscribe();
  });

  it('unions properly', () => {
    expect(ValueMap.union(
               valueMap(
                   {key: 'foo', val: int(1)},
                   {key: 'bar', val: str('hello')},
                   ),
               valueMap(
                   {key: 'foo', val: int(1)},
                   {key: 'baz', val: ints(1, 2, 3)},
                   ),
               valueMap(
                   {key: 'baz', val: ints(1, 2, 3)},
                   {key: 'bar', val: str('hello')},
                   ),
               ))
        .toEqual(valueMap(
            {key: 'foo', val: int(1)},
            {key: 'bar', val: str('hello')},
            {key: 'baz', val: ints(1, 2, 3)},
            ));
    expect(() => {
      ValueMap.union(
          valueMap(
              {key: 'foo', val: int(1)},
              {key: 'bar', val: str('hello')},
              ),
          valueMap(
              {key: 'foo', val: int(2)},
              {key: 'baz', val: ints(1, 2, 3)},
              ),
      );
    }).toThrow();
  });
});
