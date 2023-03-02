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

package querydispatcher

import (
	"context"
	"errors"
	"sort"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/traceviz/server/go/util"
)

type granularity struct {
	path        string
	displayName string
}

type testDataSource struct {
	supportedDataSeriesQueries []string
	handledQueries             map[string]int
}

func newTestDataSource(supportedDataSeriesQueries []string) *testDataSource {
	return &testDataSource{
		supportedDataSeriesQueries: supportedDataSeriesQueries,
		handledQueries:             map[string]int{},
	}
}

func (tds *testDataSource) SupportedDataSeriesQueries() []string {
	return tds.supportedDataSeriesQueries
}

const collectionNameKey = "collection_name"

func (tds *testDataSource) HandleDataSeriesRequests(ctx context.Context, globalState map[string]*util.V, drb *util.DataResponseBuilder, reqs []*util.DataSeriesRequest) error {
	collectionNameVal, ok := globalState[collectionNameKey]
	if !ok {
		panic("missing required collection name")
	}
	collectionName, err := util.ExpectStringValue(collectionNameVal)
	if err != nil {
		panic("required collection name wasn't a string")
	}
	if collectionName == "error" {
		return errors.New("oops")
	}
	for _, req := range reqs {
		drb.DataSeries(req)
		tds.handledQueries[req.QueryName]++
	}
	return nil
}

var (
	queries = [][]string{
		[]string{"ThreadIntervals", "CPUIntervals"},
		[]string{"RPCIntervals"},
	}
)

func TestQueryDispatcherCreation(t *testing.T) {
	for _, test := range []struct {
		description string
		dataSources []dataSource
		wantErr     bool
	}{{
		description: "single data source",
		dataSources: []dataSource{
			newTestDataSource(queries[0]),
		},
	}, {
		description: "multiple data sources",
		dataSources: []dataSource{
			newTestDataSource(queries[0]),
			newTestDataSource(queries[1]),
		},
	}, {
		description: "supported query conflict",
		dataSources: []dataSource{
			newTestDataSource(queries[0]),
			newTestDataSource(queries[0]),
		},
		wantErr: true,
	}} {
		t.Run(test.description, func(t *testing.T) {
			_, err := New(test.dataSources...)
			if test.wantErr != (err != nil) {
				t.Fatalf("Unexpected error creating QueryDispatcher: %s", err)
			}
		})
	}
}

// Compare two Data, returning their diff, which is empty if the two are
// equivalent.  When comparing Data, ordering and string table ordering are not
// considered, but within a Data, only query_name and series_name are
// considered.
func compareDataResponses(a, b *util.Data) string {
	return cmp.Diff(a, b)
}

func emptyDatum() *util.Datum {
	return &util.Datum{
		Properties: map[int64]*util.V{},
		Children:   []*util.Datum{},
	}
}

