/**
 * @fileoverview A collection of types for rendering trace spans and
 * categories.
 */
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
import { RenderedCategory, RenderedCategoryHierarchy } from '../category_axis/category_axis.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { Node, startKey as traceEdgeStartKey } from '../trace_edge/trace_edge.js';
import { DurationValue, TimestampValue } from '../value/value.js';
import { endKey as traceEndKey, Span, startKey as traceStartKey } from './trace.js';
const SOURCE = 'trace_renderers';
var Keys;
(function (Keys) {
    Keys["DETAIL_FORMAT"] = "detail_format";
})(Keys || (Keys = {}));
/**
 * A span or subspan prepared for display.  The span owns the rectangle defined
 * by (x0Px, y0Px), (x1Px, y1Px); only its subspans may overlap that rectangle.
 * The rendering trace visualization component may draw the span within that
 * rectangle however it wants, possibly informed by the span's properties.
 */
export class RenderedTraceSpan {
    renderID;
    properties;
    x0Px;
    y0Px;
    x1Px;
    y1Px;
    highlighted = false;
    constructor(
    // unique ID that enables smooth animations when moving span on screen.
    renderID, 
    // The properties of this span.
    properties, 
    // The coordinates of this span's upper-left corner.
    x0Px, y0Px, 
    // The coordinates of this span's lower-right corner.
    x1Px, y1Px) {
        this.renderID = renderID;
        this.properties = properties;
        this.x0Px = x0Px;
        this.y0Px = y0Px;
        this.x1Px = x1Px;
        this.y1Px = y1Px;
    }
    get width() {
        return this.x1Px - this.x0Px;
    }
    get height() {
        return this.y1Px - this.y0Px;
    }
}
/**
 * An edge overlaid on the trace, between two points within Spans or Subspans.
 */
export class RenderedTraceEdge {
    renderID;
    properties;
    x0Px;
    y0Px;
    x1Px;
    y1Px;
    highlighted = false;
    constructor(
    // unique ID that enables smooth animations when moving edge on screen.
    renderID, properties, 
    // The coordinates of this edge's origin
    x0Px, y0Px, 
    // The coordinates of this edge's destination.
    x1Px, y1Px) {
        this.renderID = renderID;
        this.properties = properties;
        this.x0Px = x0Px;
        this.y0Px = y0Px;
        this.x1Px = x1Px;
        this.y1Px = y1Px;
    }
}
/**
 * Returns the depth, in pixels, of the provided span and its descendants,
 * given the provided TraceRenderSettings.
 */
function spanTreeDepthPx(span, renderSettings) {
    let depthPx = renderSettings.spanWidthCatPx;
    if (span instanceof Span) {
        let descendantsDepthPx = 0;
        for (const child of span.children) {
            const childDepthPx = renderSettings.spanPaddingCatPx +
                spanTreeDepthPx(child, renderSettings);
            descendantsDepthPx = Math.max(descendantsDepthPx, childDepthPx);
        }
        depthPx += descendantsDepthPx;
    }
    return depthPx;
}
/**
 * Adds a RenderedCategory for a horizontal-span trace, using the provided
 * TraceRenderSettings and corresponding to the provided TraceCategory, to the
 * provided array of RenderedTraceCategories, and recursively adds its children,
 * returning the new rendered category's depth on the y-axis.  The rendered
 * category's upper left corner is specified by (x0Px, y0Px), its right extent
 * by x1Px, and its other characteristics by the provided TraceRenderSettings.
 * Categories are added to the RenderedCategory array in pre-order
 * traversal order: parents before children, children in declaration order.
 */
function addCategoryForHorizontalSpans(category, x0Px, x1Px, y0Px, renderSettings, cats) {
    let depthPx = renderSettings.categoryRenderSettings.categoryHeaderCatPx;
    // Add all the category's spans.
    for (const span of category.spans) {
        depthPx = Math.max(depthPx, spanTreeDepthPx(span, renderSettings));
    }
    // Then add all its subcategories.  Add these to a separate array, so that
    // we can later insert the parent RenderedCategory before its children
    // for a preorder traversal.
    const subcats = [];
    for (const subcategory of category.categories) {
        // Pad prior to every child category.
        depthPx += renderSettings.categoryRenderSettings.categoryPaddingCatPx;
        depthPx += addCategoryForHorizontalSpans(subcategory, x0Px + renderSettings.categoryRenderSettings.categoryMarginValPx, x1Px, y0Px + depthPx, renderSettings, subcats);
    }
    // If the category height is less than the minimum, set it to the minimum.
    if (depthPx < renderSettings.categoryRenderSettings.categoryMinWidthCatPx) {
        depthPx = renderSettings.categoryRenderSettings.categoryMinWidthCatPx;
    }
    const cat = new RenderedCategory(category.category, category.properties, renderSettings.categoryRenderSettings, x0Px, y0Px, x1Px, y0Px + depthPx);
    cats.push(cat);
    cats.push(...subcats);
    return depthPx;
}
/**
 * Returns a RenderedCategoryHierarchy suitable for use on the Y axis
 * alongside trace spans rendered by RenderHorizontalTraceSpans(trace, ...,
 * renderSettings).
 */
