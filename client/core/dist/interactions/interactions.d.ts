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
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { Documenter, DocumenterType } from '../documentation/documentation.js';
import { ValueMap } from '../value/value_map.js';
import { ValueRef } from '../value/value_reference.js';
/**
 * A base class for directives serving as action updates.  Invoking the
 * 'update' method immediately performs the associated action(s).
 */
export declare abstract class Update implements Documenter {
    readonly documenterType: DocumenterType;
    overrideDocument: string;
    documentChildren: boolean;
    constructor(documenterType?: DocumenterType);
    abstract update(localState?: ValueMap | undefined): void;
    abstract get autoDocument(): string;
    get children(): Documenter[];
    withHelpText(helpText: string, documentChildren: boolean): Update;
}
/**
 * An update that bundles several child updates, executing each in order when
 * it is updated.
 */
export declare class Do extends Update {
    private readonly updates;
    constructor(updates: Update[]);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
    get children(): Documenter[];
}
/**
 * Conditionally executes its thenUpdate or elseUpdate based on the current
 * state of its pred predicate.
 */
export declare class If extends Update {
    private readonly pred;
    private readonly thenUpdate;
    private readonly elseUpdate?;
    constructor(pred: Predicate, thenUpdate: Update, elseUpdate?: Update | undefined);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
    get children(): Documenter[];
}
/**
 * Upon evaluation, executes its update if its predicate is satisfied.
 */
export declare class Case extends Update {
    private readonly pred;
    private readonly updates;
    constructor(pred: Predicate, updates: Update[]);
    update(localState?: ValueMap | undefined): void;
    /**
     * Evaluates the current state of pred, returning that state.  Additionally,
     * if pred evaluates to true, updates all child updates.
     */
    execute(localState?: ValueMap | undefined): boolean;
    get autoDocument(): string;
    get children(): Documenter[];
}
/**
 * Executes its set of cases until one is satisfied.
 */
