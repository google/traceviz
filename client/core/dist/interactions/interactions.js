/**
 * @fileoverview Interactions provide user-definable interactions on Values.
 * Interactions are the default mode of interactivity in TraceViz tools.
 * Examples include brushing on a timeline to zoom in, or clicking an item to
 * force a data refresh from the backend.
 *
 * An interaction comprises two halves: an action, in which a user action like
 * a click results in an update to one or more values; and a reaction, in which
 * a change to one or more values results in an effect such as a tooltip or a
 * backend data fetch.
 *
 * TraceViz provides three types for these half-interactions:
 *
 *   * `Update`, which TraceViz components can trigger to update values;
 *   * `Predicate`, which yields matches that TraceViz components can monitor to
 *      perform reactions;
 *   * `Watch`, which TraceViz components can use to invoke an arbitrary
 *      callback whenever any value in a map changes.
 *
 * The `Interactions` type groups zero or more Updates, Predicates, and Watches,
 * keying Updates and Predicates by target (e.g., 'row', 'node') and type (e.g.,
 * 'click', 'highlight'), and Watches by type.  A TraceViz component may
 * associate `Interactions`, defined in tool templates by tool builders, that
 * describe how the component should interact.
 */
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
import { BehaviorSubject, combineLatest, EMPTY, merge, ReplaySubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, mergeMap, takeUntil } from 'rxjs/operators';
import { DocumenterType } from '../documentation/documentation.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { EmptyValue, fromV, IntegerListValue, IntegerValue, StringListValue, StringValue } from '../value/value.js';
const SOURCE = 'interactions';
/**
 * A base class for directives serving as action updates.  Invoking the
 * 'update' method immediately performs the associated action(s).
 */
export class Update {
    documenterType;
    overrideDocument = '';
    documentChildren = true;
    constructor(documenterType = DocumenterType.UPDATE) {
        this.documenterType = documenterType;
    }
    get children() {
        return [];
    }
    withHelpText(helpText, documentChildren) {
        this.overrideDocument = helpText;
        this.documentChildren = documentChildren;
        return this;
    }
}
/**
 * An update that bundles several child updates, executing each in order when
 * it is updated.
 */
export class Do extends Update {
    updates;
    constructor(updates) {
        super();
        this.updates = updates;
    }
    update(localState) {
        for (const child of this.updates) {
            child.update(localState);
        }
    }
    get autoDocument() {
        return `does`;
    }
    get children() {
        return this.updates;
    }
}
/**
 * Conditionally executes its thenUpdate or elseUpdate based on the current
 * state of its pred predicate.
 */
export class If extends Update {
    pred;
    thenUpdate;
    elseUpdate;
    constructor(pred, thenUpdate, elseUpdate) {
        super();
        this.pred = pred;
        this.thenUpdate = thenUpdate;
        this.elseUpdate = elseUpdate;
    }
    update(localState) {
        const match = this.pred.match()(localState);
        const bs = new BehaviorSubject(false);
        const sub = match.subscribe(bs);
        if (bs.getValue()) {
            this.thenUpdate.update(localState);
        }
        else {
            this.elseUpdate?.update(localState);
        }
        sub.unsubscribe();
    }
    get autoDocument() {
        return `conditionally updates`;
    }
    get children() {
        const ret = [this.pred, this.thenUpdate];
        if (this.elseUpdate !== undefined) {
            ret.push(this.elseUpdate);
        }
        return ret;
    }
}
/**
 * Upon evaluation, executes its update if its predicate is satisfied.
 */
export class Case extends Update {
    pred;
    updates;
    constructor(pred, updates) {
        super();
        this.pred = pred;
        this.updates = updates;
    }
    update(localState) {
        this.execute(localState);
    }
    /**
     * Evaluates the current state of pred, returning that state.  Additionally,
     * if pred evaluates to true, updates all child updates.
     */
    execute(localState) {
        const match = this.pred.match()(localState);
        const bs = new BehaviorSubject(false);
        const sub = match.subscribe(bs);
        const success = bs.getValue();
        if (success) {
            for (const update of this.updates) {
                update.update(localState);
            }
        }
        sub.unsubscribe();
        return success;
    }
    get autoDocument() {
        return `case`;
    }
    get children() {
        const ret = [this.pred];
        for (const update of this.updates) {
            ret.push(update);
        }
        return ret;
    }
}
/**
 * Executes its set of cases until one is satisfied.
 */
