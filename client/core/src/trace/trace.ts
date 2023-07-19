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
 * @fileoverview Tools for working with trace data.  See
 * ../../../../server/go/trace/trace.go for more detail.
 *
 * Multiple trace responses (potentially from different data sources) may be
 * merged in the frontend for display in a single UI component, via the
 * Trace::union() static method.  Trace unioning is performed by recursive
 * trace category unioning: if two traces or unioned trace categories define
 * identical child categories, those categories are unioned.  In addition to the
 * recursive work described above, when two categories A and B are unioned,
 * their union has all spans under A and all those under B.  Individual spans
 * are not unioned, even if they're identical.
 */

import {ConfigurationError, Severity} from '../errors/errors.js';
import {ResponseNode} from '../protocol/response_interface.js';
import {ValueMap} from '../value/value_map.js';
import {Category, categoryEquals, categoryProperties, getDefinedCategory} from '../category/category.js';
import {axisProperties, DurationAxis, getAxis, TimestampAxis, unionAxes} from '../continuous_axis/continuous_axis.js';
import {Duration} from '../duration/duration.js';
import {Timestamp} from '../timestamp/timestamp.js';
import {children} from '../payload/payload.js';

const SOURCE='trace';

enum Keys {
  OFFSET='trace_offset',
  DURATION='trace_duration',
  NODE_TYPE='trace_node_type',
  PAYLOAD_TYPE='trace_payload',

  // Rendering properties.
  SPAN_WIDTH_CAT_PX='span_width_cat_px',
  SPAN_PADDING_CAT_PX='span_padding_cat_px',
  CATEGORY_HEADER_CAT_PX='category_header_cat_px',
  CATEGORY_HANDLE_TEMP_PX='category_handle_temp_px',
  CATEGORY_PADDING_CAT_PX='category_padding_cat_px',
  CATEGORY_MARGIN_TEMP_PX='category_margin_temp_px',
  CATEGORY_MIN_WIDTH_CAT_PX='category_min_width_cat_px',
  CATEGORY_BASE_WIDTH_TEMP_PX='category_base_width_temp_px',
}

/**
 * A collection of settings for rendering traces.  A trace is rendered on a
 * two-dimensional plane, with one axis (typically the x-axis) showing trace
 * temporal duration ('temp') and the other (typically the y-axis) showing the
 * hierarchical and concurrent dimension of the trace via a hierarchy of trace
 * categories ('cat').
 *
 * These settings are generally defined as extents, in units of pixels, along
 * these two axes, so are suffixed 'TempPx' for a pixel extent along the
 * temporal axis, or 'CatPx' for a pixel extent along the category axis.
 */
export interface RenderSettings {
  // The padding between adjacent spans along the category axis.  If x is the
  // temporal axis, this is the vertical spacing between spans.
  spanWidthCatPx: number;
  // The width of a span along the category axis.  If x is the temporal axis,
  // this is the default height of a span.
  spanPaddingCatPx: number;
  // The width of the category header along the category axis.  If x is the
  // temporal axis, this is the vertical space at the top of a category header
  // where a category label may be shown.
  categoryHeaderCatPx: number;
  // The width, in pixels along the temporal axis, of a 'handle' rendered at the
  // distal end of a category header; its height is categoryHeaderCatPx.
  categoryHandleTempPx: number;
  // The padding between adjacent categories along the category axis.  If x is
  // the temporal axis, this is the vertical spacing between categories.
  categoryPaddingCatPx: number;
  // The margin between parent and child categories along the temporal axis.
  // If x is the temporal axis, this is the horizontal indent of a child
  // category under its parent.
  categoryMarginTempPx: number;
  // The minimum width of a category along the category axis.  If x is the
  // temporal axis, this is the minimum height of a category header.
  categoryMinWidthCatPx: number;
  // The base width of a category along the temporal axis, not including
  // margins.  If x is the temporal axis, this is the minimum horizontal width
  // of any category header in the trace (though ancestor categories will have
  // wider headers.)
  categoryBaseWidthTempPx: number;
}

