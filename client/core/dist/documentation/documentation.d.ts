/**
 * @fileoverview Interfaces to be implemented by self-documenting TraceViz
 * entities.
 */
/** Supported types of documenters. */
export declare enum DocumenterType {
    /** Documents an update in response to some user action. */
    UPDATE = 0,
    /** Documents a predicate controlling some reaction. */
    PREDICATE = 1,
    /** Documents a watch on a set of Values. */
    WATCH = 2,
    /** Documents some user action and its resulting updates. */
    ACTION = 3,
    /** Documents some reaction and the predicates that control it. */
    REACTION = 4,
    /** Documents a set of interactions: Watches, Actions, and Reactions. */
    INTERACTIONS = 5,
    /** Documents a tool component. */
    COMPONENT = 6,
    /** Documents a tool. */
    TOOL = 7
}
/** Implemented by self-documenting types. */
export interface Documenter {
    autoDocument: string;
    overrideDocument: string;
    documenterType: DocumenterType;
    documentChildren: boolean;
    children: Documenter[];
}
