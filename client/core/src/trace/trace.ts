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

import {Category, categoryEquals, categoryProperties, getDefinedCategory} from '../category/category.js';
import {Axis, axisProperties, getAxis} from '../continuous_axis/continuous_axis.js';
import {ConfigurationError, Severity} from '../errors/errors.js';
import {children} from '../payload/payload.js';
import {ResponseNode} from '../protocol/response_interface.js';
import {ValueMap} from '../value/value_map.js';
import {RenderSettings as CategoryRenderSettings, renderSettingsFromProperties as categoryRenderSettingsFromProperties} from '../category_axis/category_axis.js'

const SOURCE = 'trace';

enum Key {
  START = 'trace_start',
  END = 'trace_end',
  NODE_TYPE = 'trace_node_type',
  PAYLOAD_TYPE = 'trace_payload',

  // Rendering properties.
  SPAN_WIDTH_CAT_PX = 'span_width_cat_px',
  SPAN_PADDING_CAT_PX = 'span_padding_cat_px',
}

/** The key of the start value of a trace span or subspan. */
export const startKey = Key.START;
/** The key of the start value of a trace span or subspan. */
export const endKey = Key.END;

/**
 * A collection of settings for rendering traces.  A trace is rendered on a
 * two-dimensional plane, with a temporal value axis (typically X) and a
 * category axis (typically Y).
 *
 * These settings are generally defined as extents, in units of pixels, along
 * these two axes, so are suffixed 'ValPx' for a pixel extent along the
 * value axis, or 'CatPx' for a pixel extent along the category axis.
 */
export interface RenderSettings {
  // The padding between adjacent spans along the category axis.  If x is the
  // value axis, this is the vertical spacing between spans.
  spanWidthCatPx: number;
  // The width of a span along the category axis.  If x is the value axis,
  // this is the default height of a span.
  spanPaddingCatPx: number;
  // The category render settings for this trace.
  categoryRenderSettings: CategoryRenderSettings;
}

enum NodeType {
  CATEGORY = 0,
  SPAN = 1,
  SUBSPAN = 2,
}

/** A category awaiting unioning. */
interface UnioningCategory<T> {
  // A TraceCategory to be merged.
  traceCategory: TraceCategory<T>;
}

/** A trace object embedded in a ResponseNode. */
export class Trace<T> {
  private constructor(
      readonly properties: ValueMap,
      readonly categories: Array<TraceCategory<T>>, readonly axis: Axis<T>) {}

  private static buildTrace<T>(axis: Axis<T>, node: ResponseNode): Trace<T> {
    const categories = new Array<TraceCategory<T>>();
    for (const child of node.children) {
      switch (child.properties.expectNumber(Key.NODE_TYPE)) {
        case NodeType.CATEGORY:
          categories.push(TraceCategory.fromNode(axis, child));
          break;
        default:
          throw new ConfigurationError(
              `unsupported node type ${
                  child.properties.expectNumber(Key.NODE_TYPE)} as Trace child`)
              .from(SOURCE)
              .at(Severity.ERROR);
      }
    }
    return new Trace(node.properties, categories, axis);
  }

  // Constructs a new Trace from a provided ResponseNode.
  static fromNode(node: ResponseNode): Trace<unknown> {
    return Trace.buildTrace(getAxis(node.properties), node);
  }

