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

// Package barchart defines a bar chart with a discrete category axis and a
// continuous value axis.
//
// BarChart is constructed into a provided DataBuilder db with:
//
//	bc := New(db, valueAxis, renderSettings, properties...)
//
// where valueAxis is a continuousaxis.Axis, renderSettings is a
// RenderSettings.  Chart-level decorations such as color space definitions may
// be applied in the properties, or added later with `bc.With(properties...)`.
// Once constructed,  new categories are added into the chart with:
//
//	bcCat := bc.Category(cat, properties...)
//
// where cat is a category.Category.  Decorators such as coloring may be
// applied in the properties, or added later with `bcCat.With(properties...)`.
// Categories should be displayed in definition order.  Once constructed, a
// bar chart datum can be added with the appropriate method:
//
//	stackedBars := bcCat.StackedBars()
//	bar := bcCat.Bar(lowerExtent, upperExtent)
//	boxPlot := bcCat.BoxPlot(min, q1, q2, q3, max)
//
// adding a stacked bar datum, a single bar datum, or a box plot datum
// respectively.  These data should be displayed in definition order, and
// each should be rendered in its own lane within its parent Category.
// Bar and BoxPlot may be individually styled with, e.g.,
// `bar.With(properties...)`.  StackedBar is not individually styled, but
// instead accepts contained bars:
//
//	childBar := stackedBars.Bar(lowerExtent, upperExtent)
//
// which may then be individually styled with `childBar.With(properties...)`.
// Within a StackedBar, child Bars should be rendered in definition order, and
// may overlap.
package barchart

import (
	"time"

	"github.com/google/traceviz/server/go/category"
	categoryaxis "github.com/google/traceviz/server/go/category_axis"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	"github.com/google/traceviz/server/go/util"
)

const (
	// Data types
	dataTypeKey    = "bar_chart_data_type"
	stackedBarsKey = "bar_chart_stacked_bars"
	barKey         = "bar_chart_bar"
	boxPlotKey     = "bar_chart_box_plot"

	// Bar datum keys
	barLowerExtentKey = "bar_chart_bar_lower_extent"
	barUpperExtentKey = "bar_chart_bar_upper_extent"
	boxPlotMinKey     = "bar_chart_box_plot_min"
	boxPlotQ1Key      = "bar_chart_box_plot_q1"
	boxPlotQ2Key      = "bar_chart_box_plot_q2"
	boxPlotQ3Key      = "bar_chart_box_plot_q3"
	boxPlotMaxKey     = "bar_chart_box_plot_max"

	// Rendering property keys
	barWidthCatPxKey         = "bar_chart_bar_width_cat_px"
	barPaddingCatPxKey       = "bar_chart_bar_padding_cat_px"
	categoryMinWidthCatPxKey = "bar_chart_category_min_width_cat_px"
	categoryPaddingCatPxKey  = "bar_chart_category_padding_cat_px"
	categoryWidthValPxKey    = "bar_chart_category_width_val_px"
)

// RenderSettings is a collection of rendering settings for bar chart.  A bar
// chart is rendered on a two-dimensional plane, with one continuous axis
// showing values ('val') and one discrete axis showing the categories, or
// lanes, into which the bars are rendered.
//
// These settings are generally defined as extents, in units of pixels, along
// these two axes, so are suffixed 'ValPx' for a pixel extent along the
// value axis, or 'CatPx' for a pixel extent along the category axis.
type RenderSettings struct {
	// The width of a bar along the category axis.  if x is the value axis, this
	// is the default height of a bar.
	BarWidthCatPx int64
	// The padding between adjacent bars along the category axis.  If x is the
	// value axis, this is the vertical spacing between bars.
	BarPaddingCatPx            int64
	CategoryAxisRenderSettings *categoryaxis.RenderSettings
	XAxisRenderSettings        *continuousaxis.XAxisRenderSettings
}

// Defines the receiver as a set of property updates.
func (rs *RenderSettings) define() util.PropertyUpdate {
	return util.Chain(
		util.IntegerProperty(barWidthCatPxKey, rs.BarWidthCatPx),
		util.IntegerProperty(barPaddingCatPxKey, rs.BarPaddingCatPx),
		rs.CategoryAxisRenderSettings.Define(),
		rs.XAxisRenderSettings.Apply(),
	)
}

// BarChart represents a bar chart with one continuous value axis and one
// discrete category axis.
type BarChart[T float64 | time.Duration | time.Time] struct {
	db        util.DataBuilder
	valueAxis *continuousaxis.Axis[T]
}

