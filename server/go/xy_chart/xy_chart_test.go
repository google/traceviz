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

package xychart

import (
	"testing"
	"time"

	"github.com/google/traceviz/server/go/category"
	"github.com/google/traceviz/server/go/color"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

const timeLayout = "Jan 2, 2006 at 3:04pm (MST)"

func TestXYChart(t *testing.T) {
	refTime, err := time.Parse(timeLayout, "Jan 1, 2020 at 1:00am (PST)")
	if err != nil {
		t.Fatalf("failed to parse reference time: %s", err)
	}
	ts := func(offset time.Duration) time.Time {
		return refTime.Add(offset)
	}
	thingsCat := category.New("things", "Remembered Things", "Things we remembered")
	thingsColor := color.NewSpace("things_color", "blue")
	stuffCat := category.New("stuff", "Forgotten Stuff", "Stuff we forgot")
	stuffColor := color.NewSpace("stuff_color", "red")

	xAxisName := "x_axis"
	yAxisName := "y_axis"

	xAxisCat := category.New(xAxisName, "time from start", "Time from start")
	yAxisCat := category.New(yAxisName, "events per second", "Events per second")

	for _, test := range []struct {
		description   string
		buildChart    func(db util.DataBuilder)
		buildExplicit func(db testutil.TestDataBuilder)
		wantErr       bool
	}{{
		description: "builds group properly",
		buildChart: func(db util.DataBuilder) {
			chart := New(db,
				continuousaxis.NewTimestampAxis(xAxisCat, ts(0), ts(100*time.Second)),
				continuousaxis.NewDoubleAxis(yAxisCat, 1, 3),
				thingsColor.Define(),
				stuffColor.Define(),
			)
			things := chart.AddSeries(
				thingsCat,
				thingsColor.PrimaryColor(1),
			)
			things.WithPoint(
				ts(0*time.Second), 3, util.StringProperty("story", "We started out so well..."),
			).WithPoint(
				ts(20*time.Second), 1, // out-of-order to exercise axis bounds computation.
			).WithPoint(
				ts(10*time.Second), 2.,
			)
			stuff := chart.AddSeries(
				stuffCat,
				stuffColor.PrimaryColor(1),
			)
			stuff.WithPoint(
				ts(80*time.Second), 1,
			).WithPoint(
				ts(90*time.Second), 2,
			).WithPoint(
				ts(100*time.Second), 3, util.StringProperty("story", "But it all ended so badly..."),
			)
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			x := continuousaxis.NewTimestampAxis(xAxisCat, ts(0), ts(100*time.Second))
			y := continuousaxis.NewDoubleAxis(yAxisCat, 1, 3)

			axisGroup := db.With(
				thingsColor.Define(),
				stuffColor.Define(),
			).Child()
			axisGroup.
				Child().With(x.Define()).
				AndChild().With(y.Define())
			db.Child().With(
				thingsCat.Define(),
				thingsColor.PrimaryColor(1.0),
			).Child().With(
				util.TimestampProperty(xAxisName, ts(0)),
				util.DoubleProperty(yAxisName, 3),
				util.StringProperty("story", "We started out so well..."),
			).AndChild().With(
				util.TimestampProperty(xAxisName, ts(20*time.Second)),
				util.DoubleProperty(yAxisName, 1),
			).AndChild().With(
				util.TimestampProperty(xAxisName, ts(10*time.Second)),
				util.DoubleProperty(yAxisName, 2),
			)
			db.Child().With(
				stuffCat.Define(),
				stuffColor.PrimaryColor(1.0),
			).Child().With(
				util.TimestampProperty(xAxisName, ts(80*time.Second)),
				util.DoubleProperty(yAxisName, 1),
			).AndChild().With(
				util.TimestampProperty(xAxisName, ts(90*time.Second)),
				util.DoubleProperty(yAxisName, 2),
			).AndChild().With(
				util.TimestampProperty(xAxisName, ts(100*time.Second)),
				util.DoubleProperty(yAxisName, 3),
				util.StringProperty("story", "But it all ended so badly..."),
			)

		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			err := testutil.CompareResponses(t, test.buildChart, test.buildExplicit)
			if err != nil != test.wantErr {
				t.Fatalf("encountered unexpected error building the chart: %s", err)
			}
		})
	}
}
