/**
 * @fileoverview Types for working with bar charts.
 */
import { Category } from '../category/category.js';
import { TraceAxisRenderSettings as CategoryRenderSettings } from '../category_axis/category_axis.js';
import { Axis } from '../continuous_axis/continuous_axis.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
export declare enum Keys {
    DATA_TYPE = "bar_chart_data_type",
    BAR_LOWER_EXTENT = "bar_chart_bar_lower_extent",
    BAR_UPPER_EXTENT = "bar_chart_bar_upper_extent",
    BOX_PLOT_MIN = "bar_chart_box_plot_min",
    BOX_PLOT_Q1 = "bar_chart_box_plot_q1",
    BOX_PLOT_Q2 = "bar_chart_box_plot_q2",
    BOX_PLOT_Q3 = "bar_chart_box_plot_q3",
    BOX_PLOT_MAX = "bar_chart_box_plot_max",
    BAR_WIDTH_CAT_PX = "bar_chart_bar_width_cat_px",
    BAR_PADDING_CAT_PX = "bar_chart_bar_padding_cat_px"
}
/** The different data types renderable by a bar chart. */
export declare enum DataType {
    STACKED_BARS = "bar_chart_stacked_bars",
    BAR = "bar_chart_bar",
    BOX_PLOT = "bar_chart_box_plot"
}
/**
 * A collection of settings for rendering bar charts.  A bar chart is rendered
 * on a two-dimensional plane, with one axis, the 'value axis', showing value
 * extents, and the other, the 'category axis', showing the category lanes in
 * which bars are rendered.
 * These settings are defined as extents, in units of pixels, along
 * these two axes, so are suffixed 'ValPx' for a pixel extent along the value
 * axis, or 'CatPx' for a pixel extent along the category axis.
 */
export interface RenderSettings {
    barWidthCatPx: number;
    barPaddingCatPx: number;
    categoryRenderSettings: CategoryRenderSettings;
}
/** A bar chart, containing multiple categories each with its own data. */
export declare class BarChart {
    readonly axis: Axis<unknown>;
    readonly properties: ValueMap;
    readonly categories: BarChartCategory[];
    constructor(node: ResponseNode);
    renderSettings(): RenderSettings;
}
/** A category within a bar chart, containing bar data. */
export declare class BarChartCategory {
    readonly category: Category;
    readonly properties: ValueMap;
    readonly barData: ResponseNode[];
    constructor(node: ResponseNode);
}