  private merge(other: Trace<unknown>): Trace<T> {
    if (this.axis.type !== other.axis.type) {
      throw new ConfigurationError(`can't union traces of different types`)
          .from(SOURCE)
          .at(Severity.ERROR);
    }
    const traces = [this, other as Trace<T>];
    const categoryIDs = new Array<string>();
    const categoriesByID = new Map<string, Array<UnioningCategory<T>>>();
    const unionedAxis = this.axis.union(other.axis);
    const props: ValueMap[] = [];
    for (const trace of traces) {
      props.push(trace.properties.without(...axisProperties));
      for (const otherCategory of trace.categories) {
        const categories = categoriesByID.get(otherCategory.category.id);
        if (categories === undefined) {
          categoryIDs.push(otherCategory.category.id);
          categoriesByID.set(otherCategory.category.id, [{
                               traceCategory: otherCategory,
                             }]);
        } else {
          categories.push({
            traceCategory: otherCategory,
          });
        }
      }
    }
    const categories: Array<TraceCategory<T>> = [];
    for (const categoryID of categoryIDs) {
      categories.push(
          TraceCategory.union(unionedAxis, ...categoriesByID.get(categoryID)!));
    }
    return new Trace(ValueMap.union(...props), categories, unionedAxis);
  }

  // Unions multiple traces into one.
  static union(...traces: Array<Trace<unknown>>): Trace<unknown> {
    if (traces.length <= 0) {
      throw new ConfigurationError(
          `Trace.union requires at least one trace argument`)
          .from(SOURCE)
          .at(Severity.ERROR);
    }
    if (traces.length === 1) {
      return traces[0];
    }
    let ret = traces[0];
    for (const trace of traces.slice(1)) {
      ret = ret.merge(trace);
    }
    return ret;
  }

  renderSettings(): RenderSettings {
    return {
      spanWidthCatPx: this.properties.expectNumber(Key.SPAN_WIDTH_CAT_PX),
      spanPaddingCatPx: this.properties.expectNumber(Key.SPAN_PADDING_CAT_PX),
      categoryRenderSettings: categoryRenderSettingsFromProperties(this.properties),
    };
  }
}

/** A trace category under a Trace or another TraceCategory. */
export class TraceCategory<T> {
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
      readonly axis: Axis<T>, readonly category: Category,
      readonly categories: Array<TraceCategory<T>>,
      readonly spans: Array<Span<T>>, readonly properties: ValueMap) {
    this.selfSpanHeight = 0;
    for (const span of this.spans) {
      if (span.height > this.selfSpanHeight) {
        this.selfSpanHeight = span.height;
      }
    }
    this.categoryHeight = 0;
    this.totalSpanHeight = this.selfSpanHeight;
    for (const category of this.categories) {
      this.totalSpanHeight += category.totalSpanHeight;
      if (category.categoryHeight > this.categoryHeight) {
        this.categoryHeight = category.categoryHeight;
      }
    }
    this.categoryHeight++;
  }

  // Constructs a new TraceCategory from a provided ResponseNode.
  static fromNode<T>(axis: Axis<T>, node: ResponseNode): TraceCategory<T> {
    const properties = node.properties.without(
        ...categoryProperties,
        Key.NODE_TYPE,
    );
    const cat = getDefinedCategory(node.properties);
    if (!cat) {
      throw new ConfigurationError(`trace category defines no category!`)
          .from(SOURCE)
          .at(Severity.ERROR);
    }
    const subcats = new Array<TraceCategory<T>>();
    const spans: Array<Span<T>> = [];
    for (const child of node.children) {
      switch (child.properties.expectNumber(Key.NODE_TYPE)) {
        case NodeType.CATEGORY:
          subcats.push(TraceCategory.fromNode(axis, child));
          break;
        case NodeType.SPAN:
          spans.push(new Span(axis, child));
          break;
        default:
          throw new ConfigurationError(
              `unsupported node type ${
                  child.properties.expectNumber(
                      Key.NODE_TYPE)} as TraceCategory child`)
              .from(SOURCE)
              .at(Severity.ERROR);
      }
    }
    return new TraceCategory(axis, cat, subcats, spans, properties);
  }

  // Unions multiple Categories into one.
  static union<T>(axis: Axis<T>, ...cats: Array<UnioningCategory<T>>):
      TraceCategory<T> {
    const spans: Array<Span<T>> = [];
    const subcategoryIDs = new Array<string>();
    const subcategoriesByID = new Map<string, Array<UnioningCategory<T>>>();
    let category: Category|undefined;
    let properties: ValueMap|undefined;

    for (const cat of cats) {
      const traceCategory = cat.traceCategory;
      if (category === undefined) {
        category = traceCategory.category;
      } else {
        if (!categoryEquals(category, traceCategory.category)) {
          throw new ConfigurationError(
              `can't union TraceCategories with different category definitions!`)
              .from(SOURCE)
              .at(Severity.ERROR);
        }
      }
      if (properties === undefined) {
        properties = traceCategory.properties;
      } else {
        properties = ValueMap.union(properties, traceCategory.properties);
      }
      spans.push(...traceCategory.spans);
      for (const subcategory of traceCategory.categories) {
        const subcategories = subcategoriesByID.get(subcategory.category.id);
        if (subcategories === undefined) {
          subcategoryIDs.push(subcategory.category.id);
          subcategoriesByID.set(subcategory.category.id, [{
                                  traceCategory: subcategory,
                                }]);
        } else {
          subcategories.push({
            traceCategory: subcategory,
          });
        }
      }
    }
    if (category === undefined || properties === undefined) {
      throw new Error(
          `TraceCategory.union() requires at least one well-formed argument`);
    }
    const subcategories: Array<TraceCategory<T>> = [];
    for (const subcategoryID of subcategoryIDs) {
      subcategories.push(
          TraceCategory.union(axis, ...subcategoriesByID.get(subcategoryID)!));
    }
    return new TraceCategory(axis, category, subcategories, spans, properties);
  }
}

