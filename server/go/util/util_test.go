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

package util

import (
	"bytes"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
)

func TestStringTable(t *testing.T) {
	for _, test := range []struct {
		description string
		additions   []string
		wantTable   []string
	}{{
		description: "unique additions",
		additions:   []string{"ant", "bee", "caterpillar", "doodlebug", "earwig", "flea", "gnat"},
		wantTable:   []string{"ant", "bee", "caterpillar", "doodlebug", "earwig", "flea", "gnat"},
	}, {
		description: "duplicate additions",
		additions:   []string{"ant", "bee", "ant", "ant", "bee"},
		wantTable:   []string{"ant", "bee"},
	}} {
		t.Run(test.description, func(t *testing.T) {
			st := newStringTable()
			for _, str := range test.additions {
				st.stringIndex(str)
			}
			gotTable := st.stringsByIndex
			if diff := cmp.Diff(gotTable, test.wantTable); diff != "" {
				t.Errorf("Got string table %v, diff (-want +got):\n%s", gotTable, diff)
			}
		})
	}
}

func ns(dur int) time.Duration {
	return time.Nanosecond * time.Duration(dur)
}

func epochNs(dur int64) time.Time {
	return time.Unix(0, dur)
}

func TestDatumBuilder(t *testing.T) {
	for _, test := range []struct {
		description string
		dbFn        func(*datumBuilder) error
		wantMap     map[int64]*V
	}{{
		description: "override scalars, append to strings",
		dbFn: func(db *datumBuilder) error {
			db.
				withStr("string", "hello").
				withDbl("double", 1.1).
				appendStrs("strings", "a", "b", "c").
				withStr("string", "goodbye").
				withDbl("double", 2.2).
				appendStrs("strings", "d", "e", "f")
			return nil
		},
		wantMap: map[int64]*V{
			0: StringIndexValue(7),
			2: DoubleValue(2.2),
			3: StringIndicesValue(4, 5, 6, 8, 9, 10),
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			db := newDatumBuilder(&errors{}, newStringTable())
			if err := test.dbFn(db); err != nil {
				t.Fatalf("error in dbFn: %s", err)
			}
			gotMap := db.valsByKey
			if diff := cmp.Diff(test.wantMap, gotMap); diff != "" {
				t.Errorf("Got map %v, diff (-want +got) %s", gotMap, diff)
			}
		})
	}
}

func TestParseDataRequest(t *testing.T) {
	for _, test := range []struct {
		description string
		reqJSON     string
		wantReq     *DataRequest
	}{{
		description: "simple requests",
		reqJSON: `{
			  "SeriesRequests": [
			    {
			      "QueryName": "q1",
						"SeriesName": "1"
			    }, {
			      "QueryName": "q2",
						"SeriesName": "2"
			    }
			  ]
			}`,
		wantReq: &DataRequest{
			SeriesRequests: []*DataSeriesRequest{
				&DataSeriesRequest{
					QueryName:  "q1",
					SeriesName: "1",
				},
				&DataSeriesRequest{
					QueryName:  "q2",
					SeriesName: "2",
				},
			},
		},
	}, {
		description: "with global filters",
		reqJSON: `{
			  "GlobalFilters": {
					"str": [ 1, "hello" ],
					"strs": [ 3, [ "hello", "goodbye" ] ],
					"int": [ 5, 100 ],
					"ints": [ 6, [ 50, 150, 250 ] ],
					"dbl": [ 7, 3.14159 ],
					"dur": [ 8, 150000000 ],
					"ts": [ 9, [ 500, 100 ] ]
				},
			  "SeriesRequests": [
			    {
			      "QueryName": "q1",
						"SeriesName": "1",
						"Options": {
							"str": [ 1, "hello" ],
							"strs": [ 3, [ "hello", "goodbye" ] ],
							"int": [ 5, 100 ],
							"ints": [ 6, [ 50, 150, 250 ] ],
							"dbl": [ 7, 3.14159 ],
							"dur": [ 8, 150000000 ],
							"ts": [ 9, [ 500, 100 ] ]
						}
			    }
			  ]
			}`,
		wantReq: &DataRequest{
			GlobalFilters: map[string]*V{
				"str":  StringValue("hello"),
				"strs": StringsValue("hello", "goodbye"),
				"int":  IntValue(100),
				"ints": IntsValue(50, 150, 250),
				"dbl":  DoubleValue(3.14159),
				"dur":  DurationValue(time.Millisecond * 150),
				"ts":   TimestampValue(time.Unix(500, 100)),
			},
			SeriesRequests: []*DataSeriesRequest{
				&DataSeriesRequest{
					QueryName:  "q1",
					SeriesName: "1",
					Options: map[string]*V{
						"str":  StringValue("hello"),
						"strs": StringsValue("hello", "goodbye"),
						"int":  IntValue(100),
						"ints": IntsValue(50, 150, 250),
						"dbl":  DoubleValue(3.14159),
						"dur":  DurationValue(time.Millisecond * 150),
						"ts":   TimestampValue(time.Unix(500, 100)),
					},
				},
			},
		},
	}, {
		description: "with options",
		reqJSON: `{
			  "SeriesRequests": [
			    {
			      "QueryName": "q1",
						"SeriesName": "1",
						"Options": {
							"max_elements": [5, 10]
						}
			    }
			  ]
			}`,
		wantReq: &DataRequest{
			SeriesRequests: []*DataSeriesRequest{
				&DataSeriesRequest{
					QueryName:  "q1",
					SeriesName: "1",
					Options: map[string]*V{
						"max_elements": IntValue(10),
					},
				},
			},
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			gotReq, err := DataRequestFromJSON([]byte(test.reqJSON))
			if err != nil {
				t.Fatalf("failed to parse data request: %s", err)
			}
			if diff := cmp.Diff(test.wantReq, gotReq); diff != "" {
				t.Errorf("DataRequestFromJSON() = %v, diff (-want +got) %s", gotReq, diff)
			}
		})
	}
}

