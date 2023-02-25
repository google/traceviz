package util

import (
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

func TestValueMapBuilder(t *testing.T) {
	for _, test := range []struct {
		description string
		vmbFn       func(*valueMapBuilder) error
		wantMap     map[string]*V
	}{{
		description: "override scalars, append to strings",
		vmbFn: func(vmb *valueMapBuilder) error {
			vmb.
				withStr("string", "hello").
				withDbl("double", 1.1).
				appendStrs("strings", "a", "b", "c").
				withStr("string", "goodbye").
				withDbl("double", 2.2).
				appendStrs("strings", "d", "e", "f")
			return nil
		},
		wantMap: map[string]*V{
			"string":  StringValue("goodbye"),
			"double":  DoubleValue(2.2),
			"strings": StringsValue("a", "b", "c", "d", "e", "f"),
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			vmb := newValueMapBuilder(&errors{})
			if err := test.vmbFn(vmb); err != nil {
				t.Fatalf("error in vmbFn: %s", err)
			}
			gotMap := vmb.valueMap()
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
			  "Requests": [
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
			Requests: []*DataSeriesRequest{
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
					"name_regex": {"T": 1, "V": ".*egg.*"}
				},
			  "Requests": [
			    {
			      "QueryName": "q1",
						"SeriesName": "1"
			    }
			  ]
			}`,
		wantReq: &DataRequest{
			GlobalFilters: map[string]*V{
				"name_regex": StringValue(".*egg.*"),
			},
			Requests: []*DataSeriesRequest{
				&DataSeriesRequest{
					QueryName:  "q1",
					SeriesName: "1",
				},
			},
		},
	}, {
		description: "with options",
		reqJSON: `{
			  "Requests": [
			    {
			      "QueryName": "q1",
						"SeriesName": "1",
						"Options": {
							"max_elements": {"T": 5, "V": 10}
						}
			    }
			  ]
			}`,
		wantReq: &DataRequest{
			Requests: []*DataSeriesRequest{
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

func TestValueEncodingAndDecoding(t *testing.T) {
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
	// For good measure, convert to and from JSON before comparing.
	seriesReq := &DataSeriesRequest{
		QueryName:  "series",
		SeriesName: "1",
	}
	req := &DataRequest{
		Requests: []*DataSeriesRequest{
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
					Request: seriesReq,
					Root: &Datum{
						Properties: map[int64]*V{},
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
					Request: seriesReq,
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
							},
						},
					},
				},
			},
			StringTable: []string{"a", "choices", "b", "c", "pi", "name", "baby", "age", "another toplevel child", "weight", "dimensions", "birthday"},
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			drb := NewDataResponseBuilder(req)
			ds := drb.DataSeries(req.Requests[0])
			test.buildResponse(ds)
			gotDataJSON, err := drb.ToJSON()
			if err != nil {
				t.Fatalf("ToJSON yielded unexpected error %s", err)
			}
			gotData := &Data{}
			if err := json.Unmarshal(gotDataJSON, gotData); err != nil {
				t.Fatalf("Failed to unmarshal gotData from JSON: %s", err)
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
			Requests: []*DataSeriesRequest{
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
			seriesReqOpts := req.Requests[0].Options
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
			drb := NewDataResponseBuilder(&DataRequest{
				Requests: []*DataSeriesRequest{seriesReq},
			})
			test.applyUpdates(drb.DataSeries(seriesReq))
			respJSON, err := drb.ToJSON()
			if (err != nil) != test.wantErr {
				t.Fatalf("ToJSON() yielded error %v, wanted error: %t", err, test.wantErr)
			}
			if err != nil {
				return
			}
			decodedResp := &Data{}
			if err := json.Unmarshal(respJSON, decodedResp); err != nil {
				t.Fatalf("failed to unmarshal data response: %s", err)
			}
			gotDatum := decodedResp.DataSeries[0].Root
			if diff := cmp.Diff(test.wantDatum, gotDatum); diff != "" {
				t.Errorf("Got datum %v, diff (-want +got) %s", gotDatum, diff)
			}
		})
	}
}
