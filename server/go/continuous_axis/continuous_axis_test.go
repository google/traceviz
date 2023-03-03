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

package continuousaxis

import (
	"testing"
	"time"

	"github.com/google/traceviz/server/go/category"
	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

const timeLayout = "Jan 2, 2006 at 3:04pm (MST)"

func TestAxis(t *testing.T) {
	refTime, err := time.Parse(timeLayout, "Jan 1, 2020 at 1:00am (PST)")
	if err != nil {
		t.Fatalf("failed to parse reference time: %s", err)
	}
	ts := func(offset time.Duration) time.Time {
		return refTime.Add(offset)
	}
	cat := category.New("axis", "My axis", "All about my axis")
	for _, test := range []struct {
		description string
		axis        Axis
		wantUpdates []util.PropertyUpdate
		wantValues  map[interface{}]util.PropertyUpdate
	}{{
		description: "timestamp",
		axis:        NewTimestampAxis(cat, ts(0), ts(100)),
		wantUpdates: []util.PropertyUpdate{
			cat.Define(),
			util.StringProperty(axisTypeKey, timestampAxisType),
			util.TimestampProperty(axisMinKey, ts(0)),
			util.TimestampProperty(axisMaxKey, ts(100)),
		},
		wantValues: map[interface{}]util.PropertyUpdate{
			ts(10): util.TimestampProperty("axis", ts(10)),
		},
	}, {
		description: "duration",
		axis:        NewDurationAxis(cat, 100*time.Second),
		wantUpdates: []util.PropertyUpdate{
			cat.Define(),
			util.StringProperty(axisTypeKey, durationAxisType),
			util.DurationProperty(axisMinKey, 0),
			util.DurationProperty(axisMaxKey, 100*time.Second),
		},
		wantValues: map[interface{}]util.PropertyUpdate{
			10 * time.Second: util.DurationProperty("axis", 10*time.Second),
		},
	}, {
		description: "double",
		axis:        NewDoubleAxis(cat, 0, 100),
		wantUpdates: []util.PropertyUpdate{
			cat.Define(),
			util.StringProperty(axisTypeKey, doubleAxisType),
			util.DoubleProperty(axisMinKey, 0),
			util.DoubleProperty(axisMaxKey, 100),
		},
		wantValues: map[interface{}]util.PropertyUpdate{
			5.5: util.DoubleProperty("axis", 5.5),
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			gotUpdates := test.axis.Define()
			if msg, failed := testutil.NewUpdateComparator().
				WithTestUpdates(gotUpdates).
				WithWantUpdates(test.wantUpdates...).
				Compare(t); failed {
				t.Fatal(msg)
			}
			gotValues := map[interface{}]util.PropertyUpdate{}
			for val := range test.wantValues {
				gotValues[val] = test.axis.Value(val)
			}
			for val := range test.wantValues {
				if msg, failed := testutil.NewUpdateComparator().
					WithTestUpdates(test.wantValues[val]).
					WithWantUpdates(gotValues[val]).
					Compare(t); failed {
					t.Fatalf("Unexpected value for '%v': %s", val, msg)
				}
			}
		})
	}
}
