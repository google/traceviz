/**
 * @fileoverview Types and functions for rendering category axes.
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
var Key;
(function (Key) {
    Key["CATEGORY_HEADER_CAT_PX"] = "category_header_cat_px";
    Key["CATEGORY_HANDLE_VAL_PX"] = "category_handle_val_px";
    Key["CATEGORY_PADDING_CAT_PX"] = "category_padding_cat_px";
    Key["CATEGORY_MARGIN_VAL_PX"] = "category_margin_val_px";
    Key["CATEGORY_MIN_WIDTH_CAT_PX"] = "category_min_width_cat_px";
    Key["CATEGORY_BASE_WIDTH_VAL_PX"] = "category_base_width_val_px";
})(Key || (Key = {}));
export function renderSettingsFromProperties(properties) {
    return {
        categoryHeaderCatPx: properties.expectNumber(Key.CATEGORY_HEADER_CAT_PX),
        categoryHandleValPx: properties.expectNumber(Key.CATEGORY_HANDLE_VAL_PX),
        categoryPaddingCatPx: properties.expectNumber(Key.CATEGORY_PADDING_CAT_PX),
        categoryMarginValPx: properties.expectNumber(Key.CATEGORY_MARGIN_VAL_PX),
        categoryMinWidthCatPx: properties.expectNumber(Key.CATEGORY_MIN_WIDTH_CAT_PX),
        categoryBaseWidthValPx: properties.expectNumber(Key.CATEGORY_BASE_WIDTH_VAL_PX),
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
    category;
    properties;
    renderSettings;
    x0Px;
    y0Px;
    x1Px;
    y1Px;
    childrenInternal = [];
    constructor(category, properties, renderSettings, x0Px, y0Px, x1Px, y1Px) {
        this.category = category;
        this.properties = properties;
        this.renderSettings = renderSettings;
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
    addChild(child) {
        this.childrenInternal.push(child);
    }
    get children() {
        return this.childrenInternal;
    }
    /** Returns the receiver and its descendants in prefix traversal order. */
    flatten() {
        const ret = [];
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
    properties;
    rootCategories;
    /** The width of the full set of rendered categories. */
    widthPx = 0;
    /** The height of the full set of rendered categories. */
    heightPx = 0;
    constructor(properties, rootCategories) {
        this.properties = properties;
        this.rootCategories = rootCategories;
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
    get categories() {
        const ret = new Array();
        for (const rootCategory of this.rootCategories) {
            ret.push(...rootCategory.flatten());
        }
        return ret;
    }
}
//# sourceMappingURL=category_axis.js.map