/*
	Copyright 2025 Google Inc.
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

package barchart

import (
	"testing"

	"github.com/google/traceviz/server/go/category"
	categoryaxis "github.com/google/traceviz/server/go/category_axis"
	"github.com/google/traceviz/server/go/color"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	"github.com/google/traceviz/server/go/label"
	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

var (
	dblAxis        = continuousaxis.NewDoubleAxis(category.New("axis", "axis", "axis"), 0, 100)
	renderSettings = &RenderSettings{
		BarWidthCatPx:   20,
		BarPaddingCatPx: 1,
		CategoryAxisRenderSettings: &categoryaxis.RenderSettings{
			CategoryMinWidthCatPx:  20,
			CategoryPaddingCatPx:   2,
			CategoryBaseWidthValPx: 100,
		},
		XAxisRenderSettings: &continuousaxis.XAxisRenderSettings{
			LabelHeightPx:   20,
			MarkersHeightPx: 10,
		},
	}
)

func TestBarChart(t *testing.T) {
	for _, test := range []struct {
		description   string
		buildBarChart func(db util.DataBuilder)
		buildExplicit func(db testutil.TestDataBuilder)
		wantErr       bool
	}{{
		description: "bar chart with single series of single bars",
		buildBarChart: func(db util.DataBuilder) {
			bc := New(db, dblAxis, renderSettings)
			bc.Category(category.New("apples", "apples", "apples")).Bar(0, 10)
			bc.Category(category.New("oranges", "oranges", "oranges")).Bar(0, 8)
			bc.Category(category.New("pears", "pears", "pears")).Bar(0, 15)
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			bc := db.With(
				dblAxis.Define(),
				util.IntegerProperty(barWidthCatPxKey, 20),
				util.IntegerProperty(barPaddingCatPxKey, 1),
				renderSettings.CategoryAxisRenderSettings.Define(),
				renderSettings.XAxisRenderSettings.Apply(),
			)
			bc.Child().With(
				category.New("apples", "apples", "apples").Define(),
			).Child().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 10),
			)
			bc.Child().With(
				category.New("oranges", "oranges", "oranges").Define(),
			).Child().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 8),
			)
			bc.Child().With(
				category.New("pears", "pears", "pears").Define(),
			).Child().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 15),
			)
		},
	}, {
		description: "bar chart with multiple series of single bars",
		buildBarChart: func(db util.DataBuilder) {
			bc := New(db, dblAxis, renderSettings)
			europe := bc.Category(category.New("europe", "europe", "europe"))
			europe.Bar(0, 12).With(color.Primary("red"), label.Format("apples"))
			europe.Bar(0, 6).With(color.Primary("orange"), label.Format("oranges"))
			asia := bc.Category(category.New("asia", "asia", "asia"))
			asia.Bar(0, 8).With(color.Primary("red"), label.Format("apples"))
			asia.Bar(0, 14).With(color.Primary("orange"), label.Format("oranges"))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			bc := db.With(
				dblAxis.Define(),
				renderSettings.define(),
			)
			bc.Child().With(
				category.New("europe", "europe", "europe").Define(),
			).Child().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 12),
				color.Primary("red"),
				label.Format("apples"),
			).AndChild().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 6),
				color.Primary("orange"),
				label.Format("oranges"),
			)
			bc.Child().With(
				category.New("asia", "asia", "asia").Define(),
			).Child().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 8),
				color.Primary("red"),
				label.Format("apples"),
			).AndChild().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 14),
				color.Primary("orange"),
				label.Format("oranges"),
			)
		},
	}, {
		description: "bar chart with multiple series of single bars",
		buildBarChart: func(db util.DataBuilder) {
			bc := New(db, dblAxis, renderSettings)
			europe := bc.Category(category.New("europe", "europe", "europe"))
			europe.Bar(0, 12).With(color.Primary("red"), label.Format("apples"))
			europe.Bar(0, 6).With(color.Primary("orange"), label.Format("oranges"))
			asia := bc.Category(category.New("asia", "asia", "asia"))
			asia.Bar(0, 8).With(color.Primary("red"), label.Format("apples"))
			asia.Bar(0, 14).With(color.Primary("orange"), label.Format("oranges"))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			bc := db.With(
				dblAxis.Define(),
				renderSettings.define(),
			)
			bc.Child().With(
				category.New("europe", "europe", "europe").Define(),
			).Child().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 12),
				color.Primary("red"),
				label.Format("apples"),
			).AndChild().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 6),
				color.Primary("orange"),
				label.Format("oranges"),
			)
			bc.Child().With(
				category.New("asia", "asia", "asia").Define(),
			).Child().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 8),
				color.Primary("red"),
				label.Format("apples"),
			).AndChild().With(
				util.StringProperty(dataTypeKey, barKey),
				util.DoubleProperty(barLowerExtentKey, 0),
				util.DoubleProperty(barUpperExtentKey, 14),
				color.Primary("orange"),
				label.Format("oranges"),
			)
		},
	}, {
		description: "bar chart with two series of box plots",
		buildBarChart: func(db util.DataBuilder) {
			bc := New(db, dblAxis, renderSettings)
			europe := bc.Category(category.New("europe", "europe", "europe"))
			europe.BoxPlot(3, 4, 5, 7, 12).With(color.Primary("red"), label.Format("apples"))
			europe.BoxPlot(0, 1, 3, 4, 7).With(color.Primary("orange"), label.Format("oranges"))
			asia := bc.Category(category.New("asia", "asia", "asia"))
			asia.BoxPlot(2, 4, 5, 6, 9).With(color.Primary("red"), label.Format("apples"))
			asia.BoxPlot(1, 3, 6, 10, 14).With(color.Primary("orange"), label.Format("oranges"))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			bc := db.With(
				dblAxis.Define(),
				renderSettings.define(),
			)
			europe := bc.Child().With(
				category.New("europe", "europe", "europe").Define(),
			)
			europe.Child().With(
				util.StringProperty(dataTypeKey, boxPlotKey),
				util.DoubleProperty(boxPlotMinKey, 3),
				util.DoubleProperty(boxPlotQ1Key, 4),
				util.DoubleProperty(boxPlotQ2Key, 5),
				util.DoubleProperty(boxPlotQ3Key, 7),
				util.DoubleProperty(boxPlotMaxKey, 12),
				color.Primary("red"),
				label.Format("apples"),
			)
			europe.Child().With(
				util.StringProperty(dataTypeKey, boxPlotKey),
				util.DoubleProperty(boxPlotMinKey, 0),
				util.DoubleProperty(boxPlotQ1Key, 1),
				util.DoubleProperty(boxPlotQ2Key, 3),
				util.DoubleProperty(boxPlotQ3Key, 4),
				util.DoubleProperty(boxPlotMaxKey, 7),
				color.Primary("orange"),
				label.Format("oranges"),
			)
			asia := bc.Child().With(
				category.New("asia", "asia", "asia").Define(),
			)
			asia.Child().With(
				util.StringProperty(dataTypeKey, boxPlotKey),
				util.DoubleProperty(boxPlotMinKey, 2),
				util.DoubleProperty(boxPlotQ1Key, 4),
				util.DoubleProperty(boxPlotQ2Key, 5),
				util.DoubleProperty(boxPlotQ3Key, 6),
				util.DoubleProperty(boxPlotMaxKey, 9),
				color.Primary("red"),
				label.Format("apples"),
			)
			asia.Child().With(
				util.StringProperty(dataTypeKey, boxPlotKey),
				util.DoubleProperty(boxPlotMinKey, 1),
				util.DoubleProperty(boxPlotQ1Key, 3),
				util.DoubleProperty(boxPlotQ2Key, 6),
				util.DoubleProperty(boxPlotQ3Key, 10),
				util.DoubleProperty(boxPlotMaxKey, 14),
				color.Primary("orange"),
				label.Format("oranges"),
			)
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			err := testutil.CompareResponses(t, test.buildBarChart, test.buildExplicit)
			if (err != nil) != test.wantErr {
				t.Fatalf("encountered unexpected error building trace edge: %s", err)
			}
		})
	}
}
