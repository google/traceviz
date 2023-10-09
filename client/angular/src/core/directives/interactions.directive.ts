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
import { ConfigurationError, Severity } from 'traceviz-client-core';
import { Action, And, Case, Changed, Clear, Do, Equals, Extend, False, GreaterThan, If, Includes, Interactions, LessThan, Not, Or, Predicate, Reaction, Set as SetU, SetIfEmpty, SetOrClear, Switch, Toggle, True, Update, Watch } from 'traceviz-client-core';
import { ValueRef } from 'traceviz-client-core';
import { ValueDirective } from './value.directive';
import { ValueMapDirective } from './value_map.directive';

const SOURCE = 'interactions.directive';

/** An abstract base type for Update directives. */
export abstract class UpdateDirective {
  protected errorMessage: string;
  constructor(selector: string) {
    this.errorMessage = `'get' method on '${
        selector}' directive should not be called before ContentInit.`;
  }
  abstract get(): Update;
}

/** An abstract base type for Predicate directives. */
export abstract class PredicateDirective {
  protected errorMessage: string;
  constructor(selector: string) {
    this.errorMessage = `'get' method on '${
        selector}' directive should not be called before ContentInit.`;
  }
  abstract get(): Predicate;
}

/**
 * An update directive specifying actions to occur on a satisfied <if>
 * predicate.
 */
@Directive({
  selector: 'then',
  providers: [
    {provide: UpdateDirective, useExisting: forwardRef(() => ThenDirective)}
  ],
})
export class ThenDirective extends UpdateDirective {
  @ContentChildren(UpdateDirective) updateDs = new QueryList<UpdateDirective>();
  private doP: Do|undefined;

  constructor() {
    super('then');
  }

  override get(): Update {
    if (this.doP === undefined) {
      const updates: Update[] = [];
      for (const updateD of this.updateDs) {
        updates.push(updateD.get());
      }
      this.doP = new Do(updates);
    }
    return this.doP;
  }
}

/**
 * An update directive specifying actions to occur on an unsatisfied <if>
 * predicate.
 */
@Directive({
  selector: 'else',
  providers: [
    {provide: UpdateDirective, useExisting: forwardRef(() => ElseDirective)}
  ],
})
export class ElseDirective extends UpdateDirective {
  @ContentChildren(UpdateDirective) updateDs = new QueryList<UpdateDirective>();
  private doP: Do|undefined;

  constructor() {
    super('else');
  }

  override get(): Update {
    if (this.doP === undefined) {
      const updates: Update[] = [];
      for (const updateD of this.updateDs) {
        updates.push(updateD.get());
      }
      this.doP = new Do(updates);
    }
    return this.doP;
  }
}

/**
 * An update directive that conditionally executes child updates based on the
 * status of a child predicate.
 */
@Directive({
  selector: 'if',
  providers:
      [{provide: UpdateDirective, useExisting: forwardRef(() => IfDirective)}],
})
export class IfDirective extends UpdateDirective {
  @ContentChild(PredicateDirective) predD: PredicateDirective|undefined;
  @ContentChild(ThenDirective) thenD: ThenDirective|undefined;
  @ContentChild(ElseDirective) elseD: ElseDirective|undefined;

  private ifP: If|undefined;

  constructor() {
    super('if');
  }

