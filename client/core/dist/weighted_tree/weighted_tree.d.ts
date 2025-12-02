import { Coloring } from '../color/color.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
/**
 * A collection of settings for rendering trees.
 */
export interface WeightedTreeRenderSettings {
    frameHeightPx: number;
}
/** A rendered weighted tree node. */
export declare class RenderedTreeNode {
    readonly properties: ValueMap;
    private readonly xOffsetPct;
    private readonly widthPct;
    y0Px: number;
    y1Px: number;
    readonly label: string;
    private readonly colors;
    readonly heightPx: number;
    readonly fillColor: string;
    readonly highlightedFillColor: string;
    readonly borderColor: string;
    readonly highlightedBorderColor: string;
    readonly textColor: string;
    readonly highlightedTextColor: string;
    readonly textSizePx: number;
    id: number;
    x0Px: number;
    widthPx: number;
    constructor(coloring: Coloring, properties: ValueMap, xOffsetPct: number, widthPct: number, y0Px: number, y1Px: number);
    resize(treeWidthPx: number): RenderedTreeNode;
}
/** A weighted tree node. */
export declare class TreeNode {
    readonly depth: number;
    readonly properties: ValueMap;
    readonly totalWeight: number;
    readonly payloads: ReadonlyMap<string, ResponseNode[]>;
    readonly children: TreeNode[];
    constructor(node: ResponseNode, depth?: number);
}
/** A weighted tree. */
export declare class Tree {
    readonly properties: ValueMap;
    readonly weightedTreeRenderSettings: WeightedTreeRenderSettings;
    readonly coloring: Coloring;
    readonly roots: TreeNode[];
    readonly totalWeight: number;
    topDown: boolean;
    constructor(node: ResponseNode);
    renderTree(): RenderedTreeNode[];
    private renderTreeNodes;
}
