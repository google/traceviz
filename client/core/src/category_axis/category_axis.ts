/**
 * @fileoverview Types and functions for rendering category axes.
 */

import {Category} from '../category/category.js';
import {ValueMap} from '../value/value_map.js';

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

enum Key {
  CATEGORY_HEADER_CAT_PX = 'category_header_cat_px',
  CATEGORY_HANDLE_VAL_PX = 'category_handle_val_px',
  CATEGORY_PADDING_CAT_PX = 'category_padding_cat_px',
  CATEGORY_MARGIN_VAL_PX = 'category_margin_val_px',
  CATEGORY_MIN_WIDTH_CAT_PX = 'category_min_width_cat_px',
  CATEGORY_BASE_WIDTH_VAL_PX = 'category_base_width_val_px',
}

/**
 * A collection of settings for rendering category axes.  A category axis
 * divides a two-dimensional graph area into stripes (horizontal for a category
 * Y axis) each of which pertains to that category.  Examples include per-CPU
 * or per-thread behavior, individual data series in an oscilloscope timeline,
 * or individual bar charts.  The other axis in this two-dimensional graph is
 * termed the 'value axis'.
 *
 * These settings are generally defined as extents, in units of pixels, along
 * these two axes, so are suffixed 'ValPx' for a pixel extent along the
 * value axis, or 'CatPx' for a pixel extent along the category axis.
 */
export interface TraceAxisRenderSettings {
  // The width of the category header along the category axis.  If x is the
  // value axis, this is the vertical space at the top of a category header
  // where a category label may be shown.
  categoryHeaderCatPx: number;
  // The width, in pixels along the value axis, of a 'handle' rendered at the
  // distal end of a category header; its height is categoryHeaderCatPx.
  categoryHandleValPx: number;
  // The padding between adjacent categories along the category axis.  If x is
  // the value axis, this is the vertical spacing between categories.
  categoryPaddingCatPx: number;
  // The margin between parent and child categories along the value axis.  If x
  // is the value axis, this is the horizontal indent of a child
  // category under its parent.
  categoryMarginValPx: number;
  // The minimum width of a category along the category axis.  If x is the value
  // axis, this is the minimum height of a category header.
  categoryMinWidthCatPx: number;
  // The base width of a category along the value axis, not including margins.
  //  If x is the value axis, this is the minimum horizontal width of any
  // category header (though ancestor categories will have wider headers.)
  categoryBaseWidthValPx: number;
}

export function renderSettingsFromProperties(properties: ValueMap):
    TraceAxisRenderSettings {
  return {
    categoryHeaderCatPx: properties.expectNumber(Key.CATEGORY_HEADER_CAT_PX),
    categoryHandleValPx: properties.expectNumber(Key.CATEGORY_HANDLE_VAL_PX),
    categoryPaddingCatPx: properties.expectNumber(Key.CATEGORY_PADDING_CAT_PX),
    categoryMarginValPx: properties.expectNumber(Key.CATEGORY_MARGIN_VAL_PX),
    categoryMinWidthCatPx:
        properties.expectNumber(Key.CATEGORY_MIN_WIDTH_CAT_PX),
    categoryBaseWidthValPx:
        properties.expectNumber(Key.CATEGORY_BASE_WIDTH_VAL_PX),
  };
}

/**
 * A category prepared for display.  The category owns the rectangle defined by
 * (x0Px, y0Px), (x1Px, y1Px); only its subcategories may overlap that
 * rectangle.  The rendering axis visualization component may draw the span
 * within that rectangle however it wants, possibly informed by the category's
 * properties and the TraceRenderSettings used in rendering.
 */
export class RenderedCategory {
  private readonly childrenInternal: RenderedCategory[] = [];

  constructor(
      readonly category: Category, readonly properties: ValueMap,
      readonly renderSettings: TraceAxisRenderSettings, readonly x0Px: number,
      readonly y0Px: number, readonly x1Px: number, readonly y1Px: number) {}

  get width(): number {
    return this.x1Px - this.x0Px;
  }

  get height(): number {
    return this.y1Px - this.y0Px;
  }

  addChild(child: RenderedCategory) {
    this.childrenInternal.push(child);
  }

  get children(): RenderedCategory[] {
    return this.childrenInternal;
  }

  /** Returns the receiver and its descendants in prefix traversal order. */
  flatten(): RenderedCategory[] {
    const ret: RenderedCategory[] = [];
    ret.push(this);
    for (const child of this.children) {
      ret.push(...child.flatten());
    }
    return ret;
  }
}

/**
 * A rendered category hierarchy.  Its widthPx and heightPx fields specify the
 * dimensions of the bounding box for all contained categories.
 */
export class RenderedCategoryHierarchy {
  /** The width of the full set of rendered categories. */
  readonly widthPx: number = 0;
  /** The height of the full set of rendered categories. */
  readonly heightPx: number = 0;
  constructor(
      readonly properties: ValueMap,
      readonly rootCategories: RenderedCategory[]) {
    // This algorithm assumes a parent RenderedCategory fully encloses all
    // its children.
    if (this.rootCategories.length > 0) {
      const xMin = Math.min(...this.rootCategories.map((cat) => cat.x0Px));
      const xMax = Math.max(...this.rootCategories.map((cat) => cat.x1Px));
      const yMin = Math.min(...this.rootCategories.map((cat) => cat.y0Px));
      const yMax = Math.max(...this.rootCategories.map((cat) => cat.y1Px));
      this.widthPx = xMax - xMin;
      this.heightPx = yMax - yMin;
    }
  }

  get categories(): RenderedCategory[] {
    const ret = new Array<RenderedCategory>();
    for (const rootCategory of this.rootCategories) {
      ret.push(...rootCategory.flatten());
    }
    return ret;
  }
}
