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

// Package testutil provides types and methods facilitating testing TraceViz
// response construction.
package testutil

import (
	"fmt"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/traceviz/server/go/util"
)

// UpdateComparator facilitates testing of PropertyUpdates, ensuring that a
// 'got' set of PropertyUpdates-under-test yields the same transformation as
// a provided 'want' set of PropertyUpdates.
type UpdateComparator struct {
	got  []util.PropertyUpdate
	want []util.PropertyUpdate
}

// NewUpdateComparator returns a new, empty UpdateComparator.
func NewUpdateComparator() *UpdateComparator {
	return &UpdateComparator{}
}

// WithTestUpdates specifies the receiver's set of PropertyUpdates-under-test.
func (uc *UpdateComparator) WithTestUpdates(got ...util.PropertyUpdate) *UpdateComparator {
	uc.got = got
	return uc
}

// WithWantUpdates specifies a set of PropertyUpdates that should yield the
// same result as the receiver's 'WithTestUpdate'.
func (uc *UpdateComparator) WithWantUpdates(want ...util.PropertyUpdate) *UpdateComparator {
	uc.want = want
	return uc
}

// Compare the receiver's 'got' and 'want' PropertyUpdates, returning a
// difference message (empty if no difference) and a boolean indicating whether
// the two are different (true) or not (false).  Repeated-field ordering must
// be preserved, but string-table ordering need not be preserved.
func (uc *UpdateComparator) Compare(t *testing.T) (string, bool) {
	drb := util.NewDataResponseBuilder()
	resp := drb.DataSeries(&util.DataSeriesRequest{})
	resp.Child().With(uc.got...)  // 'got': provided test updates
	resp.Child().With(uc.want...) // 'want': expected equivalent updates
	data, err := drb.Data()
	if err != nil {
		t.Fatalf(err.Error())
	}
	seriesChildren := data.DataSeries[0].Root.Children
	diff := cmp.Diff(
		seriesChildren[1].PrettyPrint("", data.StringTable),
		seriesChildren[0].PrettyPrint("", data.StringTable))
	if diff != "" {
		return fmt.Sprintf("Got series %s, diff (-want +got):\n%s",
			data.DataSeries[0].PrettyPrint("", data.StringTable), diff), true
	}
	return "", false
}

// TestDataBuilder is implemented by types that can assemble TraceViz responses
// in tests.
type TestDataBuilder interface {
	With(updates ...util.PropertyUpdate) TestDataBuilder
	Child() TestDataBuilder
	AndChild() TestDataBuilder
	Parent() TestDataBuilder
}

// testDataBuilder provides a mechanism for fluently assembling Datum or
// DataSeries protos in test contexts.
type testDataBuilder struct {
	db     util.DataBuilder
	parent *testDataBuilder
}

// With applies the provided PropertyUpdate to the receiver in order.
func (tdb *testDataBuilder) With(updates ...util.PropertyUpdate) TestDataBuilder {
	if tdb != nil {
		tdb.db.With(updates...)
	}
	return tdb
}

// Child adds a child Datum to the receiver, returning a DataBuilder
// for that child.  It supports chaining.
func (tdb *testDataBuilder) Child() TestDataBuilder {
	db := tdb.db.Child()
	return &testDataBuilder{
		db:     db,
		parent: tdb,
	}
}

// AndChild adds a sibling datum, adding a new Datum to the receiver's parent
// and returning a DataBuilder for that new Datum.  If the receiver has no parent,
// adds a child to the receiver.
func (tdb *testDataBuilder) AndChild() TestDataBuilder {
	if tdb == nil {
		return nil
	}
	if tdb.parent == nil {
		return tdb.Child()
	}
	return tdb.Parent().Child()
}

// Parent returns the parent of the receiver, or the receiver itself if it has
// no parent.  It supports chaining.
func (tdb *testDataBuilder) Parent() TestDataBuilder {
	if tdb == nil {
		return nil
	}
	if tdb.parent == nil {
		return tdb
	}
	return tdb.parent
}

// CompareResponses is a test helper for TraceViz data sources and data
// helpers.  It compares test output from the system under test with desired
// output.  Both outputs are produced by callbacks accepting either a
// util.DataBuilder or a TestDataBuilder.
func CompareResponses(t *testing.T, buildGotIf, buildWantIf any) error {
	t.Helper()
	gotDrb := util.NewDataResponseBuilder()
	switch buildGot := buildGotIf.(type) {
	case func(util.DataBuilder):
		buildGot(gotDrb.DataSeries(&util.DataSeriesRequest{}))
	case func(TestDataBuilder):
		buildGot(&testDataBuilder{
			db: gotDrb.DataSeries(&util.DataSeriesRequest{}),
		})
	default:
		t.Fatalf("expected buildGot to be func(util.DataBuilder) or func(testutil.TestDataBuilder)")
	}
	// ToJSON forces gotDrb.D's string table to update.
	gotData, err := gotDrb.Data()
	if err != nil {
		t.Fatalf(err.Error())
	}
	wantDrb := util.NewDataResponseBuilder()
	switch buildWant := buildWantIf.(type) {
	case func(util.DataBuilder):
		buildWant(wantDrb.DataSeries(&util.DataSeriesRequest{}))
	case func(TestDataBuilder):
		buildWant(&testDataBuilder{
			db: wantDrb.DataSeries(&util.DataSeriesRequest{}),
		})
	default:
		t.Fatalf("expected buildWant to be func(util.DataBuilder) or func(testutil.TestDataBuilder)")
	}
	wantData, err := wantDrb.Data()
	if err != nil {
		t.Fatalf(err.Error())
	}
	if diff := cmp.Diff(wantData.PrettyPrint(), gotData.PrettyPrint()); diff != "" {
		t.Errorf("Got data %v, diff (-want, +got) %s", gotData, diff)
	}
	return nil
}
