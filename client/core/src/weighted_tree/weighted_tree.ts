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

/** @fileoverview Tools for working with two-dimensional series data.  See
 *  ../../../../server/go/xy_chart/xy_chart.go for more detail.
 */

import { ConfigurationError, Severity } from '../errors/errors.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
import { Coloring, Colors } from '../color/color.js';
import { getLabel } from '../label/label.js';
import { getSelfMagnitude, properties as magnitudeProperties } from '../magnitude/magnitude.js';

const SOURCE = 'weighted_tree';

enum Keys {
    DATUM_TYPE = 'weighted_tree_datum_type',
    PAYLOAD_TYPE = 'weighted_tree_payload_type',

    FRAME_HEIGHT_PX = 'weighted_tree_frame_height_px'
}

/**
 * A collection of settings for rendering trees.
 */
export interface RenderSettings {
    // The height of a frame in pixels.
    frameHeightPx: number;
}

enum DatumType {
    TREE_NODE = 0,
    PAYLOAD = 1,
}

/** A weighted tree node. */
export class TreeNode {
    readonly properties: ValueMap;
    readonly colors: Colors;
    readonly label: string;
    readonly totalWeight: number = 0;
    // A mapping from payload type to list of payloads of that type, in
    // definition order.
    readonly payloads: ReadonlyMap<string, ResponseNode[]>;
    readonly children: TreeNode[] = [];

    constructor(tree: Tree, node: ResponseNode, readonly depth = 0) {
        this.properties =
            node.properties.without(Keys.DATUM_TYPE, ...magnitudeProperties);
        this.colors = tree.coloring.colors(node.properties);
        this.label = getLabel(node.properties);
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
    readonly renderSettings: RenderSettings;
    readonly coloring: Coloring;
    readonly roots: TreeNode[] = [];
    readonly totalWeight: number = 0;

    constructor(node: ResponseNode) {
        this.renderSettings = {
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
}