export function renderCategoryHierarchyForHorizontalSpans(trace) {
    const renderSettings = trace.renderSettings();
    const categoryX0Px = 0;
    let categoryX1Px = renderSettings.categoryRenderSettings.categoryBaseWidthValPx;
    let y0Px = 0;
    // Figure out how wide the category bar should be.
    for (const category of trace.categories) {
        const thisCatWidth = categoryX0Px +
            renderSettings.categoryRenderSettings.categoryBaseWidthValPx +
            category.categoryHeight *
                renderSettings.categoryRenderSettings.categoryMarginValPx;
        if (thisCatWidth > categoryX1Px) {
            categoryX1Px = thisCatWidth;
        }
    }
    const renderedCats = [];
    // Iterate through trace categories.
    for (const category of trace.categories) {
        y0Px += addCategoryForHorizontalSpans(category, categoryX0Px, categoryX1Px, y0Px, renderSettings, renderedCats);
    }
    return new RenderedCategoryHierarchy(trace.properties, renderedCats);
}
/** A set of rendered trace spans. */
export class RenderedTraceSpans {
    spans;
    edges;
    constructor(spans, edges) {
        this.spans = spans;
        this.edges = edges;
    }
}
/**
 * Adds a RenderedTraceSpan for a horizontal-span trace, using the provided
 * TraceRenderSettings and corresponding to the provided Span or Subspan, to the
 * provided array of RenderedTraceSpans, and recursively adds its children,
 * returning the lower extent of all added RenderedTraceSpans.  The rendered
 * span's left and right extents are computed from the provided domainToRange
 * function, and its upper extent is provided in y0Px.  Its other
 * characteristics by the provided TraceRenderSettings.  Spans are added to the
 * RenderedTraceSpan array in pre-order traversal order: parents before
 * children, children in declaration order.
 */