func TestResponseEncoding(t *testing.T) {
	// Compare encoded Data response with expected JSON.  This also serves as
	// a reference for the generated JSON.
	d := &Data{
		StringTable: []string{
			"stridx", "stridxs", "int", "ints", "dbl", "dur", "ts",
			"hello", "goodbye",
		},
		DataSeries: []*DataSeries{
			&DataSeries{
				SeriesName: "0",
				Root: &Datum{
					Properties: map[int64]*V{},
					Children: []*Datum{
						&Datum{
							Properties: map[int64]*V{
								0: StringIndexValue(7),
								1: StringIndicesValue(7, 8),
								2: IntValue(100),
								3: IntsValue(50, 150, 250),
								4: DoubleValue(3.14159),
								5: DurationValue(time.Millisecond * 150),
								6: TimestampValue(time.Unix(500, 100)),
							},
						},
					},
				},
			},
		},
	}
	want := `{
		"StringTable": [
			"stridx", "stridxs", "int", "ints", "dbl", "dur", "ts",
			"hello", "goodbye"
		],
		"DataSeries": [
			{
				"SeriesName": "0",
				"Root": [ [],
					[
						[
							[
								[ 0, [ 2, 7 ] ],
								[ 1, [ 4, [ 7, 8 ] ] ],
								[ 2, [ 5, 100 ] ],
								[ 3, [ 6, [ 50, 150, 250 ] ] ],
								[ 4, [ 7, 3.14159 ] ],
								[ 5, [ 8, 150000000 ] ],
								[ 6, [ 9, [ 500, 100 ] ] ]
							],
							[]
						]
					]
				]
			}
		]
	}`
	dj, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("failed to marshal Data: %s", err)
	}
	var gotBuf bytes.Buffer
	if err := json.Indent(&gotBuf, dj, "", "  "); err != nil {
		t.Fatalf("failed to format Data: %s", err)
	}
	var wantBuf bytes.Buffer
	if err := json.Indent(&wantBuf, []byte(want), "", "  "); err != nil {
		t.Fatalf("failed to format Want: %s", err)
	}
	if diff := cmp.Diff(wantBuf.String(), gotBuf.String()); diff != "" {
		t.Errorf("Got Data:\n%s\n, diff (-want +got) %s", gotBuf.String(), diff)
	}
}

