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

import { prettyPrintDocumenter } from '../documentation/test_documentation.js';
import { int, intSet, str, strs, strSet, valueMap } from '../value/test_value.js';
import { IntegerValue } from '../value/value.js';
import { ValueMap } from '../value/value_map.js';
import { ValueRef } from '../value/value_reference.js';
import { LocalValue, FixedValue } from '../value/value_reference.js';
import { Action, And, Clear, Equals, Extend, GreaterThan, Includes, Interactions, LessThan, Not, Or, Reaction, Set as SetP, SetIfEmpty, Toggle, Update, Watch } from './interactions.js';

describe('interactions test', () => {
    it('clears fixed values', () => {
        const labels = strs('a', 'b');
        const clear = new Clear([new FixedValue(labels)]);
        clear.update();
        expect(labels.val).toEqual([]);
    });

    it('clears local values', () => {
        const ids = strs('a', 'b');
        const vm = valueMap({ key: 'ids', val: ids });
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
            { key: 'ids', val: ids },
            { key: 'other_ids', val: strs('c', 'd') },
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
            { key: 'ids', val: ids },
            { key: 'other_ids', val: strSet('b', 'c') },
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
            { key: 'id', val: id },
            { key: 'other_id', val: int(3) },
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
            { key: 'ids', val: ids },
            { key: 'other_ids', val: strs('c', 'd') },
        );
        const ext = new Extend(new LocalValue('ids'), new LocalValue('other_ids'));
        ext.update(vm);
        expect(ids.val).toEqual(['a', 'b', 'c', 'd']);
    });

    it('sets-if-empty fixed values', () => {
        const labels = strs();
        const otherLabels = strs('a', 'b');
        const moreLabels = strs('c', 'd');
        const sie = new SetIfEmpty(new FixedValue(labels), new FixedValue(otherLabels));
        sie.update();
        expect(labels.val).toEqual(['a', 'b']);
        const sie2 = new SetIfEmpty(new FixedValue(labels), new FixedValue(moreLabels));
        sie2.update();
        expect(labels.val).toEqual(['a', 'b']);
    });

    it('sets-if-empty local values', () => {
        const ids = strs();
        const vm = valueMap(
            { key: 'ids', val: ids },
            { key: 'other_ids', val: strs('a', 'b') },
            { key: 'more_ids', val: strs('c', 'd') },
        );
        const sie = new SetIfEmpty(new LocalValue('ids'), new LocalValue('other_ids'));
        sie.update(vm);
        expect(ids.val).toEqual(['a', 'b']);
        const sie2 = new SetIfEmpty(new LocalValue('ids'), new LocalValue('more_ids'));
        sie2.update(vm);
        expect(ids.val).toEqual(['a', 'b']);
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
            { key: 'weight', val: weight },
        );

        const tickerTape: string[] = [];
        boundsChecker.match()(vm).subscribe((m: boolean) => {
            tickerTape.push(`${weight.val}: ${m}`);
        });
        for (const val of [6, 7, 8, 9, 10, 11, 12]) {
            weight.val = val;
        }
        expect(tickerTape).toEqual([
            '0: false', '6: true', '7: false',
            '8: true', '10: false', '12: true',
        ]);

    });


    it('watches', () => {
        const highlightedStartOffset = int(100);
        const highlightedEndOffset = int(200);
        const vm = valueMap(
            { key: 'highlightedStartOffset', val: highlightedStartOffset },
            { key: 'highlightedEndOffset', val: highlightedEndOffset },
        );
        const w = new Watch('highlight range', vm);
        const tickerTape: string[][] = [];
        const sub = w.watch((vm: ValueMap) => {
            tickerTape.push(
                Array.from(vm.keys()).map((key) =>
                    `${key}: ${vm.get(key).toString()}`));
        });
        highlightedStartOffset.val = 50;
        expect(tickerTape).toEqual([
            ['highlightedStartOffset: 100', 'highlightedEndOffset: 200'],
            ['highlightedStartOffset: 100', 'highlightedEndOffset: 200'],
            ['highlightedStartOffset: 50', 'highlightedEndOffset: 200'],
        ]);
        // Close out the error channel, ending the watch.  🫡
        sub.next(null);
        sub.complete();
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
        const highlightedStartOffset = int(100);
        const highlightedEndOffset = int(200);
        const timerangeVM = valueMap(
            { key: 'highlightedStartOffset', val: highlightedStartOffset },
            { key: 'highlightedEndOffset', val: highlightedEndOffset },
        );
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

            override update(localState?: ValueMap | undefined) {
                const val = this.vr.get(localState) as IntegerValue;
                val.val = val.val + 1;
            }

            override get autoDocument(): string {
                return `bumps ${this.vr.label()}`;
            }
        }

        // Provide an action with a 
        const bumpWeightOnClick = new Action('weight', 'click', [new Bump(weightRef)]).withHelpText("Upon 'click' on a 'weight', bumps that 'weight'.", /* documentChildren= */ false);

        const interactions = new Interactions()
            .withAction(new Action('series', 'clear', [new Clear([labelRef])]))
            .withAction(bumpWeightOnClick)
            .withReaction(new Reaction('series', 'highlight', new Includes(labelsRef, labelRef)))
            .withReaction(new Reaction('graph', 'show info', boundsChecker))
            .withWatch(new Watch('highlight timerange', timerangeVM));

        // Confirm self-documentation
        expect(prettyPrintDocumenter(interactions).join('\n')).toEqual(`Interactions (Interactions)
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
  Trigger 'highlight timerange' on changes to [highlightedStartOffset, highlightedEndOffset] (Watch)`);

        // Confirm interactions
        const label = str('thing');
        const weight = int(0);
        const vm = valueMap(
            { key: 'label', val: label },
            { key: 'weight', val: weight },
        );

        const tickerTape: string[] = [];
        interactions.match('graph', 'show info')(vm).subscribe((m: boolean) => {
            tickerTape.push(`${weight.val}: ${m}`);
        });
        for (let i = 0; i < 12; i++) {
            interactions.update('weight', 'click', vm);
        }
        expect(tickerTape).toEqual([
            '0: false', '6: true', '7: false',
            '8: true', '10: false', '12: true',
        ]);
    });
});