/** A trace span under a TraceCategory or another Span. */
export class Span<T> {
  // This Span's child Spans and Subspans
  readonly children: Array<Span<T>>;
  readonly subspans: Array<Subspan<T>>;
  // A mapping from payload type to list of payloads of that type, in
  // definition order.
  readonly payloads: ReadonlyMap<string, ResponseNode[]>;
  // This Span's properties.
  readonly properties: ValueMap;
  // The distance, in spans, to this span's deepest descendant.
  readonly height: number;

  constructor(readonly axis: Axis<T>, node: ResponseNode) {
    const c = children(node);
    this.subspans = [];
    this.children = [];
    for (const child of c.structural) {
      switch (child.properties.expectNumber(Key.NODE_TYPE)) {
        case NodeType.SPAN:
          this.children.push(new Span(this.axis, child));
          break;
        case NodeType.SUBSPAN:
          this.subspans.push(new Subspan(this.axis, child));
          break;
        default:
          throw new ConfigurationError(
              `unsupported node type ${
                  child.properties.expectNumber(Key.NODE_TYPE)} as Span child`)
              .from(SOURCE)
              .at(Severity.ERROR);
      }
    }
    let greatestChildHeight = 0;
    for (const child of this.children) {
      if (child.height > greatestChildHeight) {
        greatestChildHeight = child.height;
      }
    }
    this.payloads = c.payload;
    this.properties = node.properties.without(Key.NODE_TYPE);
    this.height = greatestChildHeight + 1;
  }

  start(): T {
    return this.axis.value(this.properties, Key.START);
  }

  end(): T {
    return this.axis.value(this.properties, Key.END);
  }
}

/** A trace subspan under a Span. */
export class Subspan<T> {
  // A mapping from payload type to list of payloads of that type, in
  // definition order.
  readonly payloads: ReadonlyMap<string, ResponseNode[]>;
  // This Span's properties.
  readonly properties: ValueMap;

  constructor(readonly axis: Axis<T>, node: ResponseNode) {
    const c = children(node);
    if (c.structural.length > 0) {
      throw new ConfigurationError(
          `subspans should have no non-payload children`)
          .from(SOURCE)
          .at(Severity.ERROR);
    }
    this.payloads = c.payload;
    this.properties = node.properties.without(Key.NODE_TYPE);
  }

  start(): T {
    return this.axis.value(this.properties, Key.START);
  }

  end(): T {
    return this.axis.value(this.properties, Key.END);
  }
}