func TestValueEncodingAndDecoding(t *testing.T) {
	// Test that a round-trip to and from JSON yields the same Value as before.
	for _, test := range []struct {
		description string
		value       *V
	}{{
		description: "str",
		value:       StringValue("hello"),
	}, {
		description: "stridx",
		value:       StringIndexValue(3),
	}, {
		description: "strs",
		value:       StringsValue("hello", "goodbye"),
	}, {
		description: "stridxs",
		value:       StringIndicesValue(1, 3, 5),
	}, {
		description: "int",
		value:       IntValue(100),
	}, {
		description: "ints",
		value:       IntsValue(50, 150, 250),
	}, {
		description: "dbl",
		value:       DoubleValue(3.14159),
	}, {
		description: "dur",
		value:       DurationValue(time.Millisecond * 150),
	}, {
		description: "ts",
		value:       TimestampValue(time.Unix(500, 1000)),
	}} {
		t.Run(test.description, func(t *testing.T) {
			vj, err := json.Marshal(test.value)
			if err != nil {
				t.Fatalf("failed to marshal value %v: %s", test.value, err)
			}
			t.Logf("%s: '%s'", test.description, vj)
			decodedValue := &V{}
			if err := json.Unmarshal(vj, decodedValue); err != nil {
				t.Fatalf("failed to unmarshal JSON value '%s': %s", vj, err)
			}
			if diff := cmp.Diff(test.value, decodedValue); diff != "" {
				t.Errorf("Decoded value was %v, diff (-orig +decoded) %s", decodedValue, diff)
			}
		})
	}
}

func TestDataResponseBuilding(t *testing.T) {
	// Ensure that the response we built is the one we mean to build.
	seriesReq := &DataSeriesRequest{
		QueryName:  "series",
		SeriesName: "1",
	}
	req := &DataRequest{
		SeriesRequests: []*DataSeriesRequest{
			seriesReq,
		},
	}
	for _, test := range []struct {
		description   string
		buildResponse func(db DataBuilder)
		wantData      *Data
	}{{
		description:   "empty",
		buildResponse: func(db DataBuilder) {},
		wantData: &Data{
			DataSeries: []*DataSeries{
				&DataSeries{
					SeriesName: "1",
					Root: &Datum{
						Properties: map[int64]*V{},
						Children:   []*Datum{},
					},
				},
			},
		},
	}, {
		description: "some data",
		buildResponse: func(db DataBuilder) {
			db.Child().With(
				StringsProperty("choices", "a"),
				StringsPropertyExtended("choices", "b", "c"),
				DoubleProperty("pi", 3.14159),
			).Child().With(
				StringProperty("name", "baby"),
				DurationProperty("age", 36*time.Hour),
			)
			db.Child().With(
				StringProperty("name", "another toplevel child"),
				IntegerProperty("weight", 6),
				IntegersProperty("dimensions", 7, 8, 9),
				TimestampProperty("birthday", time.Unix(100, 1000)),
			)
		},
		wantData: &Data{
			DataSeries: []*DataSeries{
				&DataSeries{
					SeriesName: seriesReq.SeriesName,
					Root: &Datum{
						Properties: map[int64]*V{},
						Children: []*Datum{
							&Datum{
								Properties: map[int64]*V{
									1: StringIndicesValue(0, 2, 3),
									4: DoubleValue(3.14159),
								},
								Children: []*Datum{
									&Datum{
										Properties: map[int64]*V{
											5: StringIndexValue(6),
											7: DurationValue(36 * time.Hour),
										},
										Children: []*Datum{},
									},
								},
							},
							&Datum{
								Properties: map[int64]*V{
									5:  StringIndexValue(8),
									9:  IntValue(6),
									10: IntsValue(7, 8, 9),
									11: TimestampValue(time.Unix(100, 1000)),
								},
								Children: []*Datum{},
							},
						},
					},
				},
			},
			StringTable: []string{"a", "choices", "b", "c", "pi", "name", "baby", "age", "another toplevel child", "weight", "dimensions", "birthday"},
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			drb := NewDataResponseBuilder()
			ds := drb.DataSeries(req.SeriesRequests[0])
			test.buildResponse(ds)
			gotData, err := drb.Data()
			if err != nil {
				t.Fatalf("Data yielded unexpected error %s", err)
			}
			if diff := cmp.Diff(
				test.wantData,
				gotData,
			); diff != "" {
				t.Errorf("Got Data %v, diff (-want +got):\n%s", gotData, diff)
			}
		})
	}
}

func dataReqJSON(t *testing.T, req *DataRequest) []byte {
	t.Helper()
	ret, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal DataRequest: %s", err)
	}
	return ret
}

