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

// Package querydispatcher provides QueryDispatcher, a type for multiplexing
// multiple backend data sources written in Go.
package querydispatcher

import (
	"context"
	"fmt"

	"github.com/google/traceviz/server/go/util"
	"golang.org/x/sync/errgroup"
)

// dataSource represents a single trace data source.  dataSource instances
// must support concurrent HandleDataSeriesRequest calls.
type dataSource interface {
	// SupportedDataSeriesQueries returns the list of
	// tracevizpb.DataSeriesRequest.QueryNames this dataSource is able to handle.
	// Query names should be unique to their dataSource: e.g., they may have the
	// dataSource's fully qualified type name prepended.
	SupportedDataSeriesQueries() []string
	// HandleDataSeriesRequests handles a set of DataSeriesRequests for the
	// supplied collection name, with the supplied global options.  dataSource
	// implementations should use the provided DataResponseBuilder to add and
	// populate a new DataSeries.  Any returned error will cancel the entire
	// DataRequest and surface to the client.
	HandleDataSeriesRequests(ctx context.Context, globalState map[string]*util.V, drb *util.DataResponseBuilder, reqs []*util.DataSeriesRequest) error
}

// QueryDispatcher multiplexes multiple data query handlers, which may be from
// entirely different datasets and analysis libraries, allowing common queries
// to be satisfied by a variety of data providers.
type QueryDispatcher struct {
	dataSources []dataSource
	// Maps data series query names to indices (in dataSources) of the
	// dataSources that handle those queries.
	dataSeriesQueryHandlers map[string]int
}

// New returns a *QueryDispatcher wrapping the provided dataSources.
func New(dss ...dataSource) (*QueryDispatcher, error) {
	qd := &QueryDispatcher{
		dataSeriesQueryHandlers: map[string]int{},
	}
	for dsIdx, ds := range dss {
		qd.dataSources = append(qd.dataSources, ds)
		for _, traceQueryName := range ds.SupportedDataSeriesQueries() {
			if _, ok := qd.dataSeriesQueryHandlers[traceQueryName]; ok {
				return nil, fmt.Errorf(
					"multiple dataSources handle trace query `%s`", traceQueryName)
			}
			qd.dataSeriesQueryHandlers[traceQueryName] = dsIdx
		}
	}
	return qd, nil
}

// HandleDataRequest distributes the provided tracevizpb.DataRequest's
// constituent DataSeriesRequests to their appropriate dataSources for processing,
// then assembles the returned tracevizpb.DataSeries into a
// tracevizpb.DataResponse.
func (qd *QueryDispatcher) HandleDataRequest(ctx context.Context, req *util.DataRequest) (*util.Data, error) {
	drb := util.NewDataResponseBuilder()
	// A mapping from dataSource index to a set of DataRequests that source can
	// handle.
	groupedReqs := map[int][]*util.DataSeriesRequest{}
	for _, seriesReq := range req.SeriesRequests {
		dsIdx, ok := qd.dataSeriesQueryHandlers[seriesReq.QueryName]
		if !ok {
			return nil, fmt.Errorf("unsupported data query `%s`", seriesReq.QueryName)
		}
		groupedReqs[dsIdx] = append(groupedReqs[dsIdx], seriesReq)
	}
	errg, ctx := errgroup.WithContext(ctx)
	for dsIdx, seriesReqs := range groupedReqs {
		func(ds dataSource, seriesReqs []*util.DataSeriesRequest) {
			errg.Go(func() error {
				return ds.HandleDataSeriesRequests(ctx, req.GlobalFilters, drb, seriesReqs)
			})
		}(qd.dataSources[dsIdx], seriesReqs)
	}
	if err := errg.Wait(); err != nil {
		return nil, err
	}
	return drb.Data()
}
