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

/**
 * @fileoverview A set of interactions directives.
 */

import { AfterContentInit, ContentChild, ContentChildren, Directive, forwardRef, Input, QueryList } from '@angular/core';
import { Action, And, Changed, ConfigurationError, Equals, Extend, GreaterThan, Includes, Interactions, LessThan, Not, Or, Predicate, Reaction, SetIfEmpty, Severity, Toggle, SetOrClear, ValueRef, Watch } from 'traceviz-client-core';
import { Clear, Update, Set as SetU } from 'traceviz-client-core';
import { ValueDirective } from './value.directive';
import { ValueMapDirective } from './value_map.directive';

const SOURCE = 'interactions.directive';

export abstract class UpdateDirective {
    protected errorMessage: string;
    constructor(selector: string) {
        this.errorMessage = `'get' method on '${selector}' directive should not be called before ContentInit.`;
    }
    abstract get(): Update;
}

@Directive({
    selector: 'clear',
    providers: [{
        provide: UpdateDirective,
        useExisting: forwardRef(() => ClearDirective)
    }],
})
export class ClearDirective extends UpdateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private clear: Clear | undefined;

    constructor() {
        super('clear');
    }

    ngAfterContentInit(): void {
        const valueRefs: ValueRef[] = [];
        for (const valueDirective of this.valueDirectives) {
            valueRefs.push(valueDirective);
        }
        if (valueRefs.length === 0) {
            this.errorMessage = `'clear' takes at least one argument.`;
        }
        this.clear = new Clear(valueRefs);
    }

    override get(): Update {
        if (this.clear === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.clear;
    }
}

@Directive({
    selector: 'set',
    providers: [{
        provide: UpdateDirective,
        useExisting: forwardRef(() => SetDirective)
    }],
})
export class SetDirective extends UpdateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private set: SetU | undefined;

    constructor() {
        super('clear');
    }

    ngAfterContentInit(): void {
        const valueRefs: ValueRef[] = [];
        for (const valueDirective of this.valueDirectives) {
            valueRefs.push(valueDirective);
        }
        if (valueRefs.length === 2) {
            this.set = new SetU(valueRefs[0], valueRefs[1]);
        } else {
            this.errorMessage = `'set' takes exactly two arguments.`;
        }
    }

    override get(): Update {
        if (this.set === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.set;
    }
}

@Directive({
    selector: 'toggle',
    providers: [{
        provide: UpdateDirective,
        useExisting: forwardRef(() => ToggleDirective)
    }],
})
export class ToggleDirective extends UpdateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private toggle: Toggle | undefined;

    constructor() {
        super('toggle');
    }

    ngAfterContentInit(): void {
        const valueRefs: ValueRef[] = [];
        for (const valueDirective of this.valueDirectives) {
            valueRefs.push(valueDirective);
        }
        if (valueRefs.length === 2) {
            this.toggle = new Toggle(valueRefs[0], valueRefs[1]);
        } else {
            this.errorMessage = `'toggle' takes exactly two arguments.`;
        }
    }

    override get(): Update {
        if (this.toggle === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.toggle;
    }
}

@Directive({
    selector: 'toggle-or-set',
    providers: [{
        provide: UpdateDirective,
        useExisting: forwardRef(() => SetOrClearDirective)
    }],
})
export class SetOrClearDirective extends UpdateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private tos: SetOrClear | undefined;

    constructor() {
        super('toggle-or-set');
    }

    ngAfterContentInit(): void {
        const valueRefs: ValueRef[] = [];
        for (const valueDirective of this.valueDirectives) {
            valueRefs.push(valueDirective);
        }
        if (valueRefs.length === 2) {
            this.tos = new SetOrClear(valueRefs[0], valueRefs[1]);
        } else {
            this.errorMessage = `'toggle-or-set' takes exactly two arguments.`;
        }
    }

    override get(): Update {
        if (this.tos === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.tos;
    }
}

@Directive({
    selector: 'extend',
    providers: [{
        provide: UpdateDirective,
        useExisting: forwardRef(() => ExtendDirective)
    }],
})
export class ExtendDirective extends UpdateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private extend: Extend | undefined;

    constructor() {
        super('extend');
    }

    ngAfterContentInit(): void {
        const valueRefs: ValueRef[] = [];
        for (const valueDirective of this.valueDirectives) {
            valueRefs.push(valueDirective);
        }
        if (valueRefs.length === 2) {
            this.extend = new Extend(valueRefs[0], valueRefs[1]);
        } else {
            this.errorMessage = `'extend' takes exactly two arguments.`;
        }
    }

    override get(): Update {
        if (this.extend === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.extend;
    }
}

