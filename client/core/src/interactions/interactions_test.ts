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

import {prettyPrintDocumenter} from '../documentation/test_documentation.js';

import {Action, And, Case, Changed, Clear, Concat, Equals, Extend, GreaterThan, If, Includes, Interactions, LessThan, Not, Or, PopLeft, PushLeft, Reaction, Set as SetP, SetIfEmpty, Swap, Switch, Toggle, True, Update, Watch} from './interactions.js';

import {dbl, int, ints, intSet, str, strs, strSet, valueMap} from '../value/test_value.js';
import {IntegerValue} from '../value/value.js';
import {ValueMap} from '../value/value_map.js';
import {ValueRef} from '../value/value_reference.js';
import {LocalValue, FixedValue} from '../value/value_reference.js';
import {Subject} from 'rxjs';


describe('interactions test', () => {
  it('clears fixed values', () => {
    const labels = strs('a', 'b');
    const clear = new Clear([new FixedValue(labels)]);
    clear.update();
    expect(labels.val).toEqual([]);
  });

  it('clears local values', () => {
    const ids = strs('a', 'b');
    const vm = valueMap({key: 'ids', val: ids});
    const clear = new Clear([new LocalValue('ids')]);
    clear.update(vm);
    expect(ids.val).toEqual([]);
  });

  it('sets fixed values', () => {
    const labels = strs('a', 'b');
    const otherLabels = strs('c', 'd');
    const set = new SetP(new FixedValue(labels), new FixedValue(otherLabels));
    set.update();
    expect(labels.val).toEqual(['c', 'd']);
  });

  it('sets local values', () => {
    const ids = strs('a', 'b');
    const vm = valueMap(
        {key: 'ids', val: ids},
        {key: 'other_ids', val: strs('c', 'd')},
    );
    const set = new SetP(new LocalValue('ids'), new LocalValue('other_ids'));
    set.update(vm);
    expect(ids.val).toEqual(['c', 'd']);
  });

  it('toggles fixed values', () => {
    const labels = strSet('a', 'b');
    const otherLabels = strSet('b', 'c');
    const tog = new Toggle(new FixedValue(labels), new FixedValue(otherLabels));
    tog.update();
    expect(labels.val).toEqual(new Set(['a', 'c']));
  });

  it('toggles local values', () => {
    const ids = strSet('a', 'b');
    const vm = valueMap(
        {key: 'ids', val: ids},
        {key: 'other_ids', val: strSet('b', 'c')},
    );
    const tog = new Toggle(new LocalValue('ids'), new LocalValue('other_ids'));
    tog.update(vm);
    expect(ids.val).toEqual(new Set(['a', 'c']));
  });

  it('toggles-or-sets fixed values', () => {
    const id = int(3);
    const otherId = int(3);
    const tos = new Toggle(new FixedValue(id), new FixedValue(otherId));
    tos.update();
    expect(id.val).toEqual(0);
    tos.update();
    expect(id.val).toEqual(3);
  });

  it('toggles-or-sets local values', () => {
    const id = int(3);
    const vm = valueMap(
        {key: 'id', val: id},
        {key: 'other_id', val: int(3)},
    );
    const tog = new Toggle(new LocalValue('id'), new LocalValue('other_id'));
    tog.update(vm);
    expect(id.val).toEqual(0);
    tog.update(vm);
    expect(id.val).toEqual(3);
  });

  it('extends fixed values', () => {
    const labels = strs('a', 'b');
    const otherLabels = strs('c', 'd');
    const ext = new Extend(new FixedValue(labels), new FixedValue(otherLabels));
    ext.update();
    expect(labels.val).toEqual(['a', 'b', 'c', 'd']);
  });

  it('extends local values', () => {
    const ids = strs('a', 'b');
    const vm = valueMap(
        {key: 'ids', val: ids},
        {key: 'other_ids', val: strs('c', 'd')},
    );
    const ext = new Extend(new LocalValue('ids'), new LocalValue('other_ids'));
    ext.update(vm);
    expect(ids.val).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sets-if-empty fixed values', () => {
    const labels = strs();
    const otherLabels = strs('a', 'b');
    const moreLabels = strs('c', 'd');
    const sie =
        new SetIfEmpty(new FixedValue(labels), new FixedValue(otherLabels));
    sie.update();
    expect(labels.val).toEqual(['a', 'b']);
    const sie2 =
        new SetIfEmpty(new FixedValue(labels), new FixedValue(moreLabels));
    sie2.update();
    expect(labels.val).toEqual(['a', 'b']);
  });

  it('sets-if-empty local values', () => {
    const ids = strs();
    const vm = valueMap(
        {key: 'ids', val: ids},
        {key: 'other_ids', val: strs('a', 'b')},
        {key: 'more_ids', val: strs('c', 'd')},
    );
    const sie =
        new SetIfEmpty(new LocalValue('ids'), new LocalValue('other_ids'));
    sie.update(vm);
    expect(ids.val).toEqual(['a', 'b']);
    const sie2 =
        new SetIfEmpty(new LocalValue('ids'), new LocalValue('more_ids'));
    sie2.update(vm);
    expect(ids.val).toEqual(['a', 'b']);
  });

  it('swaps compatible values', () => {
    const id = str('a');
    const otherId = str('b');
    const swap = new Swap(new FixedValue(id), new FixedValue(otherId));
    swap.update();
    expect(id.val).toEqual('b');
    expect(otherId.val).toEqual('a');
  });

  it('throws error when trying to swap incompatible values', () => {
    const id = str('a');
    const otherId = int(1);
    const swap = new Swap(new FixedValue(id), new FixedValue(otherId));
    expect(() => swap.update()).toThrowError();
  });

  it('pushes compatible values', () => {
    const sIds = strs('a');
    const otherSId = str('b');
    const otherSIds = strs('c', 'd');
    const spush = new PushLeft([
      new FixedValue(sIds), new FixedValue(otherSId), new FixedValue(otherSIds)
    ]);
    spush.update();
    expect(sIds.val).toEqual(['b', 'c', 'd', 'a']);

    const iIds = ints(0);
    const otherIId = int(1);
    const otherIIds = ints(2, 3);
    const ipush = new PushLeft([
      new FixedValue(iIds), new FixedValue(otherIId), new FixedValue(otherIIds)
    ]);
    ipush.update();
    expect(iIds.val).toEqual([1, 2, 3, 0]);
  });

  it('throws error when trying to push incompatible values', () => {
    expect(() => (new PushLeft([])).update()).toThrowError();

    expect(() => (new PushLeft([
                   new FixedValue(strs('a')),
                   new FixedValue(int(0)),
                 ])).update())
        .toThrowError();

    expect(() => (new PushLeft([
                   new FixedValue(str('a')),
                   new FixedValue(str('b')),
                 ])).update())
        .toThrowError();

    expect(() => (new PushLeft([
                   new FixedValue(ints(0)),
                   new FixedValue(dbl(1.5)),
                 ])).update())
        .toThrowError();

    expect(() => (new PushLeft([
                   new FixedValue(int(0)),
                   new FixedValue(int(1)),
                 ])).update())
        .toThrowError();
  });

  it('pops', () => {
    const sIds = strs('a', 'b', 'c');
    const spop = new PopLeft(new FixedValue(sIds));
    spop.update();
    expect(sIds.val).toEqual(['b', 'c']);

    const iIds = ints(0, 1, 2);
    const ipop = new PopLeft(new FixedValue(iIds));
    ipop.update();
    expect(iIds.val).toEqual([1, 2]);
  });

  it('concats compatible values', () => {
    const id = str('a');
    const otherId = str('b');
    const concat = new Concat([new FixedValue(id), new FixedValue(otherId)]);
    concat.update();
    expect(id.val).toEqual('ab');
  });

  it('handles complex predicate', () => {
    // Construct a predicate on a local value 'weight' that is only
    // true when 'weight' is above 5 and below 10, with two exceptions:
    // 7 yields false, and 12 yields true.
    const lowerBound = new FixedValue(int(5));
    const upperBound = new FixedValue(int(10));
    const forbidden = new FixedValue(int(7));
    const allowed = new FixedValue(intSet(12));
    const weightRef = new LocalValue('weight');
    const boundsChecker = new Or([
      new And([
        new GreaterThan(weightRef, lowerBound),
        new LessThan(weightRef, upperBound),
        new Not(new Equals(weightRef, forbidden)),
      ]),
      new Includes(allowed, weightRef),
    ]);
    const weight = int(0);
    const vm = valueMap(
        {key: 'weight', val: weight},
    );

    const tickerTape: string[] = [];
    boundsChecker.match()(vm).subscribe((m: boolean) => {
      tickerTape.push(`${weight.val}: ${m}`);
    });
    for (const val of [6, 7, 8, 9, 10, 11, 12]) {
      weight.val = val;
    }
    expect(tickerTape).toEqual([
      '0: false',
      '6: true',
      '7: false',
      '8: true',
      '10: false',
      '12: true',
    ]);
  });

  it('conditionally executes with if', () => {
    const numberText = str('');
    const numberTextWrap = new FixedValue(numberText);
    const val = int(0);
    const valWrap = new FixedValue(val);
    const cond = new If(
        new Equals(valWrap, new FixedValue(int(0))),
        new SetP(numberTextWrap, new FixedValue(str('none'))),
        new If(
            new Equals(valWrap, new FixedValue(int(1))),
            new SetP(numberTextWrap, new FixedValue(str('one'))),
            new SetP(numberTextWrap, new FixedValue(str('several'))),
            ));
    expect(numberText.val).toEqual('');
    cond.update();
    expect(numberText.val).toEqual('none');
    val.val = 3;
    cond.update();
    expect(numberText.val).toEqual('several');
    val.val = 1;
    cond.update();
    expect(numberText.val).toEqual('one');
  });

  it('conditionally executes with switch', () => {
    const numberText = str('');
    const numberTextWrap = new FixedValue(numberText);
    const val = int(0);
    const valWrap = new FixedValue(val);
    const cond = new Switch([
      new Case(
          new Equals(valWrap, new FixedValue(int(0))),
          [new SetP(numberTextWrap, new FixedValue(str('none')))]),
      new Case(
          new Equals(valWrap, new FixedValue(int(1))),
          [new SetP(numberTextWrap, new FixedValue(str('one')))]),
      new Case(
          new True(),
          [new SetP(numberTextWrap, new FixedValue(str('several')))]),
    ]);
    expect(numberText.val).toEqual('');
    cond.update();
    expect(numberText.val).toEqual('none');
    val.val = 3;
    cond.update();
    expect(numberText.val).toEqual('several');
    val.val = 1;
    cond.update();
    expect(numberText.val).toEqual('one');
  });

  it('detects changes', () => {
    const ref = str('a');
    const changed = new Changed(new Array(new FixedValue(ref)));
    const out: boolean[] = [];
    changed.match()().subscribe((v) => {
      out.push(v);
    });
    expect(out).toEqual([true, false]);
    ref.val = 'b';
    expect(out).toEqual([true, false, true, false]);
  });

  it('watches', () => {
    const highlightedStartOffset = int(100);
    const highlightedEndOffset = int(200);
    const vm = valueMap(
        {key: 'highlightedStartOffset', val: highlightedStartOffset},
        {key: 'highlightedEndOffset', val: highlightedEndOffset},
    );
    const w = new Watch('highlight range', vm);
    const tickerTape: string[][] = [];
    const unsub = new Subject<void>();
    w.watch((vm: ValueMap) => {
      tickerTape.push(Array.from(vm.keys()).map(
          (key) => `${key}: ${vm.get(key).toString()}`));
    }, unsub);
    highlightedStartOffset.val = 50;
    expect(tickerTape).toEqual([
      ['highlightedStartOffset: 100', 'highlightedEndOffset: 200'],
      ['highlightedStartOffset: 100', 'highlightedEndOffset: 200'],
      ['highlightedStartOffset: 50', 'highlightedEndOffset: 200'],
    ]);
    // Close out the error channel, ending the watch.  🫡
    unsub.next();
    unsub.complete();
    highlightedEndOffset.val = 150;
    expect(tickerTape).toEqual([
      ['highlightedStartOffset: 100', 'highlightedEndOffset: 200'],
      ['highlightedStartOffset: 100', 'highlightedEndOffset: 200'],
      ['highlightedStartOffset: 50', 'highlightedEndOffset: 200'],
    ]);
  });

  it('interacts', () => {
    const labels = strs('a', 'b');
    const labelsRef = new FixedValue(labels, 'labels');
    const labelRef = new LocalValue('label');
    const lowerBound = new FixedValue(int(5), 'lower bound');
    const upperBound = new FixedValue(int(10), 'upper bound');
    const forbidden = new FixedValue(int(7), 'forbidden');
    const allowed = new FixedValue(intSet(12), 'allowed');
    const weightRef = new LocalValue('weight');
    const boundsChecker = new Or([
      new And([
        new GreaterThan(weightRef, lowerBound),
        new LessThan(weightRef, upperBound),
        new Not(new Equals(weightRef, forbidden)),
      ]),
      new Includes(allowed, weightRef),
    ]);

    // Custom Updates, Predicates, and Watches also work.
    class Bump extends Update {
      constructor(readonly vr: ValueRef) {
        super();
      }

      override update(localState?: ValueMap|undefined) {
        const val = this.vr.get(localState) as IntegerValue;
        val.val = val.val + 1;
      }

      override get autoDocument(): string {
        return `bumps ${this.vr.label()}`;
      }
    }

    // Provide an action with a
    const bumpWeightOnClick =
        new Action('weight', 'click', [new Bump(weightRef)])
            .withHelpText(
                'Upon \'click\' on a \'weight\', bumps that \'weight\'.',
                /* documentChildren= */ false);

    const start = int(3);
    const end = int(10);
    const interactions =
        new Interactions()
            .withAction(new Action('series', 'clear', [new Clear([labelRef])]))
            .withAction(bumpWeightOnClick)
            .withReaction(new Reaction(
                'series', 'highlight', new Includes(labelsRef, labelRef)))
            .withReaction(new Reaction('graph', 'show info', boundsChecker))
            .withWatch(new Watch(
                'highlight range',
                valueMap(
                    {key: 'start', val: start},
                    {key: 'end', val: end},
                    )));

    // Confirm watchAll invokes callbacks and relays thrown errors.
    {
      let errCount = 0;
      let invocationCount = 0;
      const unsub = new Subject<void>();
      interactions
          .watchAll(
              new Map([
                [
                  'highlight range',
                  (vm) => {
                    invocationCount++;
                    if (vm.expectNumber('start') > vm.expectNumber('end')) {
                      throw new Error('oops');
                    }
                  }
                ],
              ]),
              unsub)
          .subscribe((err) => {
            errCount++;
          });
      expect(errCount).toBe(0);
      expect(invocationCount).toBe(2);
      start.val = 5;
      expect(errCount).toBe(0);
      expect(invocationCount).toBe(3);
      end.val = 1;
      expect(errCount).toBe(1);
      expect(invocationCount).toBe(4);
      unsub.next();
      unsub.complete();
      end.val = 10;
      expect(invocationCount).toBe(4);
    }

    // Confirm self-documentation
    expect(prettyPrintDocumenter(interactions).join('\n'))
        .toEqual(`Interactions (Interactions)
  Upon 'clear' on 'series' (Action)
    clears [local value 'label'] (Update)
  Upon 'click' on a 'weight', bumps that 'weight'. (Action)
  Performs 'highlight' on 'series' (Reaction)
    when value 'labels' includes local value 'label' (Predicate)
  Performs 'show info' on 'graph' (Reaction)
    OR (Predicate)
      AND (Predicate)
        when local value 'weight' > value 'lower bound' (Predicate)
        when local value 'weight' < value 'upper bound' (Predicate)
        NOT (Predicate)
          when local value 'weight' == value 'forbidden' (Predicate)
      when value 'allowed' includes local value 'weight' (Predicate)
  Trigger 'highlight range' on changes to arguments (Watch)`);

    // Confirm interactions
    const label = str('thing');
    const weight = int(0);
    const vm = valueMap(
        {key: 'label', val: label},
        {key: 'weight', val: weight},
    );

    const tickerTape: string[] = [];
    interactions.match('graph', 'show info')(vm).subscribe((m: boolean) => {
      tickerTape.push(`${weight.val}: ${m}`);
    });
    for (let i = 0; i < 12; i++) {
      interactions.update('weight', 'click', vm);
    }
    expect(tickerTape).toEqual([
      '0: false',
      '6: true',
      '7: false',
      '8: true',
      '10: false',
      '12: true',
    ]);
  });
});