function addHorizontalSpan(span, y0Px, domainToRange, renderSettings, spans, edgeNodesByID) {
    const x0Px = domainToRange(span.properties, traceStartKey);
    const x1Px = domainToRange(span.properties, traceEndKey);
    const renderedSpan = new RenderedTraceSpan(getSpanRenderID(span), span.properties, x0Px, y0Px, x1Px, y0Px + renderSettings.spanWidthCatPx);
    spans.push(renderedSpan);
    let y1Px = renderedSpan.y1Px;
    for (const edgeNode of Node.fromSpan(span)) {
        if (edgeNodesByID.has(edgeNode.nodeID)) {
            throw new ConfigurationError(`Multiple trace edge nodes with ID ${edgeNode.nodeID} defined`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        edgeNodesByID.set(edgeNode.nodeID, {
            xPx: domainToRange(edgeNode.properties, traceEdgeStartKey),
            yPx: y0Px + (y1Px - y0Px) / 2,
            properties: edgeNode.properties,
            endpointNodeIDs: edgeNode.endpointNodeIDs,
        });
    }
    if (span instanceof Span) {
        for (const child of span.children) {
            y1Px = Math.max(y1Px, addHorizontalSpan(child, y0Px + renderSettings.spanWidthCatPx +
                renderSettings.spanPaddingCatPx, domainToRange, renderSettings, spans, edgeNodesByID));
        }
        for (const subspan of span.subspans) {
            addHorizontalSpan(subspan, y0Px, domainToRange, renderSettings, spans, edgeNodesByID);
        }
    }
    return y1Px;
}
/**
 * Adds RenderedTraceSpans for all TraceSpans under the provided TraceCategory
 * or any of its descendants, using the provided TraceRenderSettings, to the
 * provided array of RenderedTraceSpans, returning the lower extent of all added
 * RenderedTraceSpans.  Direct children of the category are rendered at top,
 * then category children are rendered beneath that.  Individual spans are added
 * via addHorizontalSpan.
 */
function addHorizontalCategorySpans(category, y0Px, domainToRange, renderSettings, spans, edgeNodesByID) {
    let y1Px = y0Px + renderSettings.categoryRenderSettings.categoryHeaderCatPx;
    // Add all the category's spans.
    for (const span of category.spans) {
        y1Px = Math.max(y1Px, addHorizontalSpan(span, y0Px, domainToRange, renderSettings, spans, edgeNodesByID));
    }
    // Then add all its subspans.
    for (const subcategory of category.categories) {
        // Pad prior to every child category.
        y1Px = addHorizontalCategorySpans(subcategory, y1Px + renderSettings.categoryRenderSettings.categoryPaddingCatPx, domainToRange, renderSettings, spans, edgeNodesByID);
    }
    // If the category height is less than the minimum, set it to the minimum.
    if ((y1Px - y0Px) <
        renderSettings.categoryRenderSettings.categoryMinWidthCatPx) {
        y1Px = y0Px + renderSettings.categoryRenderSettings.categoryMinWidthCatPx;
    }
    return y1Px;
}
function clampFraction(num) {
    return Math.min(Math.max(num, 0.0), 1.0);
}
/**
 * Returns a RenderedTraceSpans generated by applying the provided render
 * settings to the provided trace's spans horizontally; that is, with the trace
 * duration along the X axis, with the range going from 0 to the provided width.
 */
export function renderHorizontalTraceSpans(trace, widthPx) {
    const domainToRange = (properties, key) => {
        const domainFraction = trace.axis.valueToDomainFraction(properties, key);
        return Math.round(clampFraction(domainFraction) * widthPx);
    };
    const renderedSpans = [];
    const edgeNodesByID = new Map();
    // For each category, render all its spans.
    let y1Px = 0;
    for (const category of trace.categories) {
        y1Px = addHorizontalCategorySpans(category, y1Px, domainToRange, trace.renderSettings(), renderedSpans, edgeNodesByID);
    }
    const renderedEdges = [];
    for (const startNode of edgeNodesByID.values()) {
        for (const endpointNodeID of startNode.endpointNodeIDs) {
            if (edgeNodesByID.has(endpointNodeID)) {
                const endNode = edgeNodesByID.get(endpointNodeID);
                renderedEdges.push(new RenderedTraceEdge(getEdgeRenderID(startNode, endpointNodeID, endNode), startNode.properties, startNode.xPx, startNode.yPx, endNode.xPx, endNode.yPx));
            }
            else {
                console.log(`can't find endpoint node ID ${endpointNodeID}`);
            }
        }
    }
    return new RenderedTraceSpans(renderedSpans, renderedEdges);
}
/**
 * Returns a unique identifier for the provided span. This ID is used to create
 * smoother animations when changing the view of the trace. We calculate it
 * using the start and end time of the span so it will be the same each time the
 * trace is loaded.
 */
function getSpanRenderID(span) {
    const spanDetail = span.properties.has(Keys.DETAIL_FORMAT) ? '-' +
        span.properties.format(span.properties.expectString(Keys.DETAIL_FORMAT)) :
        '';
    const spanStart = span.properties.get(traceStartKey);
    const spanEnd = span.properties.get(traceEndKey);
    return `${timeValueToString(spanStart)}-${timeValueToString(spanEnd)}${spanDetail}`;
}
/**
 * Returns a unique identifier for the provided edge. This ID is used to create
 * smoother animations when changing the view of the trace. We calculate it
 * using the start times of the start and end nodes of the edge so it will be
 * the same each time the trace is loaded.
 */
function getEdgeRenderID(startNode, endpointNodeID, endNode) {
    const startNodeVal = startNode.properties.get(traceEdgeStartKey);
    const endNodeVal = endNode.properties.get(traceEdgeStartKey);
    return `${timeValueToString(startNodeVal)}-${timeValueToString(endNodeVal)}-${endpointNodeID}`;
}
function timeValueToString(value) {
    if (value instanceof TimestampValue) {
        return `${value.val.seconds}_${value.val.nanos}`;
    }
    else if (value instanceof DurationValue) {
        return `${value.val.nanos}`;
    }
    else {
        throw new ConfigurationError(`Type ${typeof value} is not supported`)
            .from(SOURCE)
            .at(Severity.ERROR);
    }
}
//# sourceMappingURL=renderers.js.map