  override get(): Update {
    if (this.ifP === undefined) {
      if (this.predD === undefined || this.thenD === undefined) {
        throw new ConfigurationError(
            `'if' must specify a predicate and a 'then' clause`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
      this.ifP = new If(this.predD.get(), this.thenD.get(), this.elseD?.get());
    }
    return this.ifP;
  }
}

/**
 * A directive, used under 'switch', that executes its update if its predicate
 * is satisfied.
 */
@Directive({
  selector: 'case',
  providers: [
    {provide: UpdateDirective, useExisting: forwardRef(() => CaseDirective)}
  ],
})
export class CaseDirective extends UpdateDirective {
  @ContentChild(PredicateDirective) predD: PredicateDirective|undefined;
  @ContentChildren(UpdateDirective) updateDs = new QueryList<UpdateDirective>();

  private case: Case|undefined;

  constructor() {
    super('case');
  }

  get(): Case {
    if (this.case === undefined) {
      if (this.predD === undefined) {
        throw new ConfigurationError(`'case' must specify a predicate`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
      const updates = new Array<Update>();
      for (const updateD of this.updateDs) {
        updates.push(updateD.get());
      }
      this.case = new Case(this.predD.get(), updates);
    }
    return this.case;
  }
}

/**
 * An update directive that evaluates its cases in definition order, returning
 * when any is satisfied.
 */
@Directive({
  selector: 'switch',
  providers: [
    {provide: UpdateDirective, useExisting: forwardRef(() => SwitchDirective)}
  ],
})
export class SwitchDirective extends UpdateDirective {
  @ContentChildren(CaseDirective) caseDs = new QueryList<CaseDirective>();

  private switchP: Switch|undefined;

  constructor() {
    super('switch');
  }

  override get(): Update {
    if (this.switchP === undefined) {
      const cases = new Array<Case>();
      for (const caseD of this.caseDs) {
        cases.push(caseD.get());
      }
      this.switchP = new Switch(cases);
    }
    return this.switchP;
  }
}

/** An Update directive that clears its argument. */
@Directive({
  selector: 'clear',
  providers: [
    {provide: UpdateDirective, useExisting: forwardRef(() => ClearDirective)}
  ],
})
export class ClearDirective extends UpdateDirective implements
    AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private clear: Clear|undefined;

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

/**
 * An Update directive that sets the value of its first argument to the value
 * of its second argument.
 */
@Directive({
  selector: 'set',
  providers:
      [{provide: UpdateDirective, useExisting: forwardRef(() => SetDirective)}],
})
export class SetDirective extends UpdateDirective implements AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private set: SetU|undefined;

  constructor() {
    super('set');
  }

  ngAfterContentInit(): void {
    const valueRefs: ValueRef[] = [];
    for (const valueDirective of this.valueDirectives) {
      valueRefs.push(valueDirective);
    }
    if (valueRefs.length === 2) {
      this.set = new SetU(valueRefs[0], valueRefs[1]);
    } else {
      this.errorMessage =
          `'set' takes exactly two arguments (got ${valueRefs.length}).`;
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

/**
 * An Update directive that toggles the value of its first argument by the value
 * of its second argument.
 */
@Directive({
  selector: 'toggle',
  providers: [
    {provide: UpdateDirective, useExisting: forwardRef(() => ToggleDirective)}
  ],
})
export class ToggleDirective extends UpdateDirective implements
    AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private toggle: Toggle|undefined;

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

/**
 * An Update directive that toggles or sets the value of its first argument by
 * the value of its second argument.
 */
@Directive({
  selector: 'set-or-clear',
  providers: [{
    provide: UpdateDirective,
    useExisting: forwardRef(() => SetOrClearDirective)
  }],
})
export class SetOrClearDirective extends UpdateDirective implements
    AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private tos: SetOrClear|undefined;

  constructor() {
    super('set-or-clear');
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

/**
 * An Update directive that extends the value of its first argument by the value
 * of its second argument.
 */
@Directive({
  selector: 'extend',
  providers: [
    {provide: UpdateDirective, useExisting: forwardRef(() => ExtendDirective)}
  ],
})
export class ExtendDirective extends UpdateDirective implements
    AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private extend: Extend|undefined;

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

/**
 * An Update directive that sets the value of its first argument to the value
 * of its second argument if the former is empty.
 */
@Directive({
  selector: 'set-if-empty',
  providers: [{
    provide: UpdateDirective,
    useExisting: forwardRef(() => SetIfEmptyDirective)
  }],
})
export class SetIfEmptyDirective extends UpdateDirective implements
    AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private sie: SetIfEmpty|undefined;

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

/** A directive specifying Updates to be applied upon a user action. */
@Directive({
  selector: 'action',
})
export class ActionDirective {
  @ContentChildren(UpdateDirective)
  updateDirectives = new QueryList<UpdateDirective>();
  @Input() target = '';
  @Input() type = '';
  protected action: Action|undefined;

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

/** A Predicate directive triggered when its argument's value has changed. */
@Directive({
  selector: 'changed',
  providers: [{
    provide: PredicateDirective,
    useExisting: forwardRef(() => ChangedDirective)
  }],
})
export class ChangedDirective extends PredicateDirective implements
    AfterContentInit {
  @ContentChild(ValueDirective) valueDirective: ValueDirective|undefined;
  @Input() sinceMs = 0;
  private changed: Changed|undefined;

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

/** A Predicate directive that is always satisfied. */
@Directive({
  selector: 'true',
  providers: [
    {provide: PredicateDirective, useExisting: forwardRef(() => TrueDirective)}
  ],
})
export class TrueDirective extends PredicateDirective {
  @ContentChild(PredicateDirective)
  predicateDirective: PredicateDirective|undefined;
  private readonly t = new True();

  constructor() {
    super('true');
  }

  override get(): Predicate {
    return this.t;
  }
}

/** A Predicate directive that is never satisfied. */
@Directive({
  selector: 'false',
  providers: [
    {provide: PredicateDirective, useExisting: forwardRef(() => FalseDirective)}
  ],
})
export class FalseDirective extends PredicateDirective {
  @ContentChild(PredicateDirective)
  predicateDirective: PredicateDirective|undefined;
  private readonly f = new False();

  constructor() {
    super('false');
  }

  override get(): Predicate {
    return this.f;
  }
}

/** A Predicate directive inverting the sense of its (predicate) argument. */
@Directive({
  selector: 'not',
  providers: [
    {provide: PredicateDirective, useExisting: forwardRef(() => NotDirective)}
  ],
})
export class NotDirective extends PredicateDirective {
  @ContentChild(PredicateDirective)
  predicateDirective: PredicateDirective|undefined;
  private not: Not|undefined;

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

/**
 * A Predicate directive triggered when all its (predicate) arguments are true.
 */
@Directive({
  selector: 'and',
  providers: [
    {provide: PredicateDirective, useExisting: forwardRef(() => AndDirective)}
  ],
})
export class AndDirective extends PredicateDirective {
  @ContentChildren(PredicateDirective)
  predicateDirectives = new QueryList<PredicateDirective>();
  private and: And|undefined;

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

/**
 * A Predicate directive triggered when any of its (predicate) arguments is
 * true.
 */
@Directive({
  selector: 'or',
  providers: [
    {provide: PredicateDirective, useExisting: forwardRef(() => OrDirective)}
  ],
})
export class OrDirective extends PredicateDirective {
  @ContentChildren(PredicateDirective)
  predicateDirectives = new QueryList<PredicateDirective>();
  private or: Or|undefined;

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

/**
 * A Predicate directive triggered when its two arguments' values are equal.
 */
@Directive({
  selector: 'equals',
  providers: [{
    provide: PredicateDirective,
    useExisting: forwardRef(() => EqualsDirective)
  }],
})
export class EqualsDirective extends PredicateDirective implements
    AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private equals: Equals|undefined;

  constructor() {
    super('equals');
  }

  ngAfterContentInit(): void {
    const left = this.valueDirectives.get(0);
    const right = this.valueDirectives.get(1);
    if (left === undefined || right === undefined ||
        this.valueDirectives.length !== 2) {
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

/**
 * A Predicate directive triggered when its first argument's value is less than
 * its second argument's value.
 */
@Directive({
  selector: 'less-than',
  providers: [{
    provide: PredicateDirective,
    useExisting: forwardRef(() => LessThanDirective)
  }],
})
export class LessThanDirective extends PredicateDirective implements
    AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private lessThan: LessThan|undefined;

  constructor() {
    super('less-than');
  }

  ngAfterContentInit(): void {
    const left = this.valueDirectives.get(0);
    const right = this.valueDirectives.get(1);
    if (left === undefined || right === undefined ||
        this.valueDirectives.length !== 2) {
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

/**
 * A Predicate directive triggered when its first argument's value is greater
 * than its second argument's value.
 */
@Directive({
  selector: 'greater-than',
  providers: [{
    provide: PredicateDirective,
    useExisting: forwardRef(() => GreaterThanDirective)
  }],
})
export class GreaterThanDirective extends PredicateDirective implements
    AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private greaterThan: GreaterThan|undefined;

  constructor() {
    super('greater-than');
  }

  ngAfterContentInit(): void {
    const left = this.valueDirectives.get(0);
    const right = this.valueDirectives.get(1);
    if (left === undefined || right === undefined ||
        this.valueDirectives.length !== 2) {
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

/**
 * A Predicate directive triggered when its first argument's value includes its
 * second argument's value.
 */
@Directive({
  selector: 'includes',
  providers: [{
    provide: PredicateDirective,
    useExisting: forwardRef(() => IncludesDirective)
  }],
})
export class IncludesDirective extends PredicateDirective implements
    AfterContentInit {
  @ContentChildren(ValueDirective)
  valueDirectives = new QueryList<ValueDirective>();
  private includes: Includes|undefined;

  constructor() {
    super('includes');
  }

  ngAfterContentInit(): void {
    const left = this.valueDirectives.get(0);
    const right = this.valueDirectives.get(1);
    if (left === undefined || right === undefined ||
        this.valueDirectives.length !== 2) {
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

/**
 * A directive specifying a set of predicates governing when a specific change
 * should be made in the view.
 */
@Directive({
  selector: 'reaction',
})
export class ReactionDirective {
  @ContentChild(PredicateDirective)
  predicateDirective: PredicateDirective|undefined;
  @Input() target = '';
  @Input() type = '';
  private reaction: Reaction|undefined;

  get(): Reaction {
    if (this.reaction === undefined) {
      if (this.predicateDirective === undefined) {
        throw new ConfigurationError(`'reaction' must have one predicate.`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
      this.reaction =
          new Reaction(this.target, this.type, this.predicateDirective.get());
    }
    return this.reaction;
  }
}

/**
 * A directive specifying a particular callback to be handled by the enclosing
 * component, along with the arguments to be passed to that callback.
 */
@Directive({
  selector: 'watch',
})
export class WatchDirective {
  @ContentChild(ValueMapDirective)
  valueMapDirective: ValueMapDirective|undefined;
  @Input() type = '';
  private watch: Watch|undefined;

  get(): Watch {
    if (this.watch === undefined) {
      if (this.valueMapDirective === undefined) {
        throw new ConfigurationError(
            `'watch' must have a 'value-map' argument.`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
      this.watch = new Watch(this.type, this.valueMapDirective.getValueMap());
    }
    return this.watch;
  }
}

/**
 * A directive specifying the Actions, Reactions, and Watches supported by a
 * specific component.
 */
@Directive({
  selector: 'interactions',
})
export class InteractionsDirective {
  @ContentChildren(ActionDirective)
  actionDirectives = new QueryList<ActionDirective>();
  @ContentChildren(ReactionDirective)
  reactionDirectives = new QueryList<ReactionDirective>();
  @ContentChildren(WatchDirective)
  watchDirectives = new QueryList<WatchDirective>();
  protected interactions: Interactions|undefined;

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