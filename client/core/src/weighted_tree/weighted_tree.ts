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

import { ConfigurationError, Severity } from '../errors/errors.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
import { Coloring, Colors } from '../color/color.js';
import { getLabel } from '../label/label.js';
import { getSelfMagnitude, properties as magnitudeProperties } from '../magnitude/magnitude.js';
import * as d3 from 'd3';

const SOURCE = 'weighted_tree';

enum Keys {
  DATUM_TYPE = 'weighted_tree_datum_type',
  PAYLOAD_TYPE = 'weighted_tree_payload_type',

  FRAME_HEIGHT_PX = 'weighted_tree_frame_height_px'
}

/**
 * A collection of settings for rendering trees.
 */
export interface WeightedTreeRenderSettings {
  // The height of a frame in pixels.
  frameHeightPx: number;
}

enum DatumType {
  TREE_NODE = 0,
  PAYLOAD = 1,
}

// Use alarming default colors to encourage overriding them.
const DEFAULT_PRIMARY_COLOR = 'magenta';
const DEFAULT_STROKE_COLOR = 'chartreuse';

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

  constructor(coloring: Coloring, readonly properties: ValueMap,
    private readonly xOffsetPct: number, private readonly widthPct: number,
    readonly y0Px: number, readonly y1Px: number) {
    this.label = getLabel(properties);
    this.colors = coloring.colors(properties);
    this.heightPx = y1Px - y0Px;
    this.fillColor = (this.colors.primary) ? this.colors.primary : DEFAULT_PRIMARY_COLOR;
    const d3FillColor = d3.color(this.fillColor);
    this.highlightedFillColor = (d3FillColor !== null) ? d3FillColor.brighter(2).toString() : DEFAULT_PRIMARY_COLOR;
    this.borderColor = (d3FillColor !== null) ? d3FillColor.darker(2).toString() : DEFAULT_PRIMARY_COLOR;
    this.highlightedBorderColor = this.fillColor;
    this.textColor = (this.colors.stroke) ? this.colors.stroke : DEFAULT_STROKE_COLOR;
    const d3TextColor = d3.color(this.textColor);
    this.highlightedTextColor = (d3TextColor !== null) ? d3TextColor.darker(2).toString() : DEFAULT_STROKE_COLOR;
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

  constructor(tree: Tree, node: ResponseNode, readonly depth = 0) {
    this.properties =
      node.properties.without(Keys.DATUM_TYPE, ...magnitudeProperties);
    let totalWeight = getSelfMagnitude(node.properties);
    const payloads = new Map<string, ResponseNode[]>();
    for (const child of node.children) {
      const datumType = child.properties.expectNumber(Keys.DATUM_TYPE);
      switch (datumType) {
        case DatumType.TREE_NODE:
          this.children.push(new TreeNode(tree, child, depth + 1));
          break;
        case DatumType.PAYLOAD:
          let ps =
            payloads.get(child.properties.expectString(Keys.PAYLOAD_TYPE));
          if (!ps) {
            ps = [];
            payloads.set(child.properties.expectString(Keys.PAYLOAD_TYPE), ps);
          }
          ps.push(child);
          break;
        default:
          throw new ConfigurationError(
            `tree node child must be another tree node or a payload`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
    }
    this.payloads = payloads;
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

  constructor(node: ResponseNode) {
    this.weightedTreeRenderSettings = {
      frameHeightPx: node.properties.expectNumber(Keys.FRAME_HEIGHT_PX),
    };
    this.properties = node.properties.without(Keys.FRAME_HEIGHT_PX);
    this.coloring = new Coloring(this.properties);
    for (const child of node.children) {
      const datumType = child.properties.expectNumber(Keys.DATUM_TYPE);
      switch (datumType) {
        case DatumType.TREE_NODE:
          this.roots.push(new TreeNode(this, child, 0));
          break;
        default:
          throw new ConfigurationError(`tree child must be a tree node`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
    }
    for (const root of this.roots) {
      this.totalWeight += root.totalWeight;
    }
  }

  // Renders a weighted tree with the root nodes at y=0, and children
  // placed below their parents.
  renderTopDownTree(): RenderedTreeNode[] {
    return this.renderTopDownTreeNodes(this.roots, 0, 0);
  }

  private renderTopDownTreeNodes(treeNodes: TreeNode[], horizontalOffsetPct: number, verticalOffsetPx: number): RenderedTreeNode[] {
    if (treeNodes.length === 0) {
      return [];
    }
    const renderedNodes: RenderedTreeNode[] = [];
    for (const treeNode of treeNodes) {
      const widthPct = treeNode.totalWeight / this.totalWeight;
      renderedNodes.push(
        new RenderedTreeNode(this.coloring, treeNode.properties,
          horizontalOffsetPct, widthPct, verticalOffsetPx,
          verticalOffsetPx + this.weightedTreeRenderSettings.frameHeightPx),
        ...this.renderTopDownTreeNodes(
          treeNode.children, horizontalOffsetPct, verticalOffsetPx + this.weightedTreeRenderSettings.frameHeightPx),
      );
      horizontalOffsetPct += widthPct;
    }
    for (let i = 0; i < renderedNodes.length; i++) {
      renderedNodes[i].id = i;
    }
    return renderedNodes;
  }
}
