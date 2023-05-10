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
 *     perform reactions;
 *   * `Watch`, which TraceViz components can use to invoke an arbitrary callback
 *     whenever any value in a map changes.
 * 
 * The `Interactions` type groups zero or more Updates, Predicates, and Watches,
 * keying Updates and Predicates by target (e.g., 'row', 'node') and type (e.g.,
 * 'click', 'highlight'), and Watches by type.  A TraceViz component may
 * associate `Interactions`, defined in tool templates by tool builders, that
 * describe how the component should interact.
 */

import { Documenter, DocumenterType } from '../documentation/documentation.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { EmptyValue, Value } from '../value/value.js';
import { ValueMap } from '../value/value_map.js';
import { ValueRef } from '../value/value_reference.js';
import { combineLatest, distinctUntilChanged, EMPTY, merge, Observable, ReplaySubject } from 'rxjs';
import { delay, map, mergeMap, takeUntil, tap } from 'rxjs/operators';

const SOURCE = 'interactions';

/**
 * A base class for directives serving as action updates.  Invoking the
 * 'update' method immediately performs the associated action(s).
 */
export abstract class Update implements Documenter {
  overrideDocument = '';
  documentChildren = true;
  constructor(readonly documenterType = DocumenterType.Update) { }
  abstract update(localState?: ValueMap | undefined): void;
  abstract get autoDocument(): string;
  get children(): Documenter[] {
    return [];
  };
  withHelpText(helpText: string, documentChildren: boolean): Update {
    this.overrideDocument = helpText;
    this.documentChildren = documentChildren;
    return this;
  }
}

/** On update, clears its children. */
export class Clear extends Update {
  constructor(readonly valueRefs: ValueRef[]) {
    super();
  }

  override update(localState?: ValueMap | undefined) {
    for (const vr of this.valueRefs) {
      const val = vr.get(localState);
      if (val === undefined) {
        return;
      }
      if (!val.fold(
        new EmptyValue(), /* toggle= */ false, /* replace = */ true)) {
        throw new ConfigurationError(
          `Can't clear ${vr.label()}.`)
          .from(SOURCE)
          .at(Severity.ERROR);
      }
    }
  }

  override get autoDocument(): string {
    return `clears [${this.valueRefs.map((vr) => vr.label()).join(', ')}]`;
  }
}

/** On update, sets its destination child from its source child. */
export class Set extends Update {
  constructor(private readonly destinationVR: ValueRef,
    private readonly sourceVR: ValueRef) {
    super();
  }

