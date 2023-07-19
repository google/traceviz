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

/** @fileoverview Tools for working with weighted tree data.  See
 *  ../../../../server/go/weighted_tree/weighted_tree.go for more detail.
 */

import {ResponseNode} from '../protocol/response_interface.js';
import {ValueMap} from '../value/value_map.js';
import {StringValue} from '../value/value.js';
import {Coloring, Colors} from '../color/color.js';
import {getLabel} from '../label/label.js';
import {getSelfMagnitude, properties as magnitudeProperties} from '../magnitude/magnitude.js';
import {children} from '../payload/payload.js';
import * as d3 from 'd3';

enum Keys {
  FRAME_HEIGHT_PX='weighted_tree_frame_height_px'
}

/**
 * A collection of settings for rendering trees.
 */
export interface WeightedTreeRenderSettings {
  // The height of a frame in pixels.
  frameHeightPx: number;
}

// Use alarming default colors to encourage overriding them.
const DEFAULT_PRIMARY_COLOR='magenta';
const DEFAULT_STROKE_COLOR='chartreuse';

const DETAIL_FORMAT='detail_format';

/** A rendered weighted tree node. */
export class RenderedTreeNode {
  readonly label: string;
  private readonly colors: Colors;
  readonly heightPx: number=0;
  readonly fillColor: string;
  readonly highlightedFillColor: string;
  readonly borderColor: string;
  readonly highlightedBorderColor: string;
  readonly textColor: string;
  readonly highlightedTextColor: string;
  readonly textSizePx: number=14;
  id=0;
  x0Px=0;
  widthPx=0;

  constructor(
    coloring: Coloring, readonly properties: ValueMap,
    private readonly xOffsetPct: number, private readonly widthPct: number,
    readonly y0Px: number, readonly y1Px: number) {
    let tooltip='';
    try {
      tooltip=
        this.properties.format(this.properties.expectString(DETAIL_FORMAT));
    } catch (err: unknown) {
    }
    this.properties=properties.with(['tooltip', new StringValue(tooltip)]);

    this.label=getLabel(this.properties);
    this.colors=coloring.colors(this.properties);
    this.heightPx=y1Px-y0Px;
    this.fillColor=
      (this.colors.primary)? this.colors.primary:DEFAULT_PRIMARY_COLOR;
    this.highlightedFillColor=
      d3.color(this.fillColor)?.brighter(2).toString()||'';
    this.borderColor=d3.color(this.fillColor)?.darker(2).toString()||'';
    this.highlightedBorderColor=this.fillColor;
    this.textColor=
      (this.colors.stroke)? this.colors.stroke:DEFAULT_STROKE_COLOR;
    this.highlightedTextColor=
      d3.color(this.textColor)?.darker(2).toString()||'';
  }

  resize(treeWidthPx: number): RenderedTreeNode {
    this.x0Px=treeWidthPx*this.xOffsetPct;
    this.widthPx=treeWidthPx*this.widthPct;
    return this;
  }
}

/** A weighted tree node. */
export class TreeNode {
  readonly properties: ValueMap;
  readonly totalWeight: number=0;
  // A mapping from payload type to list of payloads of that type, in
  // definition order.
  readonly payloads: ReadonlyMap<string, ResponseNode[]>;
  readonly children: TreeNode[]=[];

  constructor(tree: Tree, node: ResponseNode, readonly depth=0) {
    this.properties=node.properties.without(...magnitudeProperties);
    let totalWeight=getSelfMagnitude(node.properties);

    const c=children(node);
    for (const child of c.structural) {
      this.children.push(new TreeNode(tree, child, depth+1));
    }
    this.payloads=c.payload;

    for (const child of this.children) {
      if (child instanceof TreeNode) {
        totalWeight+=child.totalWeight;
      }
    }
    this.totalWeight=totalWeight;
  }
}

/** A weighted tree. */
export class Tree {
  readonly properties: ValueMap;
  readonly weightedTreeRenderSettings: WeightedTreeRenderSettings;
  readonly coloring: Coloring;
  readonly roots: TreeNode[]=[];
  readonly totalWeight: number=0;

  constructor(node: ResponseNode) {
    this.weightedTreeRenderSettings={
      frameHeightPx: node.properties.expectNumber(Keys.FRAME_HEIGHT_PX),
    };
    this.properties=node.properties.without(Keys.FRAME_HEIGHT_PX);
    this.coloring=new Coloring(this.properties);

    const c=children(node);
    for (const child of c.structural) {
      this.roots.push(new TreeNode(this, child, 0));
    }

    for (const root of this.roots) {
      this.totalWeight+=root.totalWeight;
    }
  }

  // Renders a weighted tree with the root nodes at y=0, and children
  // placed below their parents.
  renderTopDownTree(): RenderedTreeNode[] {
    return this.renderTopDownTreeNodes(this.roots, 0, 0);
  }

  private renderTopDownTreeNodes(
    treeNodes: TreeNode[], horizontalOffsetPct: number,
    verticalOffsetPx: number): RenderedTreeNode[] {
    if (treeNodes.length===0) {
      return [];
    }
    const renderedNodes: RenderedTreeNode[]=[];
    for (const treeNode of treeNodes) {
      const widthPct=treeNode.totalWeight/this.totalWeight;
      renderedNodes.push(
        new RenderedTreeNode(
          this.coloring, treeNode.properties, horizontalOffsetPct, widthPct,
          verticalOffsetPx,
          verticalOffsetPx+this.weightedTreeRenderSettings.frameHeightPx),
        ...this.renderTopDownTreeNodes(
          treeNode.children, horizontalOffsetPct,
          verticalOffsetPx+this.weightedTreeRenderSettings.frameHeightPx),
      );
      horizontalOffsetPct+=widthPct;
    }
    for (let i=0; i<renderedNodes.length; i++) {
      renderedNodes[i].id=i;
    }
    return renderedNodes;
  }
}
