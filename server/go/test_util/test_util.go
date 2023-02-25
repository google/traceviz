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
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"

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
	drb := util.NewDataResponseBuilder(&util.DataRequest{})
	resp := drb.DataSeries(&util.DataSeriesRequest{})
	resp.Child().With(uc.got...)  // 'got': provided test updates
	resp.Child().With(uc.want...) // 'want': expected equivalent updates
	_, err := drb.ToJSON()
	if err != nil {
		t.Fatalf(err.Error())
	}
	data := drb.D
	seriesChildren := data.DataSeries[0].Root.Children
	diff := cmp.Diff(seriesChildren[1], seriesChildren[0])
	if diff != "" {
		t.Logf("String table:")
		for idx, str := range data.StringTable {
			t.Logf("%3d: %s", idx, str)
		}
		dt := newDataTraversal(data)
		return fmt.Sprintf("Got series %s, diff (-want +got):\n%s", dt.prettyPrintDataSeries(data.DataSeries[0]), diff), true
	}
	return "", false
}

type dataTraversal struct {
	stringTable []string
	depth       int
	indent      string
}

func (dt *dataTraversal) indentation() string {
	ret := ""
	for i := 0; i < dt.depth; i++ {
		ret = ret + dt.indent
	}
	return ret
}

func (dt *dataTraversal) prettyPrintValue(v *util.V) string {
	if v == nil {
		return "<nil>"
	}
	switch v.T {
	case util.StringValueType:
		return fmt.Sprintf("%q", v.V.(string))
	case util.StringIndexValueType:
		return "'" + dt.stringTable[int(v.V.(int64))] + "'"
	case util.StringsValueType:
		strs := v.V.([]string)
		ret := make([]string, len(strs))
		for idx, str := range strs {
			ret[idx] = fmt.Sprintf("%q", str)
		}
		return "[" + strings.Join(ret, ", ") + "]"
	case util.StringIndicesValueType:
		strIdxs := v.V.([]int64)
		ret := make([]string, len(strIdxs))
		for idx, strIdx := range strIdxs {
			ret[idx] = fmt.Sprintf("%q", dt.stringTable[strIdx])
		}
		return "[" + strings.Join(ret, ", ") + "]"
	case util.IntegerValueType:
		return fmt.Sprintf("%d", v.V.(int64))
	case util.IntegersValueType:
		ints := v.V.([]int64)
		ret := make([]string, len(ints))
		for idx, ival := range ints {
			ret[idx] = strconv.Itoa(int(ival))
		}
		return "[" + strings.Join(ret, ", ") + "]"
	case util.DoubleValueType:
		return fmt.Sprintf("%.4f", v.V.(float64))
	case util.DurationValueType:
		return v.V.(time.Duration).String()
	case util.TimestampValueType:
		return v.V.(time.Time).String()
	default:
		return "<<UNKNOWN>>"
	}
}

func (dt *dataTraversal) prettyPrintStringIndexValueMap(vm map[int64]*util.V) []string {
	ret := []string{}
	type keyPair struct {
		name string
		idx  int64
	}
	keys := make([]keyPair, 0, len(vm))
	for keyIdx := range vm {
		keys = append(keys, keyPair{
			name: dt.stringTable[keyIdx],
			idx:  keyIdx,
		})
	}
	sort.Slice(keys, func(a, b int) bool {
		return keys[a].name < keys[b].name
	})
	for _, key := range keys {
		ret = append(ret, fmt.Sprintf("%s%s: %s", dt.indentation(), key.name, dt.prettyPrintValue(vm[key.idx])))
	}
	return ret
}

func (dt *dataTraversal) prettyPrintDatum(datum *util.Datum) []string {
	ret := []string{}
	if len(datum.Properties) > 0 {
		ret = append(ret, dt.indentation()+"Properties:")
		dt.depth++
		ret = append(ret, dt.prettyPrintStringIndexValueMap(datum.Properties)...)
		dt.depth--
	}
	if len(datum.Children) > 0 {
		for _, child := range datum.Children {
			ret = append(ret, dt.indentation()+"Child:")
			dt.depth++
			ret = append(ret, dt.prettyPrintDatum(child)...)
			dt.depth--
		}
	}
	return ret
}