// New returns a new BarChart populating the provided DataBuilder, and using
// the provided value axis and render settings.
func New[T float64 | time.Duration | time.Time](db util.DataBuilder, valueAxis *continuousaxis.Axis[T], renderSettings *RenderSettings, properties ...util.PropertyUpdate) *BarChart[T] {
	return &BarChart[T]{
		db: db.With(
			valueAxis.Define(),
			renderSettings.define(),
		).With(
			properties...,
		),
		valueAxis: valueAxis,
	}
}

// With annotates the receiver with the provided properties.
func (bc *BarChart[T]) With(properties ...util.PropertyUpdate) *BarChart[T] {
	bc.db.With(properties...)
	return bc
}

// Category adds a new category lane, with the provided Category, to the
// receiver.
func (bc *BarChart[T]) Category(category *category.Category, properties ...util.PropertyUpdate) *Category[T] {
	db := bc.db.Child().
		With(category.Define())
	return (&Category[T]{
		db:        db,
		valueAxis: bc.valueAxis,
	}).With(properties...)
}

// Category represents a category lane within a bar chart.
type Category[T float64 | time.Duration | time.Time] struct {
	db        util.DataBuilder
	valueAxis *continuousaxis.Axis[T]
}

// With annotates the receiver with the provided properties.
func (c *Category[T]) With(properties ...util.PropertyUpdate) *Category[T] {
	c.db.With(properties...)
	return c
}

// StackedBars returns a new stacked bar added into the receiving Category.
func (c *Category[T]) StackedBars() *StackedBars[T] {
	db := c.db.Child().With(
		util.StringProperty(dataTypeKey, stackedBarsKey),
	)
	return &StackedBars[T]{
		db:        db,
		valueAxis: c.valueAxis,
	}
}

// Bar returns a new bar added into the receiving Category.  All argument types
// must agree with the BarChart's axis type.
func (c *Category[T]) Bar(lower, upper T) *Bar[T] {
	return newBar[T](c.db, c.valueAxis, lower, upper)
}

// BoxPlot returns a new BoxPlot with the provided quartile rank values.  These
// are, in order, the minimum population value, the first quartile rank value
// (an approximation of the 25th percentile value of the population), the
// population median, the third quartile rank value (the 75th percentile value
// of the population), and the maximum population value.  All argument types
// must agree with the BarChart's axis type.
func (c *Category[T]) BoxPlot(min, q1, q2, q3, max T) *BoxPlot[T] {
	return &BoxPlot[T]{
		db: c.db.Child().With(
			util.StringProperty(dataTypeKey, boxPlotKey),
			c.valueAxis.Value(boxPlotMinKey, min),
			c.valueAxis.Value(boxPlotQ1Key, q1),
			c.valueAxis.Value(boxPlotQ2Key, q2),
			c.valueAxis.Value(boxPlotQ3Key, q3),
			c.valueAxis.Value(boxPlotMaxKey, max),
		),
	}
}

// StackedBars represents a collection of Bars within a Category.
type StackedBars[T float64 | time.Duration | time.Time] struct {
	db        util.DataBuilder
	valueAxis *continuousaxis.Axis[T]
}

// Bar returns a new bar added into the receiving StackedBars.  All argument
// types must agree with the BarChart's axis type.
func (sb *StackedBars[T]) Bar(lower, upper T) *Bar[T] {
	return newBar[T](sb.db, sb.valueAxis, lower, upper)
}

// Bar represents a single bar within a Category or a StackedBars.
type Bar[T float64 | time.Duration | time.Time] struct {
	db util.DataBuilder
	// Add valueAxis if we need value-aligned details within the bar.
}

// With annotates the receiver with the provided properties.
func (b *Bar[T]) With(properties ...util.PropertyUpdate) *Bar[T] {
	b.db.With(properties...)
	return b
}

func newBar[T float64 | time.Duration | time.Time](parentDb util.DataBuilder, valueAxis *continuousaxis.Axis[T], lower, upper T) *Bar[T] {
	return &Bar[T]{
		db: parentDb.Child().With(
			util.StringProperty(dataTypeKey, barKey),
			valueAxis.Value(barLowerExtentKey, lower),
			valueAxis.Value(barUpperExtentKey, upper),
		),
	}
}

// BoxPlot represents a box plot within a Category.
type BoxPlot[T float64 | time.Duration | time.Time] struct {
	db util.DataBuilder
	// Add valueAxis if we need value-aligned details within the bar.
}

// With annotates the receiver with the provided properties.
func (bp *BoxPlot[T]) With(properties ...util.PropertyUpdate) *BoxPlot[T] {
	bp.db.With(properties...)
	return bp
}

// Property keys expected by the bar chart view.
const (
	DetailFormatKey = "detail_format"
	LabelFormatKey  = "label_format"
)
