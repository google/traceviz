/**
 * @fileoverview A collection of types for rendering bar charts and their
 * categories.
 */
import { RenderedCategoryHierarchy } from '../category_axis/category_axis.js';
import { ValueMap } from '../value/value_map.js';
import { BarChart } from './bar_chart.js';
declare abstract class RenderedRect {
    readonly x0Px: number;
    readonly y0Px: number;
    readonly x1Px: number;
    readonly y1Px: number;
    constructor(x0Px: number, y0Px: number, x1Px: number, y1Px: number);
    abstract get properties(): ValueMap;
    get width(): number;
    get height(): number;
}
/** A stacked bars element rendered for display. */
export declare class RenderedStackedBars {
    readonly bars: RenderedBar[];
    constructor(bars: RenderedBar[]);
}
/** A bar element rendered for display. */
export declare class RenderedBar extends RenderedRect {
    private readonly propertiesInternal;
    constructor(propertiesInternal: ValueMap, x0Px: number, y0Px: number, x1Px: number, y1Px: number);
    get properties(): ValueMap;
}
/** A box plot element rendered for display. */
export declare class RenderedBoxPlot {
    readonly q0ToQ1: RenderedBar;
    readonly q1ToQ2: RenderedBar;
    readonly q2ToQ3: RenderedBar;
    readonly q3ToQ4: RenderedBar;
    constructor(q0ToQ1: RenderedBar, q1ToQ2: RenderedBar, q2ToQ3: RenderedBar, q3ToQ4: RenderedBar);
}
/**
 * A rendered bar chart in which the y-axis shows categories and the x-axis
 * shows values.  It construes 'CatPx' in the render settings as the vertical
 * dimension, and 'ValPx' the horizontal.
 */
export declare class RenderedHorizontalBarChart {
    readonly barChartWidthPx: number;
    readonly categoryHierarchy: RenderedCategoryHierarchy | undefined;
    readonly data: Array<RenderedStackedBars | RenderedBar | RenderedBoxPlot>;
    readonly categoryWidthPx: number;
    readonly chartHeightPx: number;
    readonly chartWidthPx: number;
    constructor(barChart: BarChart, barChartWidthPx: number);
}
export {};