func (dt *dataTraversal) prettyPrintStringValueMap(vm map[string]*util.V) []string {
	ret := []string{}
	keys := make([]string, 0, len(vm))
	for key := range vm {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		ret = append(ret, fmt.Sprintf("%s%s: %s", dt.indentation(), key, dt.prettyPrintValue(vm[key])))
	}
	return ret
}

func (dt *dataTraversal) prettyPrintDataSeriesRequest(req *util.DataSeriesRequest) []string {
	ret := []string{}
	ret = append(ret, dt.indentation()+"Query Name: "+req.QueryName)
	ret = append(ret, dt.indentation()+"Series Name: "+req.SeriesName)
	if len(req.Options) > 0 {
		ret = append(ret, dt.indentation()+"Options: ")
		dt.depth++
		ret = append(ret, dt.prettyPrintStringValueMap(req.Options)...)
		dt.depth--
	}
	return ret
}

func (dt *dataTraversal) prettyPrintDataSeries(series *util.DataSeries) []string {
	ret := []string{}
	ret = append(ret, dt.indentation()+"Request:")
	dt.depth++
	ret = append(ret, dt.prettyPrintDataSeriesRequest(series.Request)...)
	dt.depth--
	if len(series.Root.Properties) > 0 {
		ret = append(ret, dt.indentation()+"Properties: ")
		dt.depth++
		ret = append(ret, dt.prettyPrintStringIndexValueMap(series.Root.Properties)...)
		dt.depth--
	}
	if len(series.Root.Children) > 0 {
		ret = append(ret, dt.indentation()+"Series: ")
		dt.depth++
		for _, datum := range series.Root.Children {
			ret = append(ret, dt.prettyPrintDatum(datum)...)
		}
		dt.depth--
	}
	return ret
}

func newDataTraversal(d *util.Data) *dataTraversal {
	return &dataTraversal{
		stringTable: d.StringTable,
		depth:       0,
		indent:      "  ",
	}
}

// PrettyPrintData returns a well-formatted, deterministic rendering of the
// provided Data proto.  In this rendering,
//   - All repeated fields (Data.DataSeries, DataSeries.Series, Datum.Children,
//     Value.Strs, Value.StrIdxs, Value.Ints) are rendered in declaration order.
//   - All map fields (Data.GlobalFilters, DataSeriesRequest.Options,
//     DataSeries.Properties, Datum.Properties) are rendered in increasing
//     key alphabetic order.
//   - All string-indices (Value.StrIdx, Value.StrIdxs, Datum.Children keys) are
//     dereferenced.
//   - Subordinate fields are indented beneath their parents.
//
// PrettyPrintData output is equal for two Data protos /a/ and /b/ if /a/ and
// /b/ are equivalent.  If /a/ and /b/ yield the same PrettyPrintData output,
// they should be treated identically by all frontend components; conversely,
// if /a/ and /b/ do not yield the same PrettyPrintData, they are categorically
// different.
// In testing, PrettyPrintData output should only be compared against other
// PrettyPrintData output: its specific output formatting is subject to change.
func PrettyPrintData(d *util.Data) []string {
	dt := newDataTraversal(d)
	ret := []string{"Data"}
	dt.depth++
	ret = append(ret, dt.indentation()+"Global filters:")
	dt.depth++
	ret = append(ret, dt.prettyPrintStringValueMap(d.GlobalFilters)...)
	dt.depth--
	if len(d.DataSeries) > 0 {
		ret = append(ret, dt.indentation()+"Series:")
		dt.depth++
		for _, series := range d.DataSeries {
			ret = append(ret, dt.prettyPrintDataSeries(series)...)
		}
		dt.depth--
	}
	return ret
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
	gotDrb := util.NewDataResponseBuilder(&util.DataRequest{})
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
	_, err := gotDrb.ToJSON()
	if err != nil {
		t.Fatalf(err.Error())
	}
	gotData := gotDrb.D
	wantDrb := util.NewDataResponseBuilder(&util.DataRequest{})
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
	_, err = wantDrb.ToJSON()
	if err != nil {
		t.Fatalf(err.Error())
	}
	wantData := wantDrb.D
	got := PrettyPrintData(gotData)
	want := PrettyPrintData(wantData)
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("Got data %s, diff (-want, +got) %s", strings.Join(got, "\n"), diff)
	}
	return nil
}
