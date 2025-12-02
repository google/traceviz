/**
 * @fileoverview Tools for working with trace data.  See
 * ../../../../server/go/trace/trace.go for more detail.
 *
 * Multiple trace responses (potentially from different data sources) may be
 * merged in the frontend for display in a single UI component, via the
 * Trace::union() static method.  Trace unioning is performed by recursive
 * trace category unioning: if two traces or unioned trace categories define
 * identical child categories, those categories are unioned.  In addition to the
 * recursive work described above, when two categories A and B are unioned,
 * their union has all spans under A and all those under B.  Individual spans
 * are not unioned, even if they're identical.
 */
import { Category } from '../category/category.js';
import { TraceAxisRenderSettings as CategoryRenderSettings } from '../category_axis/category_axis.js';
import { Axis } from '../continuous_axis/continuous_axis.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
declare enum Key {
    START = "trace_start",
    END = "trace_end",
    NODE_TYPE = "trace_node_type",
    PAYLOAD_TYPE = "trace_payload",
    SPAN_WIDTH_CAT_PX = "span_width_cat_px",
    SPAN_PADDING_CAT_PX = "span_padding_cat_px"
}
/** The key of the start value of a trace span or subspan. */
export declare const startKey = Key.START;
/** The key of the start value of a trace span or subspan. */
export declare const endKey = Key.END;
/**
 * A collection of settings for rendering traces.  A trace is rendered on a
 * two-dimensional plane, with a temporal value axis (typically X) and a
 * category axis (typically Y).
 *
 * These settings are generally defined as extents, in units of pixels, along
 * these two axes, so are suffixed 'ValPx' for a pixel extent along the
 * value axis, or 'CatPx' for a pixel extent along the category axis.
 */
export interface TraceRenderSettings {
    spanWidthCatPx: number;
    spanPaddingCatPx: number;
    categoryRenderSettings: CategoryRenderSettings;
}
/** A category awaiting unioning. */
interface UnioningCategory<T> {
    traceCategory: TraceCategory<T>;
}
/** A trace object embedded in a ResponseNode. */
export declare class Trace<T> {
    readonly properties: ValueMap;
    readonly categories: Array<TraceCategory<T>>;
    readonly axis: Axis<T>;
    private constructor();
    private static buildTrace;
    static fromNode(node: ResponseNode): Trace<unknown>;
    private merge;
    static union(...traces: Array<Trace<unknown>>): Trace<unknown>;
    renderSettings(): TraceRenderSettings;
}
/** A trace category under a Trace or another TraceCategory. */
export declare class TraceCategory<T> {
    readonly axis: Axis<T>;
    readonly category: Category;
    readonly categories: Array<TraceCategory<T>>;
    readonly spans: Array<Span<T>>;
    readonly properties: ValueMap;
    readonly selfSpanHeight: number;
    readonly totalSpanHeight: number;
    readonly categoryHeight: number;
    private constructor();
    static fromNode<T>(axis: Axis<T>, node: ResponseNode): TraceCategory<T>;
    static union<T>(axis: Axis<T>, ...cats: Array<UnioningCategory<T>>): TraceCategory<T>;
}
/** A trace span under a TraceCategory or another Span. */
export declare class Span<T> {
    readonly axis: Axis<T>;
    readonly children: Array<Span<T>>;
    readonly subspans: Array<Subspan<T>>;
    readonly payloads: ReadonlyMap<string, ResponseNode[]>;
    readonly properties: ValueMap;
    readonly height: number;
    constructor(axis: Axis<T>, node: ResponseNode);
    start(): T;
    end(): T;
}
/** A trace subspan under a Span. */
export declare class Subspan<T> {
    readonly axis: Axis<T>;
    readonly payloads: ReadonlyMap<string, ResponseNode[]>;
    readonly properties: ValueMap;
    constructor(axis: Axis<T>, node: ResponseNode);
    start(): T;
    end(): T;
}
export {};
