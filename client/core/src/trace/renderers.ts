/**
 * @fileoverview A collection of types for rendering trace spans and
 * categories.
 */

import { DurationAxis, TimestampAxis } from '../continuous_axis/continuous_axis.js';
import { Duration } from '../duration/duration.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { RenderSettings, Span, Subspan, Trace, TraceCategory } from './trace.js';
import { Node } from '../trace_edge/trace_edge.js';
import { ValueMap } from '../value/value_map.js';

const SOURCE = 'trace_renderers';

/**
 * A span or subspan prepared for display.  The span owns the rectangle defined
 * by (x0Px, y0Px), (x1Px, y1Px); only its subspans may overlap that rectangle.
 * The rendering trace visualization component may draw the span within that
 * rectangle however it wants, possibly informed by the span's properties.
 */
export class RenderedTraceSpan {
  constructor(
      // The properties of this span.
      readonly properties: ValueMap,
      // The coordinates of this span's upper-left corner.
      readonly x0Px: number, readonly y0Px: number,
      // The coordinates of this span's lower-right corner.
      readonly x1Px: number, readonly y1Px: number) {}

  get width(): number {
    return this.x1Px - this.x0Px;
  }

  get height(): number {
    return this.y1Px - this.y0Px;
  }
}

/**
 * An edge overlaid on the trace, between two points within Spans or Subspans.
 */
export class RenderedTraceEdge {
  constructor(
      readonly properties: ValueMap,
      // The coordinates of this edge's origin
      readonly x0Px: number, readonly y0Px: number,
      // The coordinates of this edge's destination.
      readonly x1Px: number, readonly y1Px: number) {}
}

/**
 * A category prepared for display.  The category owns the rectangle defined by
 * (x0Px, y0Px), (x1Px, y1Px); only its subcategories may overlap that
 * rectangle.  The rendering axis visualization component may draw the span
 * within that rectangle however it wants, possibly informed by the category's
 * properties and the TraceRenderSettings used in rendering.
 */
export class RenderedTraceCategory {
  private readonly childrenInternal: RenderedTraceCategory[] = [];

  constructor(
      readonly cat: TraceCategory, readonly renderSettings: RenderSettings,
      readonly x0Px: number, readonly y0Px: number, readonly x1Px: number,
      readonly y1Px: number) {}

  get properties(): ValueMap {
    return this.cat.properties;
  }

  get width(): number {
    return this.x1Px - this.x0Px;
  }

  get height(): number {
    return this.y1Px - this.y0Px;
  }

  addChild(child: RenderedTraceCategory) {
    this.childrenInternal.push(child);
  }

  get children(): RenderedTraceCategory[] {
    return this.childrenInternal;
  }

  /** Returns the receiver and its descendants in prefix traversal order. */
  flatten(): RenderedTraceCategory[] {
    const ret = new Array<RenderedTraceCategory>();
    ret.push(this);
    for (const child of this.children) {
      ret.push(...child.flatten());
    }
    return ret;
  }
}

/**
 * Returns the depth, in pixels, of the provided span and its descendants,
 * given the provided TraceRenderSettings.
 */
