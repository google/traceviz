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

// Package xychart facilitates the construction of xy-chart data.
// Given a dedicated chartRoot *util.DataBuilder representing the root node of
// the chart, and which must not be used for any other purpose, a new XYChart
// instance may be created via
//
//	chart := New(chartRoot, xAxis, yAxis, ...properties)
//
// Additional properties may also be added to the chart via
//
//	chart.With(properties...)
//
// Then, a new data series within the chart may be added via
//
//	series := chart.AddSeries(category)
//
// with the provided *category.Category describing the series.  Additional
// properties may also be added to the chart via
//
//	series.With(properties...)
//
// Points may be added to the series via
//
//	series.WithPoint(x, y, properties...)
//
// Note that providing x and y values incompatible with the corresponding axis
// type will yield an error when the response is built.
//
// The structure of an xy chart in a TraceViz response, with each level
// representing a DataSeries or nested Datum is:
//
//	xychart
//	  properties:
//	    * <decorators>
//	  children:
//	    * axes
//	    * repeated series
//
//	axes
//	  children:
//	    * x axis
//	    * y axis
//
//	axis
//	  properties:
//	    * axis definition
//
//	series
//	  properties:
//	    * category definition
//	    * <decorators>
//	  children:
//	    repeated points
//
//	point
//	  properties:
//	    * xAxisName: Value (depending on x-axis type)
//	    * yAxisName: Value (depending on y-axis type)
//	    * <decorators>
package xychart

import (
	"github.com/google/traceviz/server/go/category"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	"github.com/google/traceviz/server/go/util"
)

// XYChart represents an xy-chart embedded in a TraceViz response.
type XYChart struct {
	xAxis, yAxis continuousaxis.Axis
	db           util.DataBuilder
}

// New constructs a new xy chart.  The returned close function should be
// invoked when no more data may be added to the chart.
func New(db util.DataBuilder, xAxis, yAxis continuousaxis.Axis, properties ...util.PropertyUpdate) *XYChart {
	ret := &XYChart{
		xAxis: xAxis,
		yAxis: yAxis,
		db: db.With(
			properties...,
		),
	}
	axes := ret.db.Child() // Axis definitions
	axes.Child().With(xAxis.Define())
	axes.Child().With(yAxis.Define())
	return ret
}

// With annotates the receiving xy-chart with the provided properties.
func (xyc *XYChart) With(properties ...util.PropertyUpdate) *XYChart {
	xyc.db.With(properties...)
	return xyc
}

// AddSeries defines a series within the receiving XYChart, tagged with the
// specified Category.  It returns a Series that can accept points with
// AddPoint.
func (xyc *XYChart) AddSeries(category *category.Category, properties ...util.PropertyUpdate) *Series {
	db := xyc.db.Child().With(category.Define()).With(properties...)
	return &Series{
		xyc: xyc,
		db:  db,
	}
}

// Series helps define a series within a XYChart.
type Series struct {
	xyc *XYChart
	db  util.DataBuilder
}

// With annotates the receiving Series with the provided properties.
func (s *Series) With(properties ...util.PropertyUpdate) *Series {
	s.db.With(properties...)
	return s
}

// WithPoint adds a data point to the receiving Series, with the
// specified x and y values and arbitrary other properties.
func (s *Series) WithPoint(x, y interface{}, properties ...util.PropertyUpdate) *Series {
	s.db.Child().With(
		s.xyc.xAxis.Value(x),
		s.xyc.yAxis.Value(y),
	).With(properties...)
	return s
}
