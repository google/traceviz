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

// Package continuousaxis provides decorator helpers for defining continuous
// axes.  An axis has a name, a label, a type which describes that axis'
// domain, and minimum and maximum points along that domain.
package continuousaxis

import (
	"errors"
	"math"
	"time"

	"github.com/google/traceviz/server/go/category"
	"github.com/google/traceviz/server/go/util"
)

const (
	axisTypeKey = "axis_type"
	axisMinKey  = "axis_min"
	axisMaxKey  = "axis_max"

	timestampAxisType = "timestamp"
	durationAxisType  = "duration"
	doubleAxisType    = "double"

	xAxisRenderLabelHeightPxKey   = "x_axis_render_label_height_px"
	xAxisRenderMarkersHeightPxKey = "x_axis_render_markers_height_px"
	yAxisRenderLabelHeightPxKey   = "y_axis_render_label_width_px"
	yAxisRenderMarkersHeightPxKey = "y_axis_render_markers_width_px"
)

// XAxisRenderSettings contains configuring an X axis.
type XAxisRenderSettings struct {
	LabelHeightPx   int64
	MarkersHeightPx int64
}

// Apply annotates with the receiving XAxisRenderSettings.
func (x XAxisRenderSettings) Apply() util.PropertyUpdate {
	return util.Chain(
		util.IntegerProperty(xAxisRenderLabelHeightPxKey, x.LabelHeightPx),
		util.IntegerProperty(xAxisRenderMarkersHeightPxKey, x.MarkersHeightPx),
	)
}

// YAxisRenderSettings contains configuring a Y axis.
type YAxisRenderSettings struct {
	LabelWidthPx   int64
	MarkersWidthPx int64
}

// Apply annotates with the receiving YAxisRenderSettings.
func (y YAxisRenderSettings) Apply() util.PropertyUpdate {
	return util.Chain(
		util.IntegerProperty(yAxisRenderLabelHeightPxKey, y.LabelWidthPx),
		util.IntegerProperty(yAxisRenderMarkersHeightPxKey, y.MarkersWidthPx),
	)
}

// Axis is implemented by types that can act as axes.
type Axis interface {
	Define() util.PropertyUpdate
	Value(v any) util.PropertyUpdate
}

// TimestampAxis describes a temporal domain with a known starting point.
type TimestampAxis struct {
	cat      *category.Category
	min, max time.Time
}

// NewTimestampAxis returns a new TimestampAxis with the specified category.
// If the optional extents are provided, the axis' minimum and maximum extents
// will be initialized to the lowest and highest of those extents.
func NewTimestampAxis(cat *category.Category, extents ...time.Time) *TimestampAxis {
	ret := &TimestampAxis{
		cat: cat,
	}
	for _, extent := range extents {
		if ret.min.IsZero() || ret.min.After(extent) {
			ret.min = extent
		}
		if ret.max.IsZero() || ret.max.Before(extent) {
			ret.max = extent
		}
	}
	return ret
}

// Define annotates with a definition of the receiver.
func (ta *TimestampAxis) Define() util.PropertyUpdate {
	return util.Chain(
		ta.cat.Define(),
		util.StringProperty(axisTypeKey, timestampAxisType),
		util.TimestampProperty(axisMinKey, ta.min),
		util.TimestampProperty(axisMaxKey, ta.max),
	)
}

// Value returns a TraceViz Value for the provided value along the axis.
// The provided value must be a time.Time.
func (ta *TimestampAxis) Value(v any) util.PropertyUpdate {
	switch val := v.(type) {
	case time.Time:
		return util.TimestampProperty(ta.cat.ID(), val)
	default:
		return util.ErrorProperty(errors.New("axis expected Timestamp value"))
	}
}

// Offset returns the specified time's offset from the axis minimum.
func (ta *TimestampAxis) Offset(t time.Time) time.Duration {
	return t.Sub(ta.min)
}

// DurationAxis describes a temporal domain with an unknown starting point.
type DurationAxis struct {
	cat      *category.Category
	duration time.Duration
}

// NewDurationAxis returns a new DurationAxis with the specified category.
// If the optional extents are provided, the axis' minimum and maximum extents
// will be initialized to the lowest and highest of those extents.
func NewDurationAxis(cat *category.Category, extents ...time.Duration) *DurationAxis {
	ret := &DurationAxis{
		cat: cat,
	}
	for _, extent := range extents {
		if extent > ret.duration {
			ret.duration = extent
		}
	}
	return ret
}

// Define annotates with a definition of the receiver.
func (da *DurationAxis) Define() util.PropertyUpdate {
	return util.Chain(
		da.cat.Define(),
		util.StringProperty(axisTypeKey, durationAxisType),
		util.DurationProperty(axisMinKey, 0),
		util.DurationProperty(axisMaxKey, da.duration),
	)
}

// Value returns a TraceViz Value for the provided value along the axis.
// The provided value must be a time.Time.
func (da *DurationAxis) Value(v any) util.PropertyUpdate {
	switch val := v.(type) {
	case time.Duration:
		return util.DurationProperty(da.cat.ID(), val)
	default:
		return util.ErrorProperty(errors.New("axis expected Duration value"))
	}
}

// DoubleAxis describes a numeric domain.
type DoubleAxis struct {
	cat      *category.Category
	min, max float64
}

// NewDoubleAxis returns a new DoubleAxis with the specified category.
// If the optional extents are provided, the axis' minimum and maximum extents
// will be initialized to the lowest and highest of those extents.
func NewDoubleAxis(cat *category.Category, extents ...float64) *DoubleAxis {
	ret := &DoubleAxis{
		cat: cat,
		min: math.MaxFloat64,
		max: -math.MaxFloat64,
	}
	for _, extent := range extents {
		if ret.min > extent {
			ret.min = extent
		}
		if ret.max < extent {
			ret.max = extent
		}
	}
	return ret
}

// Define annotates with a definition of the receiver.
func (da *DoubleAxis) Define() util.PropertyUpdate {
	return util.Chain(
		da.cat.Define(),
		util.StringProperty(axisTypeKey, doubleAxisType),
		util.DoubleProperty(axisMinKey, da.min),
		util.DoubleProperty(axisMaxKey, da.max),
	)
}

// Value returns a TraceViz Value for the provided value along the axis.
// The provided value must be a float64 or an int.
func (da *DoubleAxis) Value(v any) util.PropertyUpdate {
	switch val := v.(type) {
	case float64:
		return util.DoubleProperty(da.cat.ID(), val)
	case int:
		return util.DoubleProperty(da.cat.ID(), float64(val))
	default:
		return util.ErrorProperty(errors.New("axis expected float64 value"))
	}
}