func TestExpectValues(t *testing.T) {
	// Tests that Expect{type}Value functions work on global filters and
	// Options.  Converts the request to and from JSON.
	for _, test := range []struct {
		description string
		req         *DataRequest
		expect      func(req *DataRequest) error
	}{{
		description: "expect successful global filters",
		req: &DataRequest{
			GlobalFilters: map[string]*V{
				"str":  StringValue("global_filter"),
				"strs": StringsValue("a", "b"),
				"int":  IntValue(1),
				"ints": IntsValue(10, 20, 30),
				"dbl":  DoubleValue(3.14159),
				"dur":  DurationValue(100 * time.Millisecond),
				"ts":   TimestampValue(time.Unix(100, 1000)),
			},
		},
		expect: func(req *DataRequest) error {
			if got, err := ExpectStringValue(req.GlobalFilters["str"]); err != nil {
				return err
			} else if got != "global_filter" {
				return fmt.Errorf("got wrong value '%v' for 'str'", got)
			}
			if got, err := ExpectStringsValue(req.GlobalFilters["strs"]); err != nil {
				return err
			} else if diff := cmp.Diff([]string{"a", "b"}, got); diff != "" {
				return fmt.Errorf("got wrong value '%v' for 'strs'", got)
			}
			if got, err := ExpectIntegerValue(req.GlobalFilters["int"]); err != nil {
				return err
			} else if got != int64(1) {
				return fmt.Errorf("got wrong value '%v' for 'int'", got)
			}
			if got, err := ExpectIntegersValue(req.GlobalFilters["ints"]); err != nil {
				return err
			} else if diff := cmp.Diff([]int64{10, 20, 30}, got); diff != "" {
				return fmt.Errorf("got wrong value '%v' for 'ints'", got)
			}
			if got, err := ExpectDoubleValue(req.GlobalFilters["dbl"]); err != nil {
				return err
			} else if got != float64(3.14159) {
				return fmt.Errorf("got wrong value '%v' for 'dbl'", got)
			}
			if got, err := ExpectDurationValue(req.GlobalFilters["dur"]); err != nil {
				return err
			} else if got != time.Duration(100)*time.Millisecond {
				return fmt.Errorf("got wrong value '%v' for 'dur'", got)
			}
			if got, err := ExpectTimestampValue(req.GlobalFilters["ts"]); err != nil {
				return err
			} else if diff := cmp.Diff(time.Unix(100, 1000), got); diff != "" {
				return fmt.Errorf("got wrong value '%v' for 'ts'", got)
			}
			return nil
		},
	}, {
		description: "expect successful options",
		req: &DataRequest{
			SeriesRequests: []*DataSeriesRequest{
				&DataSeriesRequest{
					Options: map[string]*V{
						"str":  StringValue("option"),
						"strs": StringsValue("a", "b"),
						"int":  IntValue(1),
						"ints": IntsValue(10, 20, 30),
						"dbl":  DoubleValue(3.14159),
						"dur":  DurationValue(100 * time.Millisecond),
						"ts":   TimestampValue(time.Unix(100, 1000)),
					},
				},
			},
		},
		expect: func(req *DataRequest) error {
			seriesReqOpts := req.SeriesRequests[0].Options
			if got, err := ExpectStringValue(seriesReqOpts["str"]); err != nil {
				return err
			} else if got != "option" {
				return fmt.Errorf("got wrong value '%v' for 'str'", got)
			}
			if got, err := ExpectStringsValue(seriesReqOpts["strs"]); err != nil {
				return err
			} else if diff := cmp.Diff([]string{"a", "b"}, got); diff != "" {
				return fmt.Errorf("got wrong value '%v' for 'strs'", got)
			}
			if got, err := ExpectIntegerValue(seriesReqOpts["int"]); err != nil {
				return err
			} else if got != int64(1) {
				return fmt.Errorf("got wrong value '%v' for 'int'", got)
			}
			if got, err := ExpectIntegersValue(seriesReqOpts["ints"]); err != nil {
				return err
			} else if diff := cmp.Diff([]int64{10, 20, 30}, got); diff != "" {
				return fmt.Errorf("got wrong value '%v' for 'ints'", got)
			}
			if got, err := ExpectDoubleValue(seriesReqOpts["dbl"]); err != nil {
				return err
			} else if got != float64(3.14159) {
				return fmt.Errorf("got wrong value '%v' for 'dbl'", got)
			}
			if got, err := ExpectDurationValue(seriesReqOpts["dur"]); err != nil {
				return err
			} else if got != time.Duration(100)*time.Millisecond {
				return fmt.Errorf("got wrong value '%v' for 'dur'", got)
			}
			if got, err := ExpectTimestampValue(seriesReqOpts["ts"]); err != nil {
				return err
			} else if diff := cmp.Diff(time.Unix(100, 1000), got); diff != "" {
				return fmt.Errorf("got wrong value '%v' for 'ts'", got)
			}
			return nil
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			rj := dataReqJSON(t, test.req)
			decodedReq := &DataRequest{}
			if err := json.Unmarshal(rj, decodedReq); err != nil {
				t.Fatalf("failed to unmarshal DataRequest JSON: %s", err)
			}
			if err := test.expect(decodedReq); err != nil {
				t.Errorf("expect() failed: %s", err)
			}
		})
	}
}