export class Switch extends Update {
    cases;
    constructor(cases) {
        super();
        this.cases = cases;
    }
    update(localState) {
        for (const c of this.cases) {
            if (c.execute(localState)) {
                break;
            }
        }
    }
    get autoDocument() {
        return `switch`;
    }
    get children() {
        return this.cases;
    }
}
/** On update, clears its children. */
export class Clear extends Update {
    valueRefs;
    constructor(valueRefs) {
        super();
        this.valueRefs = valueRefs;
    }
    update(localState) {
        for (const vr of this.valueRefs) {
            const val = vr.get(localState);
            if (val === undefined) {
                return;
            }
            if (!val.fold(new EmptyValue(), /* toggle= */ false, /* replace = */ true)) {
                throw new ConfigurationError(`Can't clear ${vr.label()}.`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
            }
        }
    }
    get autoDocument() {
        return `clears [${this.valueRefs.map((vr) => vr.label()).join(', ')}]`;
    }
}
/** On update, sets its destination child from its source child. */
export class Set extends Update {
    destinationVR;
    sourceVR;
    constructor(destinationVR, sourceVR) {
        super();
        this.destinationVR = destinationVR;
        this.sourceVR = sourceVR;
    }
    update(localState) {
        const destinationValue = this.destinationVR.get(localState);
        const sourceValue = this.sourceVR.get(localState);
        if (destinationValue === undefined || sourceValue === undefined) {
            return;
        }
        if (!destinationValue.fold(sourceValue, /* toggle= */ false, /* replace= */ true)) {
            throw new ConfigurationError(`Can't set ${this.destinationVR.label()} from ${this.sourceVR.label()}.`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
    }
    get autoDocument() {
        return `sets ${this.destinationVR.label()} from ${this.sourceVR.label()}.`;
    }
}
/** On update, toggles its destination child from its source child. */
export class Toggle extends Update {
    destinationVR;
    sourceVR;
    constructor(destinationVR, sourceVR) {
        super();
        this.destinationVR = destinationVR;
        this.sourceVR = sourceVR;
    }
    update(localState) {
        const destinationValue = this.destinationVR.get(localState);
        const sourceValue = this.sourceVR.get(localState);
        if (destinationValue === undefined || sourceValue === undefined) {
            return;
        }
        if (!destinationValue.fold(sourceValue, /* toggle= */ true, /* replace= */ false)) {
            throw new ConfigurationError(`Can't toggle ${this.destinationVR.label()} from ${this.sourceVR.label()}.`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
    }
    get autoDocument() {
        return `toggles ${this.destinationVR.label()} from ${this.sourceVR.label()}.`;
    }
}
/**
 * On update, clears its destination child if it is equal to its source child,
 * or sets the destination from the source if they are not equal.
 */
export class SetOrClear extends Update {
    destinationVR;
    sourceVR;
    constructor(destinationVR, sourceVR) {
        super();
        this.destinationVR = destinationVR;
        this.sourceVR = sourceVR;
    }
    update(localState) {
        const destinationValue = this.destinationVR.get(localState);
        const sourceValue = this.sourceVR.get(localState);
        if (destinationValue === undefined || sourceValue === undefined) {
            return;
        }
        if (!destinationValue.fold(sourceValue, /* toggle= */ true, /* replace= */ true)) {
            throw new ConfigurationError(`Can't set-or-clear ${this.destinationVR.label()} from ${this.sourceVR.label()}.`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
    }
    get autoDocument() {
        return `sets-or-clears ${this.destinationVR.label()} from ${this.sourceVR.label()}.`;
    }
}
/** On update, extends its destination child from its source child. */
export class Extend extends Update {
    destinationVR;
    sourceVR;
    constructor(destinationVR, sourceVR) {
        super();
        this.destinationVR = destinationVR;
        this.sourceVR = sourceVR;
    }
    update(localState) {
        const destinationValue = this.destinationVR.get(localState);
        const sourceValue = this.sourceVR.get(localState);
        if (destinationValue === undefined || sourceValue === undefined) {
            return;
        }
        if (!destinationValue.fold(sourceValue, /* toggle= */ false, /* replace= */ false)) {
            throw new ConfigurationError(`Can't extend ${this.destinationVR.label()} from ${this.sourceVR.label()}.`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
    }
    get autoDocument() {
        return `extends ${this.destinationVR.label()} from ${this.sourceVR.label()}.`;
    }
}
/**
 * On update, sets its destination child, only if it is empty, from its
 * source child.
 */
export class SetIfEmpty extends Update {
    destinationVR;
    sourceVR;
    constructor(destinationVR, sourceVR) {
        super();
        this.destinationVR = destinationVR;
        this.sourceVR = sourceVR;
    }
    update(localState) {
        const destinationValue = this.destinationVR.get(localState);
        const sourceValue = this.sourceVR.get(localState);
        if (destinationValue === undefined || sourceValue === undefined ||
            destinationValue.compare(new EmptyValue()) !== 0) {
            return;
        }
        if (!destinationValue.fold(sourceValue, /* toggle= */ false, /* replace= */ true)) {
            throw new ConfigurationError(`Can't set-if-empty ${this.destinationVR.label()} from ${this.sourceVR.label()}.`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
    }
    get autoDocument() {
        return `sets ${this.destinationVR.label()}, if empty, from ${this.sourceVR.label()}.`;
    }
}
/** On update, swaps its two children's values. */
export class Swap extends Update {
    firstVR;
    secondVR;
    constructor(firstVR, secondVR) {
        super();
        this.firstVR = firstVR;
        this.secondVR = secondVR;
    }
    update(localState) {
        const firstValue = this.firstVR.get(localState);
        const secondValue = this.secondVR.get(localState);
        if (firstValue === undefined || secondValue === undefined) {
            return;
        }
        const tempValue = fromV(firstValue.toV(), []);
        if (!firstValue.fold(secondValue, /* toggle= */ false, /* replace= */ true)) {
            throw new ConfigurationError(`Can't set ${this.firstVR.label()} to ${this.secondVR.label()} for swap.`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        if (!secondValue.fold(tempValue, /* toggle= */ false, /* replace= */ true)) {
            throw new ConfigurationError(`Can't set ${this.secondVR.label()} to ${this.firstVR.label()} for swap.`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
    }
    get autoDocument() {
        return `swaps ${this.firstVR.label()} and ${this.secondVR.label()}.`;
    }
}
/**
 * Pops the leftmost item from the referenced value, which must be list-type.
 */
export class PopLeft extends Update {
    valueRef;
    constructor(valueRef) {
        super();
        this.valueRef = valueRef;
    }
    update(localState) {
        const listVal = this.valueRef.get(localState);
        if (listVal instanceof StringListValue || listVal instanceof IntegerListValue) {
            listVal.val = listVal.val.slice(1);
            return;
        }
        throw new ConfigurationError('PopLeft must have a single List-type Value argument.')
            .from(SOURCE)
            .at(Severity.ERROR);
    }
    get autoDocument() {
        return `pops the leftmost value of ${this.valueRef.label()}`;
    }
}
/**
 * Pushes the second through last referenced arguments' values, in order, onto
 * the left end of the first argument's referenced value.  The first argument
 * must reference a list-type value, and subsequent arguments must reference
 * compatible ordered types.  For example, if the first argument is a
 * StringList, subsequent arguments may be Strings or StringLists.
 */
export class PushLeft extends Update {
    valueRefs;
    constructor(valueRefs) {
        super();
        this.valueRefs = valueRefs;
    }
    update(localState) {
        if (this.valueRefs.length > 0) {
            let succeeded = true;
            const listVal = this.valueRefs[0].get(localState);
            if (listVal instanceof StringListValue) {
                let newVal = new Array();
                for (const valueRef of this.valueRefs.slice(1)) {
                    const value = valueRef.get(localState);
                    if (value instanceof StringValue) {
                        newVal.push(value.val);
                    }
                    else if (value instanceof StringListValue) {
                        newVal = newVal.concat(value.val);
                    }
                    else {
                        succeeded = false;
                        break;
                    }
                }
                if (succeeded) {
                    newVal = newVal.concat(listVal.val);
                    listVal.val = newVal;
                    return;
                }
            }
            if (listVal instanceof IntegerListValue) {
                let newVal = new Array();
                for (const valueRef of this.valueRefs.slice(1)) {
                    const value = valueRef.get(localState);
                    if (value instanceof IntegerValue) {
                        newVal.push(value.val);
                    }
                    else if (value instanceof IntegerListValue) {
                        newVal = newVal.concat(value.val);
                    }
                    else {
                        succeeded = false;
                        break;
                    }
                }
                if (succeeded) {
                    newVal = newVal.concat(listVal.val);
                    listVal.val = newVal;
                    return;
                }
            }
        }
        throw new ConfigurationError('PushLeft must have at least one argument, which must be a List-type Value.  All subsequent arguments must be of compatible types with the initial List.')
            .from(SOURCE)
            .at(Severity.ERROR);
    }
    get autoDocument() {
        return `pushes [${this.valueRefs.slice(1)
            .map((vr) => vr.label())
            .join(', ')}] on the left of ${this.valueRefs[0].label()}`;
    }
}
/**
 * On update, concatenates the values of children beyond the first child to the
 * first child.
 */
export class Concat extends Update {
    valueRefs;
    constructor(valueRefs) {
        super();
        this.valueRefs = valueRefs;
    }
    update(localState) {
        const vals = [];
        for (const vr of this.valueRefs) {
            const val = vr.get(localState);
            if (val instanceof StringValue) {
                vals.push(val);
            }
            else {
                throw new ConfigurationError(`Can't concatenate ${this.valueRefs.map((vr) => vr.label()).join(', ')}.`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
            }
        }
        if (vals.length === 0) {
            return;
        }
        let s = '';
        for (const v of vals) {
            s += v.val;
        }
        vals[0].val = s;
    }
    get autoDocument() {
        return `concatenates [${this.valueRefs.map((vr) => vr.label()).join(', ')}]`;
    }
}
/**
 * A user action of a specified type on a specified target.  Upon this action,
 * all provided updates are applied.
 */
export class Action extends Update {
    target;
    type;
    updates;
    constructor(target, type, updates) {
        super(DocumenterType.ACTION);
        this.target = target;
        this.type = type;
        this.updates = updates;
    }
    update(localState) {
        for (const child of this.updates) {
            child.update(localState);
        }
    }
    get autoDocument() {
        return `Upon '${this.type}' on '${this.target}'`;
    }
    get children() {
        return this.updates;
    }
    withHelpText(helpText, documentChildren) {
        super.withHelpText(helpText, documentChildren);
        return this;
    }
}
/**
 * A base class for directives serving as reaction predicates.  The 'match'
 * method yields a MatchFn which can be used to track the Predicate's current
 * value.
 */
export class Predicate {
    documenterType;
    overrideDocument = '';
    documentChildren = true;
    constructor(documenterType = DocumenterType.PREDICATE) {
        this.documenterType = documenterType;
    }
    get children() {
        return [];
    }
    withHelpText(helpText, documentChildren) {
        this.overrideDocument = helpText;
        this.documentChildren = documentChildren;
        return this;
    }
}
/**
 * Provides a matcher yielding true when any of its ValueRef arguments has
 * recently changed.
 */
export class Changed extends Predicate {
    valRefs;
    sinceMs;
    constructor(valRefs, sinceMs) {
        super();
        this.valRefs = valRefs;
        this.sinceMs = sinceMs;
    }
    match() {
        return (localState) => {
            const vals = new Array();
            for (const valRef of this.valRefs) {
                const val = valRef.get(localState);
                if (val !== undefined) {
                    vals.push(val);
                }
            }
            // Produce a boolean observable emitting 'true' for a period of time
            // after any of this.vals changes.
            const anyValChanged = merge(...vals).pipe(map(() => true));
            // If sinceMs is undefined, emit an instantaneous (rising-edge) pulse at
            // the moment of the change.  This functionality is for testing when
            // fakeAsync() and tick(0 are unavailable, but it can have unexpected
            // behavior: in particular, when a Changed predicate is a non-final
            // argument to another predicate using combineLatest, such as And, the
            // instantaneous 'true' output may never be observed.
            if (this.sinceMs === undefined) {
                return anyValChanged.pipe(mergeMap(() => [true, false]));
            }
            return merge(anyValChanged, anyValChanged.pipe(debounceTime(this.sinceMs), map(() => false)))
                .pipe(distinctUntilChanged());
        };
    }
    get autoDocument() {
        const names = this.valRefs.map((val) => val.label());
        return `when [${names.join(', ')}] changed within past ${this.sinceMs}ms`;
    }
}
/** A predicate which always returns 'true'. */
export class True extends Predicate {
    t = new BehaviorSubject(true);
    constructor() {
        super();
    }
    match() {
        return () => {
            return this.t;
        };
    }
    get autoDocument() {
        return 'TRUE';
    }
    get children() {
        return [];
    }
}
/** A predicate which always returns 'false'. */
export class False extends Predicate {
    f = new BehaviorSubject(false);
    constructor() {
        super();
    }
    match() {
        return () => {
            return this.f;
        };
    }
    get autoDocument() {
        return 'FALSE';
    }
    get children() {
        return [];
    }
}
/** Provides a matcher yielding the inverse of its Predicate argument. */
export class Not extends Predicate {
    x;
    constructor(x) {
        super();
        this.x = x;
    }
    match() {
        return (localState) => {
            return this.x.match()(localState)
                .pipe(map((v) => !v), distinctUntilChanged());
        };
    }
    get autoDocument() {
        return 'NOT';
    }
    get children() {
        return [this.x];
    }
}
/** Provides a matcher yielding the AND of its Predicate arguments. */
export class And extends Predicate {
    childPredicates;
    constructor(childPredicates) {
        super();
        this.childPredicates = childPredicates;
    }
    match() {
        return (localState) => {
            const childMatchers = this.childPredicates.map((child) => child.match()(localState));
            return combineLatest(childMatchers)
                .pipe(map((vals) => vals.reduce((prev, curr) => prev && curr, true)), distinctUntilChanged());
        };
    }
    get autoDocument() {
        return 'AND';
    }
    get children() {
        return this.childPredicates;
    }
}
/** Provides a matcher yielding the OR of its Predicate arguments. */
export class Or extends Predicate {
    childPredicates;
    constructor(childPredicates) {
        super();
        this.childPredicates = childPredicates;
    }
    match() {
        return (localState) => {
            const childMatchers = this.childPredicates.map((child) => child.match()(localState));
            return combineLatest(childMatchers)
                .pipe(map((vals) => vals.reduce((prev, curr) => prev || curr, false)), distinctUntilChanged());
        };
    }
    get autoDocument() {
        return 'OR';
    }
    get children() {
        return this.childPredicates;
    }
}
/**
 * Provides a matcher yielding true when its ValueRef arguments compare equal.
 */
export class Equals extends Predicate {
    x;
    y;
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
    match() {
        return (localState) => {
            const x = this.x.get(localState);
            const y = this.y.get(localState);
            if (x !== undefined && y !== undefined) {
                return combineLatest([x, y]).pipe(map((vals) => vals[0].compare(vals[1]) === 0), distinctUntilChanged());
            }
            return EMPTY;
        };
    }
    get autoDocument() {
        return `when ${this.x.label()} == ${this.y.label()}`;
    }
}
/**
 * Provides a matcher yielding true when its first ValueRef argument compares
 * less than its second ValueRef argument.
 */
export class LessThan extends Predicate {
    x;
    y;
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
    match() {
        return (localState) => {
            const x = this.x.get(localState);
            const y = this.y.get(localState);
            if (x !== undefined && y !== undefined) {
                return combineLatest([x, y]).pipe(map((vals) => vals[0].compare(vals[1]) < 0), distinctUntilChanged());
            }
            return EMPTY;
        };
    }
    get autoDocument() {
        return `when ${this.x.label()} < ${this.y.label()}`;
    }
}
/**
 * Provides a matcher yielding true when its first ValueRef argument compares
 * greater than its second ValueRef argument.
 */
export class GreaterThan extends Predicate {
    x;
    y;
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
    match() {
        return (localState) => {
            const x = this.x.get(localState);
            const y = this.y.get(localState);
            if (x !== undefined && y !== undefined) {
                return combineLatest([x, y]).pipe(map((vals) => vals[0].compare(vals[1]) > 0), distinctUntilChanged());
            }
            return EMPTY;
        };
    }
    get autoDocument() {
        return `when ${this.x.label()} > ${this.y.label()}`;
    }
}
/**
 * Provides a matcher yielding true when its first ValueRef argument includes
 * its second ValueRef argument.
 */
export class Includes extends Predicate {
    x;
    y;
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
    match() {
        return (localState) => {
            const x = this.x.get(localState);
            const y = this.y.get(localState);
            if (x !== undefined && y !== undefined) {
                return combineLatest([x, y]).pipe(map((vals) => vals[0].includes(vals[1])));
            }
            return EMPTY;
        };
    }
    get autoDocument() {
        return `when ${this.x.label()} includes ${this.y.label()}`;
    }
}
/**
 * Provides a matcher yielding true when its first ValueRef argument is a prefix
 * of its second ValueRef argument.
 */
export class PrefixOf extends Predicate {
    x;
    y;
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
    match() {
        return (localState) => {
            const x = this.x.get(localState);
            const y = this.y.get(localState);
            if (x !== undefined && y !== undefined) {
                return combineLatest([x, y]).pipe(map((vals) => vals[0].prefixOf(vals[1])));
            }
            return EMPTY;
        };
    }
    get autoDocument() {
        return `when ${this.x.label()} is a prefix of ${this.y.label()}`;
    }
}
/**
 * A reaction of a specified type on a specified target.  Upon this action,
 * all provided updates are applied.
 */
export class Reaction extends Predicate {
    target;
    type;
    predicate;
    constructor(target, type, predicate) {
        super(DocumenterType.REACTION);
        this.target = target;
        this.type = type;
        this.predicate = predicate;
    }
    match() {
        return this.predicate.match();
    }
    get autoDocument() {
        return `Performs '${this.type}' on '${this.target}'`;
    }
    get children() {
        return [this.predicate];
    }
    withHelpText(helpText, documentChildren) {
        super.withHelpText(helpText, documentChildren);
        return this;
    }
}
/**
 * A class used to invoke arbitrary callbacks when any Value in a ValueMap
 * changes.  The 'watch' method accepts a callback which is invoked, and
 * provided with the changed ValueMap, upon every Value change.  The 'watch'
 * method also returns an observable upon which any errors raised in the
 * callback are propagated;
 */
export class Watch {
    type;
    valueMap;
    documenterType = DocumenterType.WATCH;
    overrideDocument = '';
    documentChildren = true;
    constructor(type, valueMap) {
        this.type = type;
        this.valueMap = valueMap;
    }
    /**
     * Invokes the provided callback if the receiver's value map changes, until
     * the provided unsubscribe observable emits.  Returns an observable emitting
     * any errors thrown during callback invocation.
     */
    watch(cb, unsubscribe) {
        const ret = new ReplaySubject();
        this.valueMap.watch()
            .pipe(takeUntil(unsubscribe))
            .subscribe((vm) => {
            try {
                cb(vm);
            }
            catch (err) {
                ret.next(err);
            }
        });
        return ret;
    }
    get autoDocument() {
        return `Trigger '${this.type}' on changes to arguments`;
    }
    get children() {
        return [];
    }
    withHelpText(helpText, documentChildren) {
        this.overrideDocument = helpText;
        this.documentChildren = documentChildren;
        return this;
    }
}
/**
 * Bundles a set of actions and reactions keyed by target (e.g., 'rows') and
 * type (e.g., 'click', 'highlight'), and watches keyed by type (e.g.,
 * 'timeCallout'), supporting convenience accessors for each of them.
 */
export class Interactions {
    documenterType = DocumenterType.INTERACTIONS;
    overrideDocument = '';
    documentChildren = true;
    actionsByTargetAndType = new Map([]);
    reactionsByTargetAndType = new Map([]);
    watchesByType = new Map([]);
    withAction(action) {
        let actionsByType = this.actionsByTargetAndType.get(action.target);
        if (actionsByType === undefined) {
            actionsByType = new Map([]);
            this.actionsByTargetAndType.set(action.target, actionsByType);
        }
        actionsByType.set(action.type, action);
        return this;
    }
    withReaction(reaction) {
        let reactionsByType = this.reactionsByTargetAndType.get(reaction.target);
        if (reactionsByType === undefined) {
            reactionsByType = new Map([]);
            this.reactionsByTargetAndType.set(reaction.target, reactionsByType);
        }
        reactionsByType.set(reaction.type, reaction);
        return this;
    }
    withWatch(watch) {
        this.watchesByType.set(watch.type, watch);
        return this;
    }
    update(target, type, localValues) {
        const action = this.actionsByTargetAndType.get(target)?.get(type);
        if (action !== undefined) {
            action.update(localValues);
        }
    }
    match(target, type) {
        const reaction = this.reactionsByTargetAndType.get(target)?.get(type);
        if (reaction === undefined) {
            return () => EMPTY;
        }
        return reaction.match();
    }
    /**
     * Sets up a single watch on the specified type with the specified callback.
     * The callback will be invoked on watch changes until the provided
     * unsubscribe observable emits.  Returns an observable that emits any error
     * thrown by the callback.
     */
    watch(type, cb, unsubscribe) {
        const watch = this.watchesByType.get(type);
        if (watch === undefined) {
            return EMPTY;
        }
        return watch.watch(cb, unsubscribe);
    }
    /**
     * Sets up multiple watches at the same time.  The provided watchActions map
     * specifies which watches to set up, and what callback to apply when they
     * trigger.  Returns an observable that emits any error thrown by an invoked
     * callback.
     */
    watchAll(watchActions, unsubscribe) {
        const chans = [];
        for (const [type, cb] of watchActions) {
            const w = this.watchesByType.get(type);
            if (w !== undefined) {
                chans.push(w.watch(cb, unsubscribe));
            }
        }
        return merge(...chans).pipe(takeUntil(unsubscribe));
    }
    get autoDocument() {
        return `Interactions`;
    }
    get children() {
        const actions = [...this.actionsByTargetAndType.values()]
            .map((actionsByType) => [...actionsByType.values()])
            .flat();
        const reactions = [...this.reactionsByTargetAndType.values()]
            .map((reactionsByType) => [...reactionsByType.values()])
            .flat();
        const watches = [...this.watchesByType.values()];
        return [...actions, ...reactions, ...watches];
    }
    withHelpText(helpText, documentChildren) {
        this.overrideDocument = helpText;
        this.documentChildren = documentChildren;
        return this;
    }
    checkForSupportedActions(supportedTargetsAndTypes) {
        const supportedLookup = new Map([]);
        for (const [target, type] of supportedTargetsAndTypes) {
            if (supportedLookup.has(target)) {
                supportedLookup.get(target)?.push(type);
            }
            else {
                supportedLookup.set(target, [type]);
            }
        }
        for (const [target, actionsByType] of this.actionsByTargetAndType) {
            if (!supportedLookup.has(target)) {
                throw new ConfigurationError(`Action target '${target}' is not supported`);
            }
            for (const type of actionsByType.keys()) {
                if (!supportedLookup.get(target)?.includes(type)) {
                    throw new ConfigurationError(`Action type '${type}' on target '${target}' is not supported.`)
                        .from(SOURCE)
                        .at(Severity.ERROR);
                }
            }
        }
    }
    checkForSupportedReactions(supportedTargetsAndTypes) {
        const supportedLookup = new Map([]);
        for (const [target, type] of supportedTargetsAndTypes) {
            if (supportedLookup.has(target)) {
                supportedLookup.get(target)?.push(type);
            }
            else {
                supportedLookup.set(target, [type]);
            }
        }
        for (const [target, reactionsByType] of this.reactionsByTargetAndType) {
            if (!supportedLookup.has(target)) {
                throw new ConfigurationError(`Reaction target '${target}' is not supported`);
            }
            for (const type of reactionsByType.keys()) {
                if (!supportedLookup.get(target)?.includes(type)) {
                    throw new ConfigurationError(`Reaction type '${type}' on target '${target}' is not supported.`)
                        .from(SOURCE)
                        .at(Severity.ERROR);
                }
            }
        }
    }
    checkForSupportedWatches(supportedTypes) {
        for (const type of this.watchesByType.keys()) {
            if (!supportedTypes.includes(type)) {
                throw new ConfigurationError(`Watch type '${type}' is not supported.`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
            }
        }
    }
}
//# sourceMappingURL=interactions.js.map