export declare class Switch extends Update {
    private readonly cases;
    constructor(cases: Case[]);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
    get children(): Documenter[];
}
/** On update, clears its children. */
export declare class Clear extends Update {
    readonly valueRefs: ValueRef[];
    constructor(valueRefs: ValueRef[]);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/** On update, sets its destination child from its source child. */
export declare class Set extends Update {
    private readonly destinationVR;
    private readonly sourceVR;
    constructor(destinationVR: ValueRef, sourceVR: ValueRef);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/** On update, toggles its destination child from its source child. */
export declare class Toggle extends Update {
    private readonly destinationVR;
    private readonly sourceVR;
    constructor(destinationVR: ValueRef, sourceVR: ValueRef);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/**
 * On update, clears its destination child if it is equal to its source child,
 * or sets the destination from the source if they are not equal.
 */
export declare class SetOrClear extends Update {
    private readonly destinationVR;
    private readonly sourceVR;
    constructor(destinationVR: ValueRef, sourceVR: ValueRef);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/** On update, extends its destination child from its source child. */
export declare class Extend extends Update {
    private readonly destinationVR;
    private readonly sourceVR;
    constructor(destinationVR: ValueRef, sourceVR: ValueRef);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/**
 * On update, sets its destination child, only if it is empty, from its
 * source child.
 */
export declare class SetIfEmpty extends Update {
    private readonly destinationVR;
    private readonly sourceVR;
    constructor(destinationVR: ValueRef, sourceVR: ValueRef);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/** On update, swaps its two children's values. */
export declare class Swap extends Update {
    private readonly firstVR;
    private readonly secondVR;
    constructor(firstVR: ValueRef, secondVR: ValueRef);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/**
 * Pops the leftmost item from the referenced value, which must be list-type.
 */
export declare class PopLeft extends Update {
    readonly valueRef: ValueRef;
    constructor(valueRef: ValueRef);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/**
 * Pushes the second through last referenced arguments' values, in order, onto
 * the left end of the first argument's referenced value.  The first argument
 * must reference a list-type value, and subsequent arguments must reference
 * compatible ordered types.  For example, if the first argument is a
 * StringList, subsequent arguments may be Strings or StringLists.
 */
export declare class PushLeft extends Update {
    readonly valueRefs: ValueRef[];
    constructor(valueRefs: ValueRef[]);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/**
 * On update, concatenates the values of children beyond the first child to the
 * first child.
 */
export declare class Concat extends Update {
    readonly valueRefs: ValueRef[];
    constructor(valueRefs: ValueRef[]);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
}
/**
 * A user action of a specified type on a specified target.  Upon this action,
 * all provided updates are applied.
 */
export declare class Action extends Update {
    readonly target: string;
    readonly type: string;
    readonly updates: Update[];
    constructor(target: string, type: string, updates: Update[]);
    update(localState?: ValueMap | undefined): void;
    get autoDocument(): string;
    get children(): Documenter[];
    withHelpText(helpText: string, documentChildren: boolean): Action;
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
export declare abstract class Predicate implements Documenter {
    readonly documenterType: DocumenterType;
    overrideDocument: string;
    documentChildren: boolean;
    constructor(documenterType?: DocumenterType);
    abstract match(): MatchFn;
    abstract get autoDocument(): string;
    get children(): Documenter[];
    withHelpText(helpText: string, documentChildren: boolean): Predicate;
}
/**
 * Provides a matcher yielding true when any of its ValueRef arguments has
 * recently changed.
 */
export declare class Changed extends Predicate {
    private readonly valRefs;
    private readonly sinceMs?;
    constructor(valRefs: ValueRef[], sinceMs?: number | undefined);
    match(): MatchFn;
    get autoDocument(): string;
}
/** A predicate which always returns 'true'. */
export declare class True extends Predicate {
    private readonly t;
    constructor();
    match(): MatchFn;
    get autoDocument(): string;
    get children(): Documenter[];
}
/** A predicate which always returns 'false'. */
export declare class False extends Predicate {
    private readonly f;
    constructor();
    match(): MatchFn;
    get autoDocument(): string;
    get children(): Documenter[];
}
/** Provides a matcher yielding the inverse of its Predicate argument. */
export declare class Not extends Predicate {
    private readonly x;
    constructor(x: Predicate);
    match(): MatchFn;
    get autoDocument(): string;
    get children(): Documenter[];
}
/** Provides a matcher yielding the AND of its Predicate arguments. */
export declare class And extends Predicate {
    private readonly childPredicates;
    constructor(childPredicates: Predicate[]);
    match(): MatchFn;
    get autoDocument(): string;
    get children(): Documenter[];
}
/** Provides a matcher yielding the OR of its Predicate arguments. */
export declare class Or extends Predicate {
    private readonly childPredicates;
    constructor(childPredicates: Predicate[]);
    match(): MatchFn;
    get autoDocument(): string;
    get children(): Documenter[];
}
/**
 * Provides a matcher yielding true when its ValueRef arguments compare equal.
 */
export declare class Equals extends Predicate {
    private readonly x;
    private readonly y;
    constructor(x: ValueRef, y: ValueRef);
    match(): MatchFn;
    get autoDocument(): string;
}
/**
 * Provides a matcher yielding true when its first ValueRef argument compares
 * less than its second ValueRef argument.
 */
export declare class LessThan extends Predicate {
    private readonly x;
    private readonly y;
    constructor(x: ValueRef, y: ValueRef);
    match(): MatchFn;
    get autoDocument(): string;
}
/**
 * Provides a matcher yielding true when its first ValueRef argument compares
 * greater than its second ValueRef argument.
 */
export declare class GreaterThan extends Predicate {
    private readonly x;
    private readonly y;
    constructor(x: ValueRef, y: ValueRef);
    match(): MatchFn;
    get autoDocument(): string;
}
/**
 * Provides a matcher yielding true when its first ValueRef argument includes
 * its second ValueRef argument.
 */
export declare class Includes extends Predicate {
    private readonly x;
    private readonly y;
    constructor(x: ValueRef, y: ValueRef);
    match(): MatchFn;
    get autoDocument(): string;
}
/**
 * Provides a matcher yielding true when its first ValueRef argument is a prefix
 * of its second ValueRef argument.
 */
export declare class PrefixOf extends Predicate {
    private readonly x;
    private readonly y;
    constructor(x: ValueRef, y: ValueRef);
    match(): MatchFn;
    get autoDocument(): string;
}
/**
 * A reaction of a specified type on a specified target.  Upon this action,
 * all provided updates are applied.
 */
export declare class Reaction extends Predicate {
    readonly target: string;
    readonly type: string;
    readonly predicate: Predicate;
    constructor(target: string, type: string, predicate: Predicate);
    match(): MatchFn;
    get autoDocument(): string;
    get children(): Documenter[];
    withHelpText(helpText: string, documentChildren: boolean): Reaction;
}
/**
 * A class used to invoke arbitrary callbacks when any Value in a ValueMap
 * changes.  The 'watch' method accepts a callback which is invoked, and
 * provided with the changed ValueMap, upon every Value change.  The 'watch'
 * method also returns an observable upon which any errors raised in the
 * callback are propagated;
 */
export declare class Watch implements Documenter {
    readonly type: string;
    readonly valueMap: ValueMap;
    readonly documenterType = DocumenterType.WATCH;
    overrideDocument: string;
    documentChildren: boolean;
    constructor(type: string, valueMap: ValueMap);
    /**
     * Invokes the provided callback if the receiver's value map changes, until
     * the provided unsubscribe observable emits.  Returns an observable emitting
     * any errors thrown during callback invocation.
     */
    watch(cb: (vm: ValueMap) => void, unsubscribe: Subject<void>): ReplaySubject<unknown>;
    get autoDocument(): string;
    get children(): Documenter[];
    withHelpText(helpText: string, documentChildren: boolean): Watch;
}
/**
 * Bundles a set of actions and reactions keyed by target (e.g., 'rows') and
 * type (e.g., 'click', 'highlight'), and watches keyed by type (e.g.,
 * 'timeCallout'), supporting convenience accessors for each of them.
 */
export declare class Interactions implements Documenter {
    readonly documenterType = DocumenterType.INTERACTIONS;
    overrideDocument: string;
    documentChildren: boolean;
    private readonly actionsByTargetAndType;
    private readonly reactionsByTargetAndType;
    private readonly watchesByType;
    withAction(action: Action): Interactions;
    withReaction(reaction: Reaction): Interactions;
    withWatch(watch: Watch): Interactions;
    update(target: string, type: string, localValues?: ValueMap | undefined): void;
    match(target: string, type: string): MatchFn;
    /**
     * Sets up a single watch on the specified type with the specified callback.
     * The callback will be invoked on watch changes until the provided
     * unsubscribe observable emits.  Returns an observable that emits any error
     * thrown by the callback.
     */
    watch(type: string, cb: (vm: ValueMap) => void, unsubscribe: Subject<void>): Observable<unknown>;
    /**
     * Sets up multiple watches at the same time.  The provided watchActions map
     * specifies which watches to set up, and what callback to apply when they
     * trigger.  Returns an observable that emits any error thrown by an invoked
     * callback.
     */
    watchAll(watchActions: ReadonlyMap<string, (vm: ValueMap) => void>, unsubscribe: Subject<void>): Observable<unknown>;
    get autoDocument(): string;
    get children(): Documenter[];
    withHelpText(helpText: string, documentChildren: boolean): Interactions;
    checkForSupportedActions(supportedTargetsAndTypes: Array<[string, string]>): void;
    checkForSupportedReactions(supportedTargetsAndTypes: Array<[string, string]>): void;
    checkForSupportedWatches(supportedTypes: string[]): void;
}
