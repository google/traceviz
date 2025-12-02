/**
 * @fileoverview Tools for working with two-dimensional series data.  See
 * ../../../../server/go/xy_chart/xy_chart.go for more detail.
 */
import { Category } from '../category/category.js';
import { Axis } from '../continuous_axis/continuous_axis.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
/** Represents a single datapoint within a series in an XY chart. */
export declare class Point {
    readonly properties: ValueMap;
    constructor(node: ResponseNode);
}
/** A series within an XY chart. */
export declare class Series {
    private readonly node;
    readonly category: Category;
    readonly points: Point[];
    readonly properties: ValueMap;
    constructor(node: ResponseNode);
}
/** An XY chart. */
export declare class XYChart {
    readonly xAxis: Axis<unknown>;
    readonly yAxis: Axis<unknown>;
    readonly series: Series[];
    readonly properties: ValueMap;
    constructor(xAxis: Axis<unknown>, yAxis: Axis<unknown>, node: ResponseNode);
    static fromNode(node: ResponseNode): XYChart;
}
