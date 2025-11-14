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
 * @fileoverview Tools for working with weighted tree data.  See
 *  ../../../../server/go/weighted_tree/weighted_tree.go for more detail.
 */

import * as d3 from 'd3';

import {Coloring, Colors} from '../color/color.js';
import {ConfigurationError, Severity} from '../errors/errors.js';
import {getLabel} from '../label/label.js';
import {getSelfMagnitude, properties as magnitudeProperties} from '../magnitude/magnitude.js';
import {children} from '../payload/payload.js';
import {ResponseNode} from '../protocol/response_interface.js';
import {StringValue} from '../value/value.js';
import {ValueMap} from '../value/value_map.js';

const SOURCE = 'weighted_tree';

enum Keys {
  FRAME_HEIGHT_PX = 'weighted_tree_frame_height_px',
  DIRECTION = 'weighted_tree_direction',
}

enum Directions {
  TOP_DOWN = 'top_down',
  BOTTOM_UP = 'bottom_up'
}

/**
 * A collection of settings for rendering trees.
 */
export interface WeightedTreeRenderSettings {
  // The height of a frame in pixels.
  frameHeightPx: number;
}

// Use alarming default colors to encourage overriding them.
const DEFAULT_PRIMARY_COLOR = 'magenta';
const DEFAULT_STROKE_COLOR = 'chartreuse';

const DETAIL_FORMAT = 'detail_format';

/** A rendered weighted tree node. */
export class RenderedTreeNode {
  readonly label: string;
  private readonly colors: Colors;
  readonly heightPx: number = 0;
  readonly fillColor: string;
  readonly highlightedFillColor: string;
  readonly borderColor: string;
  readonly highlightedBorderColor: string;
  readonly textColor: string;
  readonly highlightedTextColor: string;
  readonly textSizePx: number = 14;
  id = 0;
  x0Px = 0;
  widthPx = 0;

  constructor(
      coloring: Coloring, readonly properties: ValueMap,
      private readonly xOffsetPct: number, private readonly widthPct: number,
      public y0Px: number, public y1Px: number) {
    let tooltip = '';
    try {
      tooltip =
          this.properties.format(this.properties.expectString(DETAIL_FORMAT));
    } catch (err: unknown) {
    }
    this.properties = properties.with(['tooltip', new StringValue(tooltip)]);

    this.label = getLabel(this.properties);
    this.colors = coloring.colors(this.properties);
    this.heightPx = y1Px - y0Px;
    this.fillColor =
        (this.colors.primary) ? this.colors.primary : DEFAULT_PRIMARY_COLOR;
    this.highlightedFillColor =
        d3.color(this.fillColor)?.brighter(2).toString() || '';
    this.borderColor = d3.color(this.fillColor)?.darker(2).toString() || '';
    this.highlightedBorderColor = this.fillColor;
    this.textColor =
        (this.colors.stroke) ? this.colors.stroke : DEFAULT_STROKE_COLOR;
    this.highlightedTextColor =
        d3.color(this.textColor)?.darker(2).toString() || '';
  }

  resize(treeWidthPx: number): RenderedTreeNode {
    this.x0Px = treeWidthPx * this.xOffsetPct;
    this.widthPx = treeWidthPx * this.widthPct;
    return this;
  }
}

/** A weighted tree node. */
export class TreeNode {
  readonly properties: ValueMap;
  readonly totalWeight: number = 0;
  // A mapping from payload type to list of payloads of that type, in
  // definition order.
  readonly payloads: ReadonlyMap<string, ResponseNode[]>;
  readonly children: TreeNode[] = [];

  constructor(node: ResponseNode, readonly depth = 0) {
    this.properties = node.properties.without(...magnitudeProperties);
    let totalWeight = getSelfMagnitude(node.properties);

    const c = children(node);
    for (const child of c.structural) {
      this.children.push(new TreeNode(child, depth + 1));
    }
    this.payloads = c.payload;

    for (const child of this.children) {
      if (child instanceof TreeNode) {
        totalWeight += child.totalWeight;
      }
    }
    this.totalWeight = totalWeight;
  }
}

/** A weighted tree. */
export class Tree {
  readonly properties: ValueMap;
  readonly weightedTreeRenderSettings: WeightedTreeRenderSettings;
  readonly coloring: Coloring;
  readonly roots: TreeNode[] = [];
  readonly totalWeight: number = 0;
  public topDown: boolean = true;

  constructor(node: ResponseNode) {
    this.weightedTreeRenderSettings = {
      frameHeightPx: node.properties.has(Keys.FRAME_HEIGHT_PX) ?
      node.properties.expectNumber(Keys.FRAME_HEIGHT_PX) : 0,
    };
    if (node.properties.has(Keys.DIRECTION)) {
      const dir = node.properties.expectString(Keys.DIRECTION);
      switch (dir) {
        case Directions.TOP_DOWN:
          this.topDown = true;
          break;
        case Directions.BOTTOM_UP:
          this.topDown = false;
          break;
        default:
          throw new ConfigurationError(
              `Unsupported weighted tree direction ${dir}`)
              .from(SOURCE)
              .at(Severity.ERROR);
      }
    }
    this.properties = node.properties.without(
        Keys.FRAME_HEIGHT_PX,
        Keys.DIRECTION,
    );
    this.coloring = new Coloring(this.properties);

    const c = children(node);
    for (const child of c.structural) {
      this.roots.push(new TreeNode(child, 0));
    }

    for (const root of this.roots) {
      this.totalWeight += root.totalWeight;
    }
  }

  // Renders a weighted tree with the root nodes at y=0, and children
  // placed below their parents.
  renderTree(): RenderedTreeNode[] {
    const ret = this.renderTreeNodes(this.roots, 0, 0);
    if (!this.topDown) {
      // Flip bottom-up trees around the vertical midpoint.
      const heightPx = ret.reduce(
          (highestYPx, treeNode) =>
              (treeNode.y1Px > highestYPx) ? treeNode.y1Px : highestYPx,
          0);
      ret.forEach((treeNode) => {
        const newY0Px = heightPx - treeNode.y1Px;
        const newY1Px = heightPx - treeNode.y0Px;
        treeNode.y0Px = newY0Px;
        treeNode.y1Px = newY1Px;
      });
    }
    return ret;
  }

  private renderTreeNodes(
      treeNodes: TreeNode[], horizontalOffsetPct: number,
      verticalOffsetPx: number): RenderedTreeNode[] {
    if (treeNodes.length === 0) {
      return [];
    }
    const renderedNodes: RenderedTreeNode[] = [];
    for (const treeNode of treeNodes) {
      const widthPct = treeNode.totalWeight / this.totalWeight;
      renderedNodes.push(
          new RenderedTreeNode(
              this.coloring, treeNode.properties, horizontalOffsetPct, widthPct,
              verticalOffsetPx,
              verticalOffsetPx + this.weightedTreeRenderSettings.frameHeightPx),
          ...this.renderTreeNodes(
              treeNode.children, horizontalOffsetPct,
              verticalOffsetPx + this.weightedTreeRenderSettings.frameHeightPx),
      );
      horizontalOffsetPct += widthPct;
    }
    for (let i = 0; i < renderedNodes.length; i++) {
      renderedNodes[i].id = i;
    }
    return renderedNodes;
  }
}
