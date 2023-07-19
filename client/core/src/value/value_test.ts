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

import {strs, str, strSet, dbl, dur, ts, int, ints, intSet} from './test_value.js';
import {Value, V, ValueType, fromV} from './value.js';
import {Duration} from '../duration/duration.js';
import {Timestamp} from '../timestamp/timestamp.js';

describe('value test', () => {
  it('converts to and from json', () => {
    interface Test {
      json: string;
      v: V;
      value: Value;
    }
    const tests: Test[]=[
      {
        json: '[ 1, "hello" ]',
        v: [ValueType.STRING, 'hello'],
        value: str('hello'),
      },
      {
        json: '[ 3, [ "a", "b", "c" ] ]',
        v: [ValueType.STRINGS, ['a', 'b', 'c']],
        value: strs('a', 'b', 'c'),
      },
      {
        json: '[ 5, 3 ]',
        v: [ValueType.INTEGER, 3],
        value: int(3),
      },
      {
        json: '[ 6, [ 1, 2, 3, 4 ] ]',
        v: [ValueType.INTEGERS, [1, 2, 3, 4]],
        value: ints(1, 2, 3, 4),
      },
      {
        json: '[ 7, 3.14159 ]',
        v: [ValueType.DOUBLE, 3.14159],
        value: dbl(3.14159),
      },
      {
        json: '[ 8, 150000000 ]',
        v: [ValueType.DURATION, 150000000],
        value: dur(new Duration(150000000)),
      },
      {
        json: '[9, [ 500, 100 ] ]',
        v: [ValueType.TIMESTAMP, [500, 100]],
        value: ts(new Timestamp(500, 100)),
      },
    ];
    for (const [idx, test] of tests.entries()) {
      expect(fromV(JSON.parse(test.json) as V, []))
        .withContext(`testcase ${idx}`)
        .toEqual(test.value);
      expect(test.value.toV()).withContext(`testcase ${idx}`).toEqual(test.v);
      expect(JSON.parse(test.json) as V)
        .withContext(`testcase ${idx}`)
        .toEqual(test.v);
      expect(fromV(test.v, []))
        .withContext(`testcase ${idx}`)
        .toEqual(test.value);
    }
    // A handful of types don't do symmetric conversion.  For those, test
    // what we can.
    expect(fromV(JSON.parse(`[ 2, 0 ]`) as V, ['hello']))
      .toEqual(str('hello'));
    expect(fromV(JSON.parse(`[ 4, [ 0, 1, 2] ]`) as V, ['a', 'b', 'c']))
      .toEqual(strs('a', 'b', 'c'));
    expect(JSON.stringify(strSet('c', 'a', 'b').toV()))
      .toEqual(`[ 3, [ "a", "b", "c" ] ]`.replace(/\s/g, ''));
    expect(JSON.stringify(intSet(3, 1, 2).toV()))
      .toEqual(`[ 6, [ 1, 2, 3 ] ]`.replace(/\s/g, ''));
  });

  it('serializes and deserializes', () => {
    const sval=str('a');
    expect(sval.val).toEqual('a');
    expect(sval.exportTo()).toEqual('a');
    expect(sval.importFrom('b')).toBeTrue();
    expect(sval.val).toEqual('b');

    const ssval=strs('a', 'b');
    expect(ssval.val).toEqual(['a', 'b']);
    expect(ssval.exportTo()).toEqual(['a', 'b']);
    expect(ssval.importFrom(['b', 'c'])).toBeTrue();
    expect(ssval.val).toEqual(['b', 'c']);

    const ssetval=strSet('a', 'b');
    expect(ssetval.val).toEqual(new Set(['a', 'b']));
    expect(ssetval.exportTo()).toEqual(['a', 'b']);
    expect(ssetval.importFrom(['b', 'c'])).toBeTrue();
    expect(ssetval.val).toEqual(new Set(['b', 'c']));

    const ival=int(10);
    expect(ival.val).toEqual(10);
    expect(ival.exportTo()).toEqual(10);
    expect(ival.importFrom(20)).toBeTrue();
    expect(ival.val).toEqual(20);

    const isval=ints(10, 20);
    expect(isval.val).toEqual([10, 20]);
    expect(isval.exportTo()).toEqual([10, 20]);
    expect(isval.importFrom([20, 30])).toBeTrue();
    expect(isval.val).toEqual([20, 30]);

    const isetval=intSet(10, 20);
    expect(isetval.val).toEqual(new Set([10, 20]));
    expect(isetval.exportTo()).toEqual([10, 20]);
    expect(isetval.importFrom([20, 30])).toBeTrue();
    expect(isetval.val).toEqual(new Set([20, 30]));

    const dblval=dbl(3.5);
    expect(dblval.val).toEqual(3.5);
    expect(dblval.exportTo()).toEqual(3.5);
    expect(dblval.importFrom(5.5)).toBeTrue();
    expect(dblval.val).toEqual(5.5);

    const durval=dur(new Duration(1000));
    expect(durval.val).toEqual(new Duration(1000));
    expect(durval.exportTo()).toEqual(1000);
    expect(durval.importFrom(2000)).toBeTrue();
    expect(durval.val).toEqual(new Duration(2000));

    const tsval=ts(new Timestamp(1000, 500));
    expect(tsval.val).toEqual(new Timestamp(1000, 500));
    expect(tsval.exportTo()).toEqual({seconds: 1000, nanos: 500});
    expect(tsval.importFrom({seconds: 2000, nanos: 300})).toBeTrue();
    expect(tsval.val).toEqual(new Timestamp(2000, 300));
  });

  it('updates subscribers', () => {
    const got1: number[]=[];
    const got2: number[]=[];
    const ival=int(10);
    const sub1=ival.subscribe(() => {
      got1.push(ival.val);
    });
    ival.val=12;
    const sub2=ival.subscribe(() => {
      got2.push(ival.val);
    });
    // Updating ival with the value it already contains does not push to
    // subscribers.
    ival.val=12;
    // Integers take the floor of their number arguments.  12.345 floors to 12,
    // so the value does not broadcast an update.
    ival.val=12.345;
    ival.val=10;
    sub1.unsubscribe();
    ival.val=13;
    sub2.unsubscribe();
    expect(got1).toEqual([10, 12, 10]);
    expect(got2).toEqual([12, 10, 13]);
  });

  it('folds and includes properly', () => {
    interface Test {
      target: Value;
      toggle?: boolean;
      replace?: boolean;
      other: Value;
      final: Value;
    }
    const tests: Test[]=[
      {
        target: str('hello'),
        other: str('goodbye'),
        final: str('goodbye'),
      },
      {
        // Toggling a scalar means setting it to its zero value.
        target: str('hello'),
        other: str('hello'),
        final: str(''),
      },
      {
        // Replacing in a list overwrites the entire list.
        target: strs('hello', 'welcome'),
        replace: true,
        other: strs('farewell', 'goodbye'),
        final: strs('farewell', 'goodbye'),
      },
      {
        // If toggling, not replacing, and the two lists are equal, fold appends
        // other onto the end of the receiver.
        target: strs('hello', 'welcome'),
        other: strs('farewell', 'goodbye'),
        final: strs('hello', 'welcome', 'farewell', 'goodbye'),
      },
      {
        // Lists don't toggle unless exactly equal.
        target: strs('hello', 'welcome'),
        // this scalar is treated as a list.
        other: str('hello'),
        final: strs('hello', 'welcome', 'hello'),
      },
      {
        // Lists don't toggle unless exactly equal.
        target: strs('hello', 'welcome'),
        other: strs('hello', 'welcome'),
        final: strs(),
      },
      {
        // Replacing in a set overwrites the entire set.
        target: strSet('hello', 'welcome'),
        replace: true,
        other: strSet('farewell', 'goodbye'),
        final: strSet('farewell', 'goodbye'),
      },
      {
        // If not replacing, elements are toggled in individually.
        target: strSet('hello', 'welcome'),
        other: strSet('farewell', 'goodbye'),
        final: strSet('hello', 'welcome', 'farewell', 'goodbye'),
      },
      {
        // Sets toggle per-element.
        target: strSet('hello', 'welcome'),
        // this scalar is treated as a set.
        other: str('hello'),
        final: strSet('welcome'),
      },
      {
        // ...unless toggle is false.
        target: strSet('hello', 'welcome'),
        toggle: false,
        other: strSet('hello'),
        final: strSet('hello', 'welcome'),
      },
      {
        target: int(1),
        other: int(2),
        final: int(2),
      },
      {
        // Toggling a scalar means setting it to its zero value.
        target: int(1),
        other: int(1),
        final: int(0),
      },
      {
        // Replacing in a list overwrites the entire list.
        target: ints(1, 2),
        replace: true,
        other: ints(3, 4),
        final: ints(3, 4),
      },
      {
        // If toggling, not replacing, and the two lists are equal, fold appends
        // other onto the end of the receiver.
        target: ints(1, 2),
        other: ints(3, 4),
        final: ints(1, 2, 3, 4),
      },
      {
        // Lists don't toggle unless exactly equal.
        target: ints(1, 2),
        // this scalar is treated as a list.
        other: int(1),
        final: ints(1, 2, 1),
      },
      {
        // Lists don't toggle unless exactly equal.
        target: ints(1, 2),
        other: ints(1, 2),
        final: ints(),
      },
      {
        // Replacing in a set overwrites the entire set.
        target: intSet(1, 2),
        replace: true,
        other: intSet(3, 4),
        final: intSet(3, 4),
      },
      {
        // If not replacing, elements are toggled in individually.
        target: intSet(1, 2),
        other: intSet(3, 4),
        final: intSet(1, 2, 3, 4),
      },
      {
        // Sets toggle per-element.
        target: intSet(1, 2),
        // this scalar is treated as a set.
        other: int(1),
        final: intSet(2),
      },
      {
        // ...unless toggle is false.
        target: intSet(1, 2),
        toggle: false,
        other: intSet(1),
        final: intSet(1, 2),
      }
    ];
    for (const [idx, test] of tests.entries()) {
      const toggle=(test.toggle!==undefined)? test.toggle:true;
      const replace=(test.replace!==undefined)? test.replace:false;
      expect(test.target.fold(test.other, toggle, replace))
        .withContext(`testcase ${idx}`)
        .toBeTrue();
      // if target includes final and final includes target, they're equal.
      expect(test.target.includes(test.final))
        .withContext(`testcase ${idx}`)
        .toBeTrue();
      expect(test.final.includes(test.target))
        .withContext(`testcase ${idx}`)
        .toBeTrue();
    }
  });

  it('subscribes properly', () => {
    const s=str('a');
    const sVals: string[]=[];
    s.subscribe(() => {
      sVals.push(s.val);
    });
    s.val='b';
    s.val='c';
    s.val='c';
    expect(sVals).toEqual(['a', 'b', 'c']);

    const sl=strs('a', 'b', 'c');
    const slVals: string[][]=[];
    sl.subscribe(() => {
      slVals.push(sl.val);
    });
    sl.val=['c', 'b', 'a'];
    sl.val=['c', 'b', 'a'];
    sl.val=['a', 'b'];
    expect(slVals).toEqual([
      ['a', 'b', 'c'],
      ['c', 'b', 'a'],
      ['a', 'b'],
    ]);

    const ss=strSet('a', 'b', 'c');
    const ssVals: Array<Set<string>>=[];
    ss.subscribe(() => {
      ssVals.push(ss.val);
    });
    ss.val=new Set(['c', 'b', 'a']);
    ss.val=new Set(['b', 'a']);
    expect(ssVals).toEqual([
      new Set(['a', 'b', 'c']),
      new Set(['a', 'b']),
    ]);

    const i=int(1);
    const iVals: number[]=[];
    i.subscribe(() => {
      iVals.push(i.val);
    });
    i.val=2;
    i.val=3;
    expect(iVals).toEqual([1, 2, 3]);

    const il=ints(1, 2, 3);
    const ilVals: number[][]=[];
    il.subscribe(() => {
      ilVals.push(il.val);
    });
    il.val=[3, 2, 1];
    il.val=[3, 2, 1];
    il.val=[1, 2];
    expect(ilVals).toEqual([
      [1, 2, 3],
      [3, 2, 1],
      [1, 2],
    ]);

    const is=intSet(1, 2, 3);
    const isVals: Array<Set<number>>=[];
    is.subscribe(() => {
      isVals.push(is.val);
    });
    is.val=new Set([3, 1, 2]);
    is.val=new Set([1, 2]);
    expect(isVals).toEqual([
      new Set([1, 2, 3]),
      new Set([1, 2]),
    ]);

    const d=dbl(.5);
    const dVals: number[]=[];
    d.subscribe(() => {
      dVals.push(d.val);
    });
    d.val=1.5;
    d.val=1.5;
    d.val=2.5;
    expect(dVals).toEqual([.5, 1.5, 2.5]);

    const duration=dur(new Duration(1000));
    const durVals: Duration[]=[];
    duration.subscribe(() => {
      durVals.push(duration.val);
    });
    duration.val=new Duration(2000);
    duration.val=new Duration(2000), duration.val=new Duration(3000);
    expect(durVals).toEqual([
      new Duration(1000),
      new Duration(2000),
      new Duration(3000),
    ]);

    const timestamp=ts(new Timestamp(1000, 0));
    const tsVals: Timestamp[]=[];
    timestamp.subscribe(() => {
      tsVals.push(timestamp.val);
    });
    timestamp.val=new Timestamp(2000, 0);
    timestamp.val=new Timestamp(2000, 0),
      timestamp.val=new Timestamp(3000, 0);
    expect(tsVals).toEqual([
      new Timestamp(1000, 0),
      new Timestamp(2000, 0),
      new Timestamp(3000, 0),
    ]);
  });

  it('includes properly', () => {
    expect(strSet('a', 'b', 'c').includes(str('a'))).toBeTrue();
    expect(strSet('a', 'b', 'c').includes(strs('a', 'b'))).toBeTrue();
    expect(strs('a').includes(str('a'))).toBeTrue();
    expect(intSet(1, 2, 3).includes(int(1))).toBeTrue();
    expect(intSet(1, 2, 3).includes(ints(1, 2))).toBeTrue();
    expect(ints(1).includes(int(1))).toBeTrue();

    // Lists never include sets.
    expect(strs('a', 'b', 'c').includes(strSet('a', 'b', 'c'))).toBeFalse();
    expect(ints(1, 2, 3).includes(intSet(3, 1, 2))).toBeFalse();
  });

  it('compares properly', () => {
    expect(strSet('a', 'b', 'c').compare(str('a'))).toBeGreaterThan(0);
    expect(strSet('c', 'b', 'a').compare(strSet('a', 'd', 'b')))
      .toBeLessThan(0);
    expect(strSet('d', 'b', 'a').compare(strSet('a', 'c', 'b')))
      .toBeGreaterThan(0);
    expect(strSet('c', 'b', 'a').compare(strs('a', 'd', 'b'))).toBeLessThan(0);
    expect(strSet('d', 'b', 'a').compare(strs('a', 'c', 'b')))
      .toBeGreaterThan(0);
    expect(strs('a', 'b', 'c').compare(str('a'))).toBeGreaterThan(0);
    expect(strs('a', 'b', 'c').compare(strs('c', 'b', 'a'))).toBeLessThan(0);
    expect(strs('a').compare(strs('a', 'c', 'b'))).toBeLessThan(0);
    expect(str('a').compare(str('b'))).toBeLessThan(0);
    expect(str('b').compare(str('b'))).toBe(0);
    expect(str('c').compare(str('b'))).toBeGreaterThan(0);
    expect(intSet(0, 1, 2).compare(int(0))).toBeGreaterThan(0);
    expect(intSet(2, 1, 0).compare(intSet(0, 3, 1))).toBeLessThan(0);
    expect(intSet(3, 1, 0).compare(intSet(0, 2, 1))).toBeGreaterThan(0);
    expect(intSet(2, 1, 0).compare(ints(0, 3, 1))).toBeLessThan(0);
    expect(intSet(3, 1, 0).compare(ints(0, 2, 1))).toBeGreaterThan(0);
    expect(ints(0, 1, 2).compare(int(0))).toBeGreaterThan(0);
    expect(ints(0, 1, 2).compare(ints(2, 1, 0))).toBeLessThan(0);
    expect(ints(0).compare(ints(0, 2, 1))).toBeLessThan(0);
    expect(int(0).compare(int(1))).toBeLessThan(0);
    expect(int(1).compare(int(1))).toBe(0);
    expect(int(2).compare(int(1))).toBeGreaterThan(0);
    expect(dbl(-.5).compare(dbl(0))).toBeLessThan(0);
    expect(dbl(0.5).compare(dbl(.5))).toBe(0);
    expect(dbl(1.5).compare(dbl(1))).toBeGreaterThan(0);
    expect(dur(new Duration(0)).compare(dur(new Duration(1000))))
      .toBeLessThan(0);
    expect(dur(new Duration(1000)).compare(dur(new Duration(1000)))).toBe(0);
    expect(dur(new Duration(2000)).compare(dur(new Duration(1000))))
      .toBeGreaterThan(0);
    expect(ts(new Timestamp(1000, 0)).compare(ts(new Timestamp(2000, 1000))))
      .toBeLessThan(0);
    expect(ts(new Timestamp(1000, 1000)).compare(ts(new Timestamp(1000, 1000))))
      .toBe(0);
    expect(ts(new Timestamp(1000, 2000)).compare(ts(new Timestamp(0, 1000))))
      .toBeGreaterThan(0);

    expect(str('a').compare(strs('a', 'b'))).not.toBe(0);
    expect(str('a').compare(strSet('a', 'b'))).not.toBe(0);
    expect(str('a').compare(int(1))).not.toBe(0);
    expect(str('a').compare(ints(1, 2))).not.toBe(0);
    expect(str('a').compare(intSet(1, 2))).not.toBe(0);
    expect(str('a').compare(dbl(.5))).not.toBe(0);
    expect(str('a').compare(dur(new Duration(1000)))).not.toBe(0);
    expect(str('a').compare(ts(new Timestamp(1000, 1000)))).not.toBe(0);
    expect(strs('a', 'b').compare(strSet('a', 'b'))).not.toBe(0);
    expect(strs('a', 'b').compare(int(1))).not.toBe(0);
    expect(strs('a', 'b').compare(ints(1, 2))).not.toBe(0);
    expect(strs('a', 'b').compare(intSet(1, 2))).not.toBe(0);
    expect(strs('a', 'b').compare(dbl(.5))).not.toBe(0);
    expect(strs('a', 'b').compare(dur(new Duration(1000)))).not.toBe(0);
    expect(strs('a', 'b').compare(ts(new Timestamp(1000, 1000)))).not.toBe(0);
    expect(strSet('a', 'b').compare(int(1))).not.toBe(0);
    expect(strSet('a', 'b').compare(ints(1, 2))).not.toBe(0);
    expect(strSet('a', 'b').compare(intSet(1, 2))).not.toBe(0);
    expect(strSet('a', 'b').compare(dbl(.5))).not.toBe(0);
    expect(strSet('a', 'b').compare(dur(new Duration(1000)))).not.toBe(0);
    expect(strSet('a', 'b').compare(ts(new Timestamp(1000, 1000)))).not.toBe(0);
    expect(int(1).compare(str('a'))).not.toBe(0);
    expect(int(1).compare(strs('a', 'b'))).not.toBe(0);
    expect(int(1).compare(strSet('a', 'b'))).not.toBe(0);
    expect(int(1).compare(ints(1, 2))).not.toBe(0);
    expect(int(1).compare(intSet(1, 2))).not.toBe(0);
    expect(int(1).compare(dbl(.5))).not.toBe(0);
    expect(int(1).compare(dur(new Duration(1000)))).not.toBe(0);
    expect(int(1).compare(ts(new Timestamp(1000, 1000)))).not.toBe(0);
    expect(ints(1, 2).compare(str('a'))).not.toBe(0);
    expect(ints(1, 2).compare(strs('a', 'b'))).not.toBe(0);
    expect(ints(1, 2).compare(strSet('a', 'b'))).not.toBe(0);
    expect(ints(1, 2).compare(intSet(1, 2))).not.toBe(0);
    expect(ints(1, 2).compare(dbl(.5))).not.toBe(0);
    expect(ints(1, 2).compare(dur(new Duration(1000)))).not.toBe(0);
    expect(ints(1, 2).compare(ts(new Timestamp(1000, 1000)))).not.toBe(0);
    expect(intSet(1, 2).compare(str('a'))).not.toBe(0);
    expect(intSet(1, 2).compare(strs('a', 'b'))).not.toBe(0);
    expect(intSet(1, 2).compare(strSet('a', 'b'))).not.toBe(0);
    expect(intSet(1, 2).compare(dbl(.5))).not.toBe(0);
    expect(intSet(1, 2).compare(dur(new Duration(1000)))).not.toBe(0);
    expect(intSet(1, 2).compare(ts(new Timestamp(1000, 1000)))).not.toBe(0);
    expect(dbl(1.5).compare(str('a'))).not.toBe(0);
    expect(dbl(1.5).compare(strs('a', 'b'))).not.toBe(0);
    expect(dbl(1.5).compare(strSet('a', 'b'))).not.toBe(0);
    expect(dbl(1.5).compare(int(1))).not.toBe(0);
    expect(dbl(1.5).compare(ints(1, 2))).not.toBe(0);
    expect(dbl(1.5).compare(intSet(1, 2))).not.toBe(0);
    expect(dbl(1.5).compare(dur(new Duration(1000)))).not.toBe(0);
    expect(dbl(1.5).compare(ts(new Timestamp(1000, 1000)))).not.toBe(0);
    expect(dur(new Duration(1000)).compare(str('a'))).not.toBe(0);
    expect(dur(new Duration(1000)).compare(strs('a', 'b'))).not.toBe(0);
    expect(dur(new Duration(1000)).compare(strSet('a', 'b'))).not.toBe(0);
    expect(dur(new Duration(1000)).compare(int(1))).not.toBe(0);
    expect(dur(new Duration(1000)).compare(ints(1, 2))).not.toBe(0);
    expect(dur(new Duration(1000)).compare(intSet(1, 2))).not.toBe(0);
    expect(dur(new Duration(1000)).compare(dbl(1.5))).not.toBe(0);
    expect(dur(new Duration(1000)).compare(ts(new Timestamp(1000, 1000))))
      .not.toBe(0);
    expect(ts(new Timestamp(1000, 1000)).compare(str('a'))).not.toBe(0);
    expect(ts(new Timestamp(1000, 1000)).compare(strs('a', 'b'))).not.toBe(0);
    expect(ts(new Timestamp(1000, 1000)).compare(strSet('a', 'b'))).not.toBe(0);
    expect(ts(new Timestamp(1000, 1000)).compare(int(1))).not.toBe(0);
    expect(ts(new Timestamp(1000, 1000)).compare(ints(1, 2))).not.toBe(0);
    expect(ts(new Timestamp(1000, 1000)).compare(intSet(1, 2))).not.toBe(0);
    expect(ts(new Timestamp(1000, 1000)).compare(dbl(1.5))).not.toBe(0);
    expect(ts(new Timestamp(1000, 1000)).compare(dur(new Duration(1000))))
      .not.toBe(0);
  });
});