func TestHandleDataRequest(t *testing.T) {
	for _, test := range []struct {
		description        string
		dataSources        []dataSource
		req                *util.DataRequest
		wantErr            bool
		wantData           *util.Data
		wantHandledQueries [][]string
	}{{
		description: "single data source",
		dataSources: []dataSource{
			newTestDataSource(queries[0]),
		},
		req: &util.DataRequest{
			GlobalFilters: map[string]*util.V{
				collectionNameKey: util.StringValue("coll1"),
			},
			SeriesRequests: []*util.DataSeriesRequest{
				&util.DataSeriesRequest{
					QueryName:  "ThreadIntervals",
					SeriesName: "1",
				},
			},
		},
		wantData: &util.Data{
			StringTable: []string{},
			DataSeries: []*util.DataSeries{
				&util.DataSeries{
					SeriesName: "1",
					Root:       emptyDatum(),
				},
			},
		},
		wantHandledQueries: [][]string{
			[]string{"ThreadIntervals"},
		},
	}, {
		description: "multiple data sources",
		dataSources: []dataSource{
			newTestDataSource(queries[0]),
			newTestDataSource(queries[1]),
		},
		req: &util.DataRequest{
			GlobalFilters: map[string]*util.V{
				collectionNameKey: util.StringValue("coll1"),
			},
			SeriesRequests: []*util.DataSeriesRequest{
				&util.DataSeriesRequest{
					QueryName:  "ThreadIntervals",
					SeriesName: "1",
					Options:    map[string]*util.V{},
				},
				&util.DataSeriesRequest{
					QueryName:  "RPCIntervals",
					SeriesName: "2",
					Options:    map[string]*util.V{},
				},
			},
		},
		wantData: &util.Data{
			StringTable: []string{},
			DataSeries: []*util.DataSeries{
				&util.DataSeries{
					SeriesName: "1",
					Root:       emptyDatum(),
				},
				&util.DataSeries{
					SeriesName: "2",
					Root:       emptyDatum(),
				},
			},
		},
		wantHandledQueries: [][]string{
			[]string{"ThreadIntervals"},
			[]string{"RPCIntervals"},
		},
	}, {
		description: "trace failure",
		dataSources: []dataSource{
			newTestDataSource(queries[0]),
		},
		req: &util.DataRequest{
			GlobalFilters: map[string]*util.V{
				collectionNameKey: util.StringValue("error"),
			},
			SeriesRequests: []*util.DataSeriesRequest{
				&util.DataSeriesRequest{
					QueryName:  "ThreadIntervals",
					SeriesName: "1",
				},
			},
		},
		wantErr: true,
	}, {
		description: "unknown query",
		dataSources: []dataSource{
			newTestDataSource(queries[0]),
		},
		req: &util.DataRequest{
			GlobalFilters: map[string]*util.V{
				collectionNameKey: util.StringValue("coll1"),
			},
			SeriesRequests: []*util.DataSeriesRequest{
				&util.DataSeriesRequest{
					QueryName:  "MagicIntervals",
					SeriesName: "1",
				},
			},
		},
		wantErr: true,
	}} {
		t.Run(test.description, func(t *testing.T) {
			qd, err := New(test.dataSources...)
			if err != nil {
				t.Fatalf("Unexpected error creating QueryDispatcher: %s", err)
			}
			gotData, err := qd.HandleDataRequest(context.Background(), test.req)
			if test.wantErr != (err != nil) {
				t.Fatalf("HandleDataRequest() yielded unexpected error %s", err)
			}
			if err != nil {
				return
			}
			sortResultsByQuery := func(dataSeries []*util.DataSeries) {
				sort.Slice(dataSeries, func(a, b int) bool {
					return dataSeries[a].SeriesName < dataSeries[b].SeriesName
				})
			}
			sortResultsByQuery(gotData.DataSeries)
			sortResultsByQuery(test.wantData.DataSeries)
			if diff := cmp.Diff(gotData.PrettyPrint(), test.wantData.PrettyPrint()); diff != "" {
				t.Errorf("Got data %s, diff (-want +got):\n%s", gotData.PrettyPrint(), diff)
			}
			for idx, handledQueries := range test.wantHandledQueries {
				ds := test.dataSources[idx].(*testDataSource)
				for _, query := range handledQueries {
					if _, ok := ds.handledQueries[query]; !ok {
						t.Fatalf("Expected query '%s' was not handled by data source %d", query, idx)
					}
					ds.handledQueries[query]--
					if ds.handledQueries[query] == 0 {
						delete(ds.handledQueries, query)
					}
				}
			}
			for idx, ds := range test.dataSources {
				tds := ds.(*testDataSource)
				if len(tds.handledQueries) > 0 {
					qs := []string{}
					for query, count := range tds.handledQueries {
						for i := 0; i < count; i++ {
							qs = append(qs, query)
						}
					}
					t.Errorf("Queries [%s] were handled by data source %d, but not expected to be.", strings.Join(qs, ", "), idx)
				}
			}
		})
	}
}