  override update(localState?: ValueMap | undefined) {
    const destinationValue = this.destinationVR.get(localState);
    const sourceValue = this.sourceVR.get(localState);
    if (destinationValue === undefined || sourceValue === undefined) {
      return;
    }
    if (!destinationValue.fold(
      sourceValue, /* toggle= */ false, /* replace= */ true)) {
      throw new ConfigurationError(
        `Can't set ${this.destinationVR.label()
        } from ${this.sourceVR.label()}.`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
  }

  override get autoDocument(): string {
    return `sets ${this.destinationVR.label()} from ${this.sourceVR.label()}.`;
  }
}

/** On update, toggles its destination child from its source child. */
export class Toggle extends Update {
  constructor(private readonly destinationVR: ValueRef,
    private readonly sourceVR: ValueRef) {
    super();
  }

  override update(localState?: ValueMap | undefined) {
    const destinationValue = this.destinationVR.get(localState);
    const sourceValue = this.sourceVR.get(localState);
    if (destinationValue === undefined || sourceValue === undefined) {
      return;
    }
    if (!destinationValue.fold(
      sourceValue, /* toggle= */ true, /* replace= */ false)) {
      throw new ConfigurationError(
        `Can't toggle ${this.destinationVR.label()
        } from ${this.sourceVR.label()}.`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
  }

  override get autoDocument(): string {
    return `toggles ${this.destinationVR.label()
      } from ${this.sourceVR.label()}.`;
  }
}

/**
 * On update, clears its destination child if it is equal to its source child,
 * or sets the destination from the source if they are not equal.
 */
export class SetOrClear extends Update {
  constructor(private readonly destinationVR: ValueRef,
    private readonly sourceVR: ValueRef) {
    super();
  }

  override update(localState?: ValueMap | undefined) {
    const destinationValue = this.destinationVR.get(localState);
    const sourceValue = this.sourceVR.get(localState);
    if (destinationValue === undefined || sourceValue === undefined) {
      return;
    }
    if (!destinationValue.fold(
      sourceValue, /* toggle= */ true, /* replace= */ true)) {
      throw new ConfigurationError(
        `Can't toggle-or-set ${this.destinationVR.label()
        } from ${this.sourceVR.label()}.`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
  }

  override get autoDocument(): string {
    return `toggles-or-sets ${this.destinationVR.label()
      } from ${this.sourceVR.label()}.`;
  }
}

/** On update, extends its destination child from its source child. */
export class Extend extends Update {
  constructor(private readonly destinationVR: ValueRef,
    private readonly sourceVR: ValueRef) {
    super();
  }

  override update(localState?: ValueMap | undefined) {
    const destinationValue = this.destinationVR.get(localState);
    const sourceValue = this.sourceVR.get(localState);
    if (destinationValue === undefined || sourceValue === undefined) {
      return;
    }
    if (!destinationValue.fold(
      sourceValue, /* toggle= */ false, /* replace= */ false)) {
      throw new ConfigurationError(
        `Can't extend ${this.destinationVR.label()
        } from ${this.sourceVR.label()}.`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
  }

  override get autoDocument(): string {
    return `extends ${this.destinationVR.label()
      } from ${this.sourceVR.label()}.`;
  }
}

/**
 * On update, sets its destination child, only if it is empty, from its
 * source child.
 */
export class SetIfEmpty extends Update {
  constructor(private readonly destinationVR: ValueRef,
    private readonly sourceVR: ValueRef) {
    super();
  }

  override update(localState?: ValueMap | undefined) {
    const destinationValue = this.destinationVR.get(localState);
    const sourceValue = this.sourceVR.get(localState);
    if (destinationValue === undefined || sourceValue === undefined ||
      destinationValue.compare(new EmptyValue()) !== 0) {
      return;
    }
    if (!destinationValue.fold(
      sourceValue, /* toggle= */ false, /* replace= */ true)) {
      throw new ConfigurationError(
        `Can't set-if-empty ${this.destinationVR.label()
        } from ${this.sourceVR.label()}.`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
  }

  override get autoDocument(): string {
    return `sets ${this.destinationVR.label()
      }, if empty, from ${this.sourceVR.label()}.`;
  }
}

/**
 * A user action of a specified type on a specified target.  Upon this action,
 * all provided updates are applied.
 */
export class Action extends Update {
  constructor(
    readonly target: string,
    readonly type: string,
    readonly updates: Update[]) {
    super(DocumenterType.Action);
  }

  override update(localState?: ValueMap | undefined) {
    for (const child of this.updates) {
      child.update(localState);
    }
  }

  override get autoDocument(): string {
    return `Upon '${this.type}' on '${this.target}'`;
  }

  override get children(): Documenter[] {
    return this.updates;
  }

  override withHelpText(helpText: string, documentChildren: boolean): Action {
    super.withHelpText(helpText, documentChildren);
    return this;
  }
}

/**
 * Returns a Boolean observable that rises to true when a predicate condition
 * holds.
 */
export type MatchFn = (localState?: ValueMap | undefined) => Observable<boolean>;

/**
 * A base class for directives serving as reaction predicates.  The 'match'
 * method yields a MatchFn which can be used to track the Predicate's current
 * value.
 */
export abstract class Predicate implements Documenter {
  overrideDocument = '';
  documentChildren = true;
  constructor(readonly documenterType = DocumenterType.Predicate) { }
  abstract match(): MatchFn;
  abstract get autoDocument(): string;
  get children(): Documenter[] {
    return [];
  };
  withHelpText(helpText: string, documentChildren: boolean): Predicate {
    this.overrideDocument = helpText;
    this.documentChildren = documentChildren;
    return this;
  }
}

/**
 * Provides a matcher yielding true when its ValueRef argument has recently
 * changed.
 */
export class Changed extends Predicate {
  constructor(private readonly x: ValueRef,
    private readonly sinceMs: number = 0) {
    super();
  }

  override match(): MatchFn {
    return (localState: ValueMap | undefined): Observable<boolean> => {
      const val = this.x.get(localState);
      if (val === undefined) {
        return EMPTY;
      }
      if (this.sinceMs === 0) {
        // If sinceMs is 0, just emit a pulse on the rising edge of the change.
        return val.pipe(mergeMap(() => [true, false]));
      }
      const valueChanged = val.pipe(map(() => true));
      const changeTimeout = valueChanged.pipe(
        delay(this.sinceMs), map(() => false));
      return merge(
        valueChanged,
        changeTimeout,
      ).pipe(distinctUntilChanged());
    }
  }

  override get autoDocument(): string {
    return `when ${this.x.label()} changed within past ${this.sinceMs}ms`;
  }
}

/** Provides a matcher yielding the inverse of its Predicate argument. */
export class Not extends Predicate {
  constructor(private readonly x: Predicate) {
    super();
  }

  override match(): MatchFn {
    return (localState: ValueMap | undefined): Observable<boolean> => {
      return this.x.match()(localState).pipe(
        map((v: boolean) => !v),
        distinctUntilChanged());
    };
  }

  override get autoDocument(): string {
    return 'NOT';
  }

  override get children(): Documenter[] {
    return [this.x];
  }
}

/** Provides a matcher yielding the AND of its Predicate arguments. */
export class And extends Predicate {
  constructor(private readonly childPredicates: Predicate[]) {
    super();
  }

  override match(): MatchFn {
    return (localState: ValueMap | undefined): Observable<boolean> => {
      const childMatchers = this.childPredicates.map(
        (child) => child.match()(localState));
      return combineLatest(childMatchers).pipe(
        map(
          (vals: boolean[]) => vals.reduce(
            (prev, curr) => prev && curr, true)),
        distinctUntilChanged());
    };
  }

  override get autoDocument(): string {
    return 'AND';
  }

  override get children(): Documenter[] {
    return this.childPredicates;
  }
}

/** Provides a matcher yielding the OR of its Predicate arguments. */
export class Or extends Predicate {
  constructor(private readonly childPredicates: Predicate[]) {
    super();
  }

  override match(): MatchFn {
    return (localState: ValueMap | undefined): Observable<boolean> => {
      const childMatchers = this.childPredicates.map(
        (child) => child.match()(localState));
      return combineLatest(childMatchers).pipe(
        map(
          (vals: boolean[]) => vals.reduce(
            (prev, curr) => prev || curr, false)),
        distinctUntilChanged());
    };
  }

  override get autoDocument(): string {
    return 'OR';
  }

  override get children(): Documenter[] {
    return this.childPredicates;
  }
}

/**
 * Provides a matcher yielding true when its ValueRef arguments compare equal.
 */
export class Equals extends Predicate {
  constructor(private readonly x: ValueRef, private readonly y: ValueRef) {
    super();
  }

  override match(): MatchFn {
    return (localState: ValueMap | undefined): Observable<boolean> => {
      const x = this.x.get(localState);
      const y = this.y.get(localState);
      if (x !== undefined && y !== undefined) {
        return combineLatest([x, y]).pipe(
          map((vals: Value[]) => vals[0].compare(vals[1]) === 0),
          distinctUntilChanged());
      }
      return EMPTY;
    };
  }

  override get autoDocument(): string {
    return `when ${this.x.label()} == ${this.y.label()}`;
  }
}

/**
 * Provides a matcher yielding true when its first ValueRef argument compares
 * less than its second ValueRef argument.
 */
export class LessThan extends Predicate {
  constructor(private readonly x: ValueRef, private readonly y: ValueRef) {
    super();
  }

  override match(): MatchFn {
    return (localState: ValueMap | undefined): Observable<boolean> => {
      const x = this.x.get(localState);
      const y = this.y.get(localState);
      if (x !== undefined && y !== undefined) {
        return combineLatest([x, y]).pipe(
          map((vals: Value[]) => vals[0].compare(vals[1]) < 0),
          distinctUntilChanged());
      }
      return EMPTY;
    };
  }

  override get autoDocument(): string {
    return `when ${this.x.label()} < ${this.y.label()}`;
  }
}

/**
 * Provides a matcher yielding true when its first ValueRef argument compares
 * greater than its second ValueRef argument.
 */
export class GreaterThan extends Predicate {
  constructor(private readonly x: ValueRef, private readonly y: ValueRef) {
    super();
  }

  override match(): MatchFn {
    return (localState: ValueMap | undefined): Observable<boolean> => {
      const x = this.x.get(localState);
      const y = this.y.get(localState);
      if (x !== undefined && y !== undefined) {
        return combineLatest([x, y]).pipe(
          map((vals: Value[]) => vals[0].compare(vals[1]) > 0),
          distinctUntilChanged());
      }
      return EMPTY;
    };
  }

  override get autoDocument(): string {
    return `when ${this.x.label()} > ${this.y.label()}`;
  }
}

/**
 * Provides a matcher yielding true when its first ValueRef argument includes
 * its second ValueRef argument.
 */
export class Includes extends Predicate {
  constructor(private readonly x: ValueRef, private readonly y: ValueRef) {
    super();
  }

  override match(): MatchFn {
    return (localState: ValueMap | undefined): Observable<boolean> => {
      const x = this.x.get(localState);
      const y = this.y.get(localState);
      if (x !== undefined && y !== undefined) {
        return combineLatest([x, y]).pipe(
          map((vals: Value[]) => vals[0].includes(vals[1])));
      }
      return EMPTY;
    };
  }

  override get autoDocument(): string {
    return `when ${this.x.label()} includes ${this.y.label()}`;
  }
}

/**
 * A reaction of a specified type on a specified target.  Upon this action,
 * all provided updates are applied.
 */
export class Reaction extends Predicate {
  constructor(
    readonly target: string,
    readonly type: string,
    readonly predicate: Predicate) {
    super(DocumenterType.Reaction);
  }

  override match(): MatchFn {
    return this.predicate.match();
  }

  override get autoDocument(): string {
    return `Performs '${this.type}' on '${this.target}'`;
  }

  override get children(): Documenter[] {
    return [this.predicate];
  }

  override withHelpText(helpText: string, documentChildren: boolean): Reaction {
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
export class Watch implements Documenter {
  readonly documenterType = DocumenterType.Watch;
  overrideDocument = '';
  documentChildren = true;

  constructor(readonly type: string) { }

  watch(valueMap: ValueMap, cb: (vm: ValueMap) => void): ReplaySubject<unknown> {
    const ret = new ReplaySubject<unknown>();
    valueMap.watch().pipe(takeUntil(ret)).subscribe((vm: ValueMap) => {
      try {
        cb(vm);
      } catch (err: unknown) {
        ret.next(err);
      }
    });
    return ret;
  }

  get autoDocument(): string {
    return `Trigger '${this.type}' on changes to arguments`;
  }

  get children(): Documenter[] {
    return [];
  }

  withHelpText(helpText: string, documentChildren: boolean): Watch {
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
export class Interactions implements Documenter {
  readonly documenterType = DocumenterType.Interactions;
  overrideDocument = '';
  documentChildren = true;
  private actionsByTargetAndType = new Map<string, Map<string, Action>>([]);
  private reactionsByTargetAndType = new Map<string, Map<string, Reaction>>([]);
  private watchesByType = new Map<string, Watch>([]);

  constructor() { }

  withAction(action: Action): Interactions {
    let actionsByType = this.actionsByTargetAndType.get(action.target);
    if (actionsByType === undefined) {
      actionsByType = new Map<string, Action>([]);
      this.actionsByTargetAndType.set(action.target, actionsByType)
    }
    actionsByType.set(action.type, action);
    return this;
  }

  withReaction(reaction: Reaction): Interactions {
    let reactionsByType = this.reactionsByTargetAndType.get(reaction.target);
    if (reactionsByType === undefined) {
      reactionsByType = new Map<string, Reaction>([]);
      this.reactionsByTargetAndType.set(reaction.target, reactionsByType)
    }
    reactionsByType.set(reaction.type, reaction);
    return this;
  }

  withWatch(watch: Watch): Interactions {
    this.watchesByType.set(watch.type, watch);
    return this;
  }

  update(target: string, type: string, localValues?: ValueMap | undefined) {
    const action = this.actionsByTargetAndType.get(target)?.get(type);
    if (action !== undefined) {
      action.update(localValues);
    }
  }

  match(target: string, type: string): MatchFn {
    const reaction = this.reactionsByTargetAndType.get(target)?.get(type);
    if (reaction === undefined) {
      return () => EMPTY;
    }
    return reaction!.match();
  }

  watch(type: string, valueMap: ValueMap, cb: (vm: ValueMap) => void): ReplaySubject<unknown> {
    const watch = this.watchesByType.get(type);
    if (watch === undefined) {
      return new ReplaySubject<unknown>();
    }
    return watch!.watch(valueMap, cb);
  }

  get autoDocument(): string {
    return `Interactions`;
  }

  get children(): Documenter[] {
    const actions = [...this.actionsByTargetAndType.values()].map(
      (actionsByType) => [...actionsByType.values()]).flat();
    const reactions = [...this.reactionsByTargetAndType.values()].map(
      (reactionsByType) => [...reactionsByType.values()]).flat();
    const watches = [...this.watchesByType.values()];
    return [...actions, ...reactions, ...watches];
  }

  withHelpText(helpText: string, documentChildren: boolean): Interactions {
    this.overrideDocument = helpText;
    this.documentChildren = documentChildren;
    return this;
  }

  checkForSupportedActions(supportedTargetsAndTypes: Array<[string, string]>): void {
    const supportedLookup = new Map<string, string[]>([]);
    for (const [target, type] of supportedTargetsAndTypes) {
      if (supportedLookup.has(target)) {
        supportedLookup.get(target)?.push(type);
      } else {
        supportedLookup.set(target, [type]);
      }
    }
    for (let [target, actionsByType] of this.actionsByTargetAndType) {
      if (!supportedLookup.has(target)) {
        throw new ConfigurationError(`Action target '${target}' is not supported`);
      }
      for (let type of actionsByType.keys()) {
        if (!supportedLookup.get(target)?.includes(type)) {
          throw new ConfigurationError(`Action type '${type}' on target '${target}' is not supported.`)
            .from(SOURCE)
            .at(Severity.ERROR);
        }
      }
    }
  }

  checkForSupportedReactions(supportedTargetsAndTypes: Array<[string, string]>): void {
    const supportedLookup = new Map<string, string[]>([]);
    for (const [target, type] of supportedTargetsAndTypes) {
      if (supportedLookup.has(target)) {
        supportedLookup.get(target)?.push(type);
      } else {
        supportedLookup.set(target, [type]);
      }
    }
    for (let [target, reactionsByType] of this.reactionsByTargetAndType) {
      if (!supportedLookup.has(target)) {
        throw new ConfigurationError(`Reaction target '${target}' is not supported`);
      }
      for (let type of reactionsByType.keys()) {
        if (!supportedLookup.get(target)?.includes(type)) {
          throw new ConfigurationError(`Reaction type '${type}' on target '${target}' is not supported.`)
            .from(SOURCE)
            .at(Severity.ERROR);
        }
      }
    }
  }

  checkForSupportedWatches(supportedTypes: string[]): void {
    for (let type of this.watchesByType.keys()) {
      if (!supportedTypes.includes(type)) {
        throw new ConfigurationError(`Watch type '${type}' is not supported.`)
          .from(SOURCE)
          .at(Severity.ERROR);
      }
    }
  }
}