enum NodeType {
  CATEGORY=0,
  SPAN=1,
  SUBSPAN=2,
}

/** A category awaiting unioning. */
interface UnioningCategory {
  // A TraceCategory to be merged.
  traceCategory: TraceCategory;
  // An adjustment to be added to all offsets within the Category.
  offsetAdjustment: Duration;
}

/** A trace object embedded in a ResponseNode. */
export class Trace {
  private constructor(
    readonly properties: ValueMap, readonly categories: TraceCategory[],
    readonly axis: TimestampAxis|DurationAxis) { }

  // Constructs a new Trace from a provided ResponseNode.
  static fromNode(node: ResponseNode): Trace {
    const axis=getAxis(node.properties);
    if (!((axis instanceof TimestampAxis||axis instanceof DurationAxis))) {
      throw new ConfigurationError(`trace axis must be timestamp or duration`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    const categories=new Array<TraceCategory>();
    for (const child of node.children) {
      switch (child.properties.expectNumber(Keys.NODE_TYPE)) {
        case NodeType.CATEGORY:
          categories.push(TraceCategory.fromNode(child));
          break;
        default:
          throw new ConfigurationError(
            `unsupported node type ${child.properties.expectNumber(Keys.NODE_TYPE)} as Trace child`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
    }
    return new Trace(node.properties, categories, axis);
  }

  // Unions multiple traces into one.
  static union(...traces: Trace[]): Trace {
    if (traces.length===1) {
      return traces[0];
    }
    const categoryIDs=new Array<string>();
    const categoriesByID=new Map<string, UnioningCategory[]>();
    const axis=unionAxes(...(traces.map(trace => trace.axis)));
    if (!((axis instanceof TimestampAxis||axis instanceof DurationAxis))) {
      throw new ConfigurationError(`trace axis must be timestamp or duration`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    const unionedBasis=axis.min;
    const props: ValueMap[]=[];
    for (const trace of traces) {
      props.push(trace.properties.without(...axisProperties));
      let offsetAdjustment: Duration|undefined;
      if (unionedBasis instanceof Timestamp&&
        trace.axis.min instanceof Timestamp) {
        offsetAdjustment=trace.axis.min.sub(unionedBasis);
      }
      if (unionedBasis instanceof Duration&&
        trace.axis.min instanceof Duration) {
        offsetAdjustment=trace.axis.min.sub(unionedBasis);
      }
      if (offsetAdjustment===undefined) {
        throw new Error(`failed to compute trace axis offset adjustment`);
      }
      for (const otherCategory of trace.categories) {
        const categories=categoriesByID.get(otherCategory.category.id);
        if (categories===undefined) {
          categoryIDs.push(otherCategory.category.id);
          categoriesByID.set(otherCategory.category.id, [{
            traceCategory: otherCategory,
            offsetAdjustment,
          }]);
        } else {
          categories.push({
            traceCategory: otherCategory,
            offsetAdjustment,
          });
        }
      }
    }
    const categories: TraceCategory[]=[];
    for (const categoryID of categoryIDs) {
      categories.push(TraceCategory.union(...categoriesByID.get(categoryID)!));
    }
    return new Trace(ValueMap.union(...props), categories, axis);
  }

  renderSettings(): RenderSettings {
    return {
      spanWidthCatPx: this.properties.expectNumber(Keys.SPAN_WIDTH_CAT_PX),
      categoryHeaderCatPx:
        this.properties.expectNumber(Keys.CATEGORY_HEADER_CAT_PX),
      categoryHandleTempPx:
        this.properties.expectNumber(Keys.CATEGORY_HANDLE_TEMP_PX),
      categoryPaddingCatPx:
        this.properties.expectNumber(Keys.CATEGORY_PADDING_CAT_PX),
      categoryMarginTempPx:
        this.properties.expectNumber(Keys.CATEGORY_MARGIN_TEMP_PX),
      categoryMinWidthCatPx: this.properties.expectNumber(Keys.CATEGORY_MIN_WIDTH_CAT_PX),
      spanPaddingCatPx: this.properties.expectNumber(Keys.SPAN_PADDING_CAT_PX),
      categoryBaseWidthTempPx:
        this.properties.expectNumber(Keys.CATEGORY_BASE_WIDTH_TEMP_PX),
    };
  }
}

/** A trace category under a Trace or another TraceCategory. */
export class TraceCategory {
  // The greatest height, in units of spans, of all spans directly under this
  // category.
  readonly selfSpanHeight: number;
  // The accumulated greatest-heights-per-category of this category and all its
  // descendant categories.
  readonly totalSpanHeight: number;
  // The greatest height, in units of categories, among this category's
  // descendants.
  readonly categoryHeight: number;

  private constructor(
    readonly category: Category, readonly categories: TraceCategory[],
    readonly spans: Span[], readonly properties: ValueMap) {
    this.selfSpanHeight=0;
    for (const span of this.spans) {
      if (span.height>this.selfSpanHeight) {
        this.selfSpanHeight=span.height;
      }
    }
    this.categoryHeight=0;
    this.totalSpanHeight=this.selfSpanHeight;
    for (const category of this.categories) {
      this.totalSpanHeight+=category.totalSpanHeight;
      if (category.categoryHeight>this.categoryHeight) {
        this.categoryHeight=category.categoryHeight;
      }
    }
    this.categoryHeight++;
  }

  // Constructs a new TraceCategory from a provided ResponseNode.
  static fromNode(node: ResponseNode): TraceCategory {
    const properties=node.properties.without(
      ...categoryProperties,
      Keys.NODE_TYPE,
    );
    const cat=getDefinedCategory(node.properties);
    if (!cat) {
      throw new ConfigurationError(`trace category defines no category!`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    const subcats=new Array<TraceCategory>();
    const spans=new Array<Span>();
    for (const child of node.children) {
      switch (child.properties.expectNumber(Keys.NODE_TYPE)) {
        case NodeType.CATEGORY:
          subcats.push(TraceCategory.fromNode(child));
          break;
        case NodeType.SPAN:
          spans.push(Span.fromNode(child));
          break;
        default:
          throw new ConfigurationError(
            `unsupported node type ${child.properties.expectNumber(
              Keys.NODE_TYPE)} as TraceCategory child`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
    }
    return new TraceCategory(cat, subcats, spans, properties);
  }

  // Unions multiple Categories into one.
  static union(...cats: UnioningCategory[]): TraceCategory {
    const spans=new Array<Span>();
    const subcategoryIDs=new Array<string>();
    const subcategoriesByID=new Map<string, UnioningCategory[]>();
    let category: Category|undefined;
    let properties: ValueMap|undefined;

    for (const cat of cats) {
      const traceCategory=cat.traceCategory;
      const offsetAdjustment=cat.offsetAdjustment;
      if (category===undefined) {
        category=traceCategory.category;
      } else {
        if (!categoryEquals(category, traceCategory.category)) {
          throw new ConfigurationError(
            `can't union TraceCategories with different category definitions!`)
            .from(SOURCE)
            .at(Severity.ERROR);
        }
      }
      if (properties===undefined) {
        properties=traceCategory.properties;
      } else {
        properties=ValueMap.union(properties, traceCategory.properties);
      }
      spans.push(...(traceCategory.spans.map(
        span => span.withOffsetAdjustment(offsetAdjustment))));
      for (const subcategory of traceCategory.categories) {
        const subcategories=subcategoriesByID.get(subcategory.category.id);
        if (subcategories===undefined) {
          subcategoryIDs.push(subcategory.category.id);
          subcategoriesByID.set(subcategory.category.id, [{
            traceCategory: subcategory,
            offsetAdjustment,
          }]);
        } else {
          subcategories.push({
            traceCategory: subcategory,
            offsetAdjustment,
          });
        }
      }
    }
    if (category===undefined||properties===undefined) {
      throw new Error(
        `TraceCategory.union() requires at least one well-formed argument`);
    }
    const subcategories: TraceCategory[]=[];
    for (const subcategoryID of subcategoryIDs) {
      subcategories.push(
        TraceCategory.union(...subcategoriesByID.get(subcategoryID)!));
    }
    return new TraceCategory(category, subcategories, spans, properties);
  }
}

/** A trace span under a TraceCategory or another Span. */
export class Span {
  private constructor(
    // This Span's start offset and duration.
    readonly offset: Duration, readonly duration: Duration,
    // This Span's child Spans and Subspans
    readonly children: Span[], readonly subspans: Subspan[],
    // A mapping from payload type to list of payloads of that type, in
    // definition order.
    readonly payloads: ReadonlyMap<string, ResponseNode[]>,
    // This Span's properties.
    readonly properties: ValueMap,
    // The distance, in spans, to this span's deepest descendant.
    readonly height: number) { }

  withOffsetAdjustment(offsetAdjustment: Duration): Span {
    return new Span(
      this.offset.add(offsetAdjustment), this.duration,
      this.children.map(
        child => child.withOffsetAdjustment(offsetAdjustment)),
      this.subspans.map(
        subspan => subspan.withOffsetAdjustment(offsetAdjustment)),
      this.payloads, this.properties, this.height);
  }

  // Constructs a new Span from a provided ResponseNode.
  static fromNode(node: ResponseNode): Span {
    const properties=
      node.properties.without(Keys.NODE_TYPE, Keys.OFFSET, Keys.DURATION);
    const offset=node.properties.expectDuration(Keys.OFFSET);
    const duration=(node.properties.has(Keys.DURATION))?
      node.properties.expectDuration(Keys.DURATION):
      new Duration(0);
    const c=children(node);
    const subspans=new Array<Subspan>();
    const spans=new Array<Span>();
    for (const child of c.structural) {
      switch (child.properties.expectNumber(Keys.NODE_TYPE)) {
        case NodeType.SPAN:
          spans.push(Span.fromNode(child));
          break;
        case NodeType.SUBSPAN:
          subspans.push(Subspan.fromNode(child));
          break;
        default:
          throw new ConfigurationError(
            `unsupported node type ${child.properties.expectNumber(Keys.NODE_TYPE)} as Span child`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
    }
    let greatestChildHeight=0;
    for (const child of spans) {
      if (child.height>greatestChildHeight) {
        greatestChildHeight=child.height;
      }
    }
    const height=greatestChildHeight+1;
    const childSpans=spans;
    return new Span(
      offset, duration, childSpans, subspans, c.payload, properties, height);
  }
}

/** A trace subspan under a Span. */
export class Subspan {
  private constructor(
    // This Span's start offset and duration.
    readonly offset: Duration, readonly duration: Duration,
    // A mapping from payload type to list of payloads of that type, in
    // definition order.
    readonly payloads: ReadonlyMap<string, ResponseNode[]>,
    // This Span's properties.
    readonly properties: ValueMap) { }

  withOffsetAdjustment(offsetAdjustment: Duration): Subspan {
    return new Subspan(
      this.offset.add(offsetAdjustment), this.duration, this.payloads,
      this.properties);
  }

  // Constructs a new Subspan from a provided ResponseNode.
  static fromNode(node: ResponseNode): Subspan {
    const properties=
      node.properties.without(Keys.NODE_TYPE, Keys.OFFSET, Keys.DURATION);
    const offset=node.properties.expectDuration(Keys.OFFSET);
    const duration=(node.properties.has(Keys.DURATION))?
      node.properties.expectDuration(Keys.DURATION):
      new Duration(0);
    const c=children(node);
    if (c.structural.length>0) {
      throw new ConfigurationError(
        `subspans should have no non-payload children`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    return new Subspan(offset, duration, c.payload, properties);
  }
}