function spanTreeDepthPx(
    span: Span|Subspan, renderSettings: RenderSettings): number {
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
 * Adds a RenderedTraceCategory for a horizontal-span trace, using the provided
 * TraceRenderSettings and corresponding to the provided TraceCategory, to the
 * provided array of RenderedTraceCategories, and recursively adds its children,
 * returning the new rendered category's depth on the y-axis.  The rendered
 * category's upper left corner is specified by (x0Px, y0Px), its right extent
 * by x1Px, and its other characteristics by the provided TraceRenderSettings.
 * Categories are added to the RenderedTraceCategory array in pre-order
 * traversal order: parents before children, children in declaration order.
 */
function addCategoryForHorizontalSpans(
    category: TraceCategory, x0Px: number, x1Px: number, y0Px: number,
    renderSettings: RenderSettings, cats: RenderedTraceCategory[]): number {
  let depthPx = renderSettings.categoryHeaderCatPx;
  // Add all the category's spans.
  for (const span of category.spans) {
    depthPx = Math.max(depthPx, spanTreeDepthPx(span, renderSettings));
  }
  // Then add all its subcategories.  Add these to a separate array, so that
  // we can later insert the parent RenderedTraceCategory before its children
  // for a preorder traversal.
  const subcats: RenderedTraceCategory[] = [];
  for (const subcategory of category.categories) {
    // Pad prior to every child category.
    depthPx += renderSettings.categoryPaddingCatPx;
    depthPx += addCategoryForHorizontalSpans(
        subcategory, x0Px + renderSettings.categoryMarginTempPx, x1Px,
        y0Px + depthPx, renderSettings, subcats);
  }
  // If the category height is less than the minimum, set it to the minimum.
  if (depthPx < renderSettings.categoryMinWidthCatPx) {
    depthPx = renderSettings.categoryMinWidthCatPx;
  }
  const cat = new RenderedTraceCategory(
      category, renderSettings, x0Px, y0Px, x1Px, y0Px + depthPx);
  cats.push(cat);
  cats.push(...subcats);
  return depthPx;
}

/**
 * A rendered trace category hierarchy.  Its widthPx and heightPx fields
 * specify the dimensions of the bounding box for all contained categories.
 */
export class RenderedTraceCategoryHierarchy {
  /** The width of the full set of rendered categories. */
  readonly widthPx: number = 0;
  /** The height of the full set of rendered categories. */
  readonly heightPx: number = 0;
  constructor(
      readonly properties: ValueMap,
      readonly rootCategories: RenderedTraceCategory[]) {
    // This algorithm assumes a parent RenderedTraceCategory fully encloses all
    // its children.  If this changes,
    if (this.rootCategories.length > 0) {
      let xMin = this.rootCategories[0].x0Px;
      let xMax = this.rootCategories[0].x1Px;
      let yMin = this.rootCategories[0].y0Px;
      let yMax = this.rootCategories[0].y1Px;
      for (const rootCategory of this.rootCategories) {
        if (rootCategory.x0Px < xMin) {
          xMin = rootCategory.x0Px;
        }
        if (rootCategory.x1Px > xMax) {
          xMax = rootCategory.x1Px;
        }
        if (rootCategory.y0Px < yMin) {
          yMin = rootCategory.y0Px;
        }
        if (rootCategory.y1Px > yMax) {
          yMax = rootCategory.y1Px;
        }
      }
      this.widthPx = xMax - xMin;
      this.heightPx = yMax - yMin;
    }
  }

  get categories(): RenderedTraceCategory[] {
    const ret = new Array<RenderedTraceCategory>();
    for (const rootCategory of this.rootCategories) {
      ret.push(...rootCategory.flatten());
    }
    return ret;
  }
}

/**
 * Returns a RenderedTraceCategoryHierarchy suitable for use on the Y axis
 * alongside trace spans rendered by RenderHorizontalTraceSpans(trace, ...,
 * renderSettings).
 */
export function renderCategoryHierarchyForHorizontalSpans(trace: Trace):
    RenderedTraceCategoryHierarchy {
  const renderSettings = trace.renderSettings();
  const categoryX0Px = 0;
  let categoryX1Px = renderSettings.categoryBaseWidthTempPx;
  let y0Px = 0;
  // Figure out how wide the category bar should be.
  for (const category of trace.categories) {
    const thisCatWidth = categoryX0Px + renderSettings.categoryBaseWidthTempPx +
        category.categoryHeight * renderSettings.categoryMarginTempPx;
    if (thisCatWidth > categoryX1Px) {
      categoryX1Px = thisCatWidth;
    }
  }
  const renderedCats: RenderedTraceCategory[] = [];
  // Iterate through trace categories.
  for (const category of trace.categories) {
    y0Px += addCategoryForHorizontalSpans(
        category, categoryX0Px, categoryX1Px, y0Px, renderSettings,
        renderedCats);
  }
  return new RenderedTraceCategoryHierarchy(trace.properties, renderedCats);
}

/** A set of rendered trace spans. */
export class RenderedTraceSpans {
  constructor(
      readonly spans: RenderedTraceSpan[],
      readonly edges: RenderedTraceEdge[]) {}
}

/**
 * Adds a RenderedTraceSpan for a horizontal-span trace, using the provided
 * TraceRenderSettings and corresponding to the provided Span or Subspan, to the
 * provided array of RenderedTraceSpans, and recursively adds its children,
 * returning the lower extent of all added RenderedTraceSpans.  The rendered
 * span's left and right extents are computed from the provided domainToRange
 * function, which derives from the trace's axis and the chart width, and its
 * upper extent is provided in y0Px.  Its other characteristics by the provided
 * TraceRenderSettings.  Spans are added to the RenderedTraceSpan array in
 * pre-order traversal order: parents before children, children in declaration
 * order.
 */
function addHorizontalSpan(
    span: Span|Subspan, y0Px: number,
    domainToRange: (offset: Duration) => number, renderSettings: RenderSettings,
    spans: RenderedTraceSpan[], edgeNodesByID: Map<string, EdgeNode>): number {
  const x0Px = domainToRange(span.offset);
  const x1Px = domainToRange(span.offset.add(span.duration));
  const renderedSpan = new RenderedTraceSpan(
      span.properties, x0Px, y0Px, x1Px, y0Px + renderSettings.spanWidthCatPx);
  spans.push(renderedSpan);
  let y1Px = renderedSpan.y1Px;
  for (const edgeNode of Node.fromSpan(span)) {
    if (edgeNodesByID.has(edgeNode.nodeID)) {
      throw new ConfigurationError(
          `Multiple trace edge nodes with ID ${edgeNode.nodeID} defined`)
          .from(SOURCE)
          .at(Severity.ERROR);
    }
    edgeNodesByID.set(edgeNode.nodeID, {
      xPx: domainToRange(edgeNode.offset),
      yPx: y0Px + (y1Px - y0Px) / 2,
      properties: edgeNode.properties,
      endpointNodeIDs: edgeNode.endpointNodeIDs,
    });
  }
  if (span instanceof Span) {
    for (const child of span.children) {
      y1Px = Math.max(
          y1Px,
          addHorizontalSpan(
              child,
              y0Px + renderSettings.spanWidthCatPx +
                  renderSettings.spanPaddingCatPx,
              domainToRange, renderSettings, spans, edgeNodesByID));
    }
    for (const subspan of span.subspans) {
      addHorizontalSpan(
          subspan, y0Px, domainToRange, renderSettings, spans, edgeNodesByID);
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
function addHorizontalCategorySpans(
    category: TraceCategory, y0Px: number,
    domainToRange: (offset: Duration) => number, renderSettings: RenderSettings,
    spans: RenderedTraceSpan[], edgeNodesByID: Map<string, EdgeNode>): number {
  let y1Px = y0Px + renderSettings.categoryHeaderCatPx;
  // Add all the category's spans.
  for (const span of category.spans) {
    y1Px = Math.max(
        y1Px,
        addHorizontalSpan(
            span, y0Px, domainToRange, renderSettings, spans, edgeNodesByID));
  }
  // Then add all its subspans.
  for (const subcategory of category.categories) {
    // Pad prior to every child category.
    y1Px = addHorizontalCategorySpans(
        subcategory, y1Px + renderSettings.categoryPaddingCatPx, domainToRange,
        renderSettings, spans, edgeNodesByID);
  }
  // If the category height is less than the minimum, set it to the minimum.
  if ((y1Px - y0Px) < renderSettings.categoryMinWidthCatPx) {
    y1Px = y0Px + renderSettings.categoryMinWidthCatPx;
  }
  return y1Px;
}

interface EdgeNode {
  xPx: number;
  yPx: number;
  properties: ValueMap;
  endpointNodeIDs: string[];
}

function clampFraction(num: number): number {
  return Math.min(Math.max(num, 0.0), 1.0);
}

/**
 * Returns a RenderedTraceSpans generated by applying the provided render
 * settings to the provided trace's spans horizontally; that is, with the trace
 * duration along the X axis, with the range going from 0 to the provided width.
 */
export function renderHorizontalTraceSpans(
    trace: Trace, widthPx: number): RenderedTraceSpans {
  const domainToRange = (offset: Duration) => {
    if (trace.axis instanceof TimestampAxis) {
      const rangePoint = trace.axis.atOffset(offset);
      const domainFraction = trace.axis.toDomainFraction(rangePoint);
      return Math.round(clampFraction(domainFraction) * widthPx);
    }
    if (trace.axis instanceof DurationAxis) {
      const domainFraction = trace.axis.toDomainFraction(offset);
      return Math.round(clampFraction(domainFraction) * widthPx);
    }
    throw new Error(`unsupported trace axis type`);
  };
  const renderedSpans: RenderedTraceSpan[] = [];
  const edgeNodesByID = new Map<string, EdgeNode>();
  // For each category, render all its spans.
  let y1Px = 0;
  for (const category of trace.categories) {
    y1Px = addHorizontalCategorySpans(
        category, y1Px, domainToRange, trace.renderSettings(), renderedSpans,
        edgeNodesByID);
  }
  const renderedEdges: RenderedTraceEdge[] = [];
  for (const startNode of edgeNodesByID.values()) {
    for (const endpointNodeID of startNode.endpointNodeIDs) {
      if (edgeNodesByID.has(endpointNodeID)) {
        const endNode = edgeNodesByID.get(endpointNodeID);
        renderedEdges.push(new RenderedTraceEdge(
            startNode.properties, startNode.xPx, startNode.yPx, endNode!.xPx,
            endNode!.yPx));
      } else {
        console.log(`can't find endpoint node ID ${endpointNodeID}`);
      }
    }
  }
  return new RenderedTraceSpans(renderedSpans, renderedEdges);
}