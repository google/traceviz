/**
 * @fileoverview Types and functions for rendering category axes.
 */
import { Category } from '../category/category.js';
import { ValueMap } from '../value/value_map.js';
/**
 * A collection of settings for rendering category axes.  A category axis
 * divides a two-dimensional graph area into stripes (horizontal for a category
 * Y axis) each of which pertains to that category.  Examples include per-CPU
 * or per-thread behavior, individual data series in an oscilloscope timeline,
 * or individual bar charts.  The other axis in this two-dimensional graph is
 * termed the 'value axis'.
 *
 * These settings are generally defined as extents, in units of pixels, along
 * these two axes, so are suffixed 'ValPx' for a pixel extent along the
 * value axis, or 'CatPx' for a pixel extent along the category axis.
 */
export interface TraceAxisRenderSettings {
    categoryHeaderCatPx: number;
    categoryHandleValPx: number;
    categoryPaddingCatPx: number;
    categoryMarginValPx: number;
    categoryMinWidthCatPx: number;
    categoryBaseWidthValPx: number;
}
export declare function renderSettingsFromProperties(properties: ValueMap): TraceAxisRenderSettings;
/**
 * A category prepared for display.  The category owns the rectangle defined by
 * (x0Px, y0Px), (x1Px, y1Px); only its subcategories may overlap that
 * rectangle.  The rendering axis visualization component may draw the span
 * within that rectangle however it wants, possibly informed by the category's
 * properties and the TraceRenderSettings used in rendering.
 */
export declare class RenderedCategory {
    readonly category: Category;
    readonly properties: ValueMap;
    readonly renderSettings: TraceAxisRenderSettings;
    readonly x0Px: number;
    readonly y0Px: number;
    readonly x1Px: number;
    readonly y1Px: number;
    private readonly childrenInternal;
    constructor(category: Category, properties: ValueMap, renderSettings: TraceAxisRenderSettings, x0Px: number, y0Px: number, x1Px: number, y1Px: number);
    get width(): number;
    get height(): number;
    addChild(child: RenderedCategory): void;
    get children(): RenderedCategory[];
    /** Returns the receiver and its descendants in prefix traversal order. */
    flatten(): RenderedCategory[];
}
/**
 * A rendered category hierarchy.  Its widthPx and heightPx fields specify the
 * dimensions of the bounding box for all contained categories.
 */
export declare class RenderedCategoryHierarchy {
    readonly properties: ValueMap;
    readonly rootCategories: RenderedCategory[];
    /** The width of the full set of rendered categories. */
    readonly widthPx: number;
    /** The height of the full set of rendered categories. */
    readonly heightPx: number;
    constructor(properties: ValueMap, rootCategories: RenderedCategory[]);
    get categories(): RenderedCategory[];
}