@Directive({
    selector: 'set-if-empty',
    providers: [{
        provide: UpdateDirective,
        useExisting: forwardRef(() => SetIfEmptyDirective)
    }],
})
export class SetIfEmptyDirective extends UpdateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private sie: SetIfEmpty | undefined;

    constructor() {
        super('set-if-empty');
    }

    ngAfterContentInit(): void {
        const valueRefs: ValueRef[] = [];
        for (const valueDirective of this.valueDirectives) {
            valueRefs.push(valueDirective);
        }
        if (valueRefs.length === 2) {
            this.sie = new SetIfEmpty(valueRefs[0], valueRefs[1]);
        } else {
            this.errorMessage = `'set-if-empty' takes exactly two arguments.`;
        }
    }

    override get(): Update {
        if (this.sie === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.sie;
    }
}

@Directive({
    selector: 'action',
})
export class ActionDirective {
    @ContentChildren(UpdateDirective) updateDirectives = new QueryList<UpdateDirective>();
    @Input() target: string = '';
    @Input() type: string = '';
    private action: Action | undefined;

    get(): Action {
        if (this.action !== undefined) {
            return this.action;
        }
        const updates: Update[] = [];
        for (const updateDirective of this.updateDirectives) {
            updates.push(updateDirective.get());
        }
        this.action = new Action(this.target, this.type, updates);
        return this.action;
    }
}

export abstract class PredicateDirective {
    protected errorMessage: string;
    constructor(selector: string) {
        this.errorMessage = `'get' method on '${selector}' directive should not be called before ContentInit.`;
    }
    abstract get(): Predicate;
}

@Directive({
    selector: 'changed',
    providers: [{
        provide: PredicateDirective,
        useExisting: forwardRef(() => ChangedDirective)
    }],
})
export class ChangedDirective extends PredicateDirective implements AfterContentInit {
    @ContentChild(ValueDirective) valueDirective: ValueDirective | undefined;
    @Input() sinceMs = 0;
    private changed: Changed | undefined;

    constructor() {
        super('changed');
    }

    ngAfterContentInit(): void {
        if (this.valueDirective === undefined) {
            this.errorMessage = `'changed' takes exactly one argument.`;
            return;
        }
        this.changed = new Changed(this.valueDirective, this.sinceMs);
    }

    override get(): Predicate {
        if (this.changed === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.changed;
    }
}

@Directive({
    selector: 'not',
    providers: [{
        provide: PredicateDirective,
        useExisting: forwardRef(() => NotDirective)
    }],
})
export class NotDirective extends PredicateDirective {
    @ContentChild(PredicateDirective) predicateDirective: PredicateDirective | undefined;
    private not: Not | undefined;

    constructor() {
        super('not');
    }