func TestPropertyUpdates(t *testing.T) {
	for _, test := range []struct {
		description  string
		applyUpdates func(db DataBuilder)
		wantErr      bool
		wantDatum    *Datum
	}{{
		description: "If, IfElse, Chain",
		applyUpdates: func(db DataBuilder) {
			db.With(
				Chain(
					If(10 < 5, Integer(0)("possibility")),
					If(10 > 5, Integer(1)("possibility")),
					IfElse(1 == 2,
						Integer(1)("paradox"),
						Integer(0)("paradox"),
					),
				),
			)
		},
		wantDatum: &Datum{
			Properties: map[int64]*V{
				0: IntValue(1),
				1: IntValue(0),
			},
			Children: []*Datum{},
		},
	}, {
		description: "Nothing",
		applyUpdates: func(db DataBuilder) {
			db.With(
				Nothing("helo"),
			)
		},
		wantDatum: &Datum{
			Properties: map[int64]*V{},
			Children:   []*Datum{},
		},
	}, {
		description: "Error",
		applyUpdates: func(db DataBuilder) {
			db.With(
				Error(fmt.Errorf("oops"))("whoops"),
			)
		},
		wantErr: true,
	}} {
		t.Run(test.description, func(t *testing.T) {
			seriesReq := &DataSeriesRequest{
				QueryName:  "series",
				SeriesName: "1",
			}
			drb := NewDataResponseBuilder()
			test.applyUpdates(drb.DataSeries(seriesReq))
			resp, err := drb.Data()
			if (err != nil) != test.wantErr {
				t.Fatalf("Data() yielded error %v, wanted error: %t", err, test.wantErr)
			}
			if err != nil {
				return
			}
			gotDatum := resp.DataSeries[0].Root
			if diff := cmp.Diff(test.wantDatum, gotDatum); diff != "" {
				t.Errorf("Got datum %v, diff (-want +got) %s", gotDatum, diff)
			}
		})
	}
}

func TestPrettyPrint(t *testing.T) {
	for _, test := range []struct {
		description string
		builder     func() *DataResponseBuilder
		want        string
	}{{
		description: "multiple series",
		builder: func() *DataResponseBuilder {
			req1 := &DataSeriesRequest{
				QueryName:  "query1",
				SeriesName: "0",
				Options: map[string]*V{
					"pivot": StringValue("thing"),
				},
			}
			req2 := &DataSeriesRequest{
				QueryName:  "query2",
				SeriesName: "1",
			}
			drb := NewDataResponseBuilder()
			drb.DataSeries(req1).
				Child().With(
				StringProperty("greeting", "Hello!"),
				IntegerProperty("count", 100),
			).
				Child().With(
				StringsProperty("addressees", "mom", "dad"),
			)
			drb.DataSeries(req2).
				Child().With(
				StringsProperty("items", "apple", "banana", "coconut"),
				DoubleProperty("temp_f", 60),
			)
			return drb
		},
		want: `Data:
  Series 0
    Root:
      Child:
        Prop 'count': 100
        Prop 'greeting': 'Hello!'
        Child:
          Prop 'addressees': [ 'mom', 'dad' ]
  Series 1
    Root:
      Child:
        Prop 'items': [ 'apple', 'banana', 'coconut' ]
        Prop 'temp_f': 60.000000`,
	}} {
		drb := test.builder()
		got, err := drb.Data()
		if err != nil {
			t.Fatalf(err.Error())
		}
		if diff := cmp.Diff(test.want, got.PrettyPrint()); diff != "" {
			t.Errorf("Got data %s, diff (-want, +got) %s", got.PrettyPrint(), diff)
		}
	}
}
