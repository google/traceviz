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

// Package categoryaxis provides helpers for defining category axis data.
package categoryaxis

import "github.com/google/traceviz/server/go/util"

const (
	categoryHeaderCatPxKey    = "category_header_cat_px"
	categoryHandleValPxKey    = "category_handle_val_px"
	categoryPaddingCatPxKey   = "category_padding_cat_px"
	categoryMarginValPxKey    = "category_margin_val_px"
	categoryMinWidthCatPxKey  = "category_min_width_cat_px"
	categoryBaseWidthValPxKey = "category_base_width_val_px"
)

// RenderSettings is a collection of rendering settings for category axes.  A
// category axis is a graph axis showing hierarchical 'swim lane' categories
// each of which has a distinct portion of the category ('Cat') axis.  The
// other, non-category, axis is termed the value ('Val') axis.
//
// These settings are generally defined as extents, in units of pixels, along
// these two axes, so are suffixed 'ValPx' for a pixel extent along the
// value axis, or 'CatPx' for a pixel extent along the category axis.
type RenderSettings struct {
	// The width of the category header along the category axis.  If x is the
	// value axis, this is the vertical space at the top of a category header
	// where a category label may be shown.
	CategoryHeaderCatPx int64
	// The width, in pixels along the value axis, of a 'handle' rendered at
	// the distal end of a category header; its height is categoryHeaderCatPxKey.
	CategoryHandleValPx int64
	// The padding between adjacent categories along the category axis.  If x is
	// the value axis, this is the vertical spacing between categories.
	CategoryPaddingCatPx int64
	// The margin between parent and child categories along the value axis.
	// If x is the value axis, this is the horizontal indent of a child
	// category under its parent.
	CategoryMarginValPx int64
	// The minimum width of a category along the category axis.  If x is the
	// value axis, this is the minimum height of a category header.
	CategoryMinWidthCatPx int64
	// The base width of a category along the value axis, not including
	// margins.  If x is the value axis, this is the minimum horizontal width
	// of any category header in the trace (though ancestor categories will have
	// wider headers.)
	CategoryBaseWidthValPx int64
}

// Define applies the receiver as a set of properties.
func (rs *RenderSettings) Define() util.PropertyUpdate {
	return util.Chain(
		util.IntegerProperty(categoryHeaderCatPxKey, rs.CategoryHeaderCatPx),
		util.IntegerProperty(categoryHandleValPxKey, rs.CategoryHandleValPx),
		util.IntegerProperty(categoryPaddingCatPxKey, rs.CategoryPaddingCatPx),
		util.IntegerProperty(categoryMarginValPxKey, rs.CategoryMarginValPx),
		util.IntegerProperty(categoryMinWidthCatPxKey, rs.CategoryMinWidthCatPx),
		util.IntegerProperty(categoryBaseWidthValPxKey, rs.CategoryBaseWidthValPx),
	)
}