    override get(): Predicate {
        if (this.not !== undefined) {
            return this.not;
        }
        if (this.predicateDirective === undefined) {
            throw new ConfigurationError(`'not' takes exactly one argument.`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        this.not = new Not(this.predicateDirective.get());
        return this.not;
    }
}

@Directive({
    selector: 'and',
    providers: [{
        provide: PredicateDirective,
        useExisting: forwardRef(() => AndDirective)
    }],
})
export class AndDirective extends PredicateDirective {
    @ContentChildren(PredicateDirective) predicateDirectives = new QueryList<PredicateDirective>();
    private and: And | undefined;

    constructor() {
        super('and');
    }

    override get(): Predicate {
        if (this.and !== undefined) {
            return this.and;
        }
        if (this.predicateDirectives.length < 2) {
            throw new ConfigurationError(`'and' takes at least two arguments.`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        const predicates: Predicate[] = [];
        for (const predicateDirective of this.predicateDirectives) {
            predicates.push(predicateDirective.get());
        }
        this.and = new And(predicates);
        return this.and;
    }
}

@Directive({
    selector: 'or',
    providers: [{
        provide: PredicateDirective,
        useExisting: forwardRef(() => OrDirective)
    }],
})
export class OrDirective extends PredicateDirective {
    @ContentChildren(PredicateDirective) predicateDirectives = new QueryList<PredicateDirective>();
    private or: Or | undefined;

    constructor() {
        super('or');
    }

    override get(): Predicate {
        if (this.or === undefined) {
            if (this.predicateDirectives.length < 2) {
                throw new ConfigurationError(`'or' takes at least two arguments.`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
            }
            const predicates: Predicate[] = [];
            for (const predicateDirective of this.predicateDirectives) {
                predicates.push(predicateDirective.get());
            }
            this.or = new Or(predicates);
        }
        return this.or;
    }
}

@Directive({
    selector: 'equals',
    providers: [{
        provide: PredicateDirective,
        useExisting: forwardRef(() => EqualsDirective)
    }],
})
export class EqualsDirective extends PredicateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private equals: Equals | undefined;

    constructor() {
        super('equals');
    }

    ngAfterContentInit(): void {
        const left = this.valueDirectives.get(0);
        const right = this.valueDirectives.get(1);
        if (left === undefined || right === undefined || this.valueDirectives.length !== 2) {
            this.errorMessage = `'equals' takes exactly two arguments.`;
            return;
        }
        this.equals = new Equals(left, right);
    }

    override get(): Predicate {
        if (this.equals === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.equals;
    }
}

@Directive({
    selector: 'less-than',
    providers: [{
        provide: PredicateDirective,
        useExisting: forwardRef(() => LessThanDirective)
    }],
})
export class LessThanDirective extends PredicateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private lessThan: LessThan | undefined;

    constructor() {
        super('less-than');
    }

    ngAfterContentInit(): void {
        const left = this.valueDirectives.get(0);
        const right = this.valueDirectives.get(1);
        if (left === undefined || right === undefined || this.valueDirectives.length !== 2) {
            this.errorMessage = `'less-than' takes exactly two arguments.`;
            return;
        }
        this.lessThan = new LessThan(left, right);
    }

    override get(): Predicate {
        if (this.lessThan === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.lessThan;
    }
}

@Directive({
    selector: 'greater-than',
    providers: [{
        provide: PredicateDirective,
        useExisting: forwardRef(() => GreaterThanDirective)
    }],
})
export class GreaterThanDirective extends PredicateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private greaterThan: GreaterThan | undefined;

    constructor() {
        super('greater-than');
    }

    ngAfterContentInit(): void {
        const left = this.valueDirectives.get(0);
        const right = this.valueDirectives.get(1);
        if (left === undefined || right === undefined || this.valueDirectives.length !== 2) {
            this.errorMessage = `'greater-than' takes exactly two arguments.`;
            return;
        }
        this.greaterThan = new GreaterThan(left, right);
    }

    override get(): Predicate {
        if (this.greaterThan === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.greaterThan;
    }
}

@Directive({
    selector: 'includes',
    providers: [{
        provide: PredicateDirective,
        useExisting: forwardRef(() => IncludesDirective)
    }],
})
export class IncludesDirective extends PredicateDirective implements AfterContentInit {
    @ContentChildren(ValueDirective) valueDirectives = new QueryList<ValueDirective>();
    private includes: Includes | undefined;

    constructor() {
        super('includes');
    }

    ngAfterContentInit(): void {
        const left = this.valueDirectives.get(0);
        const right = this.valueDirectives.get(1);
        if (left === undefined || right === undefined || this.valueDirectives.length !== 2) {
            this.errorMessage = `'includes' takes exactly two arguments.`;
            return;
        }
        this.includes = new Includes(left, right);
    }

    override get(): Predicate {
        if (this.includes === undefined) {
            throw new ConfigurationError(this.errorMessage)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        return this.includes;
    }
}

@Directive({
    selector: 'reaction',
})
export class ReactionDirective {
    @ContentChild(PredicateDirective) predicateDirective: PredicateDirective | undefined;
    @Input() target: string = '';
    @Input() type: string = '';
    private reaction: Reaction | undefined;

    get(): Reaction {
        if (this.reaction === undefined) {
            if (this.predicateDirective === undefined) {
                throw new ConfigurationError(`'reaction' must have one predicate.`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
            }
            this.reaction = new Reaction(this.target, this.type, this.predicateDirective.get());
        }
        return this.reaction;
    }
}

@Directive({
    selector: 'watch',
})
export class WatchDirective {
    @ContentChild(ValueMapDirective) valueMapDirective: ValueMapDirective | undefined;
    @Input() type: string = '';
    private watch: Watch | undefined;

    get(): Watch {
        if (this.watch === undefined) {
            if (this.valueMapDirective === undefined) {
                throw new ConfigurationError(`'watch' must have a 'value-map' argument.`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
            }
            this.watch = new Watch(this.type);
        }
        return this.watch
    }
}

@Directive({
    selector: 'interactions',
})
export class InteractionsDirective {
    @ContentChildren(ActionDirective) actionDirectives = new QueryList<ActionDirective>();
    @ContentChildren(ReactionDirective) reactionDirectives = new QueryList<ReactionDirective>();
    @ContentChildren(WatchDirective) watchDirectives = new QueryList<WatchDirective>();
    private interactions: Interactions | undefined;

    get(): Interactions {
        if (this.interactions === undefined) {
            this.interactions = new Interactions();
            for (const actionDirective of this.actionDirectives) {
                this.interactions.withAction(actionDirective.get());
            }
            for (const reactionDirective of this.reactionDirectives) {
                this.interactions.withReaction(reactionDirective.get());
            }
            for (const watchDirective of this.watchDirectives) {
                this.interactions.withWatch(watchDirective.get());
            }
        }
        return this.interactions;
    }
}