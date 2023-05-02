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

package datasource

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	logtrace "github.com/google/traceviz/logviz/analysis/log_trace"
	loggerreader "github.com/google/traceviz/logviz/analysis/logger_reader"
	"github.com/google/traceviz/server/go/category"
	"github.com/google/traceviz/server/go/color"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	querydispatcher "github.com/google/traceviz/server/go/query_dispatcher"
	"github.com/google/traceviz/server/go/table"
	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
	xychart "github.com/google/traceviz/server/go/xy_chart"
)

var startTime = time.Date(2023, time.January, 1, 0, 0, 0, 0, time.UTC)

func ts(dur time.Duration) time.Time {
	return startTime.Add(dur)
}

const (
	log1 = `2023/01/01 00:00:00.000000 a.cc:10: [I] Hello
2023/01/01 00:10:00.000000 a.cc:20: [W] We have a problem...
2023/01/01 00:20:00.000000 a.cc:30: [I] Still here
2023/01/01 00:30:00.000000 b.cc:10: [E] Trouble!`
	log2 = `2023/01/01 00:05:00.000000 c.cc:10: [E] Alert!
2023/01/01 00:15:00.000000 c.cc:20: [E] Alert!
2023/01/01 00:25:00.000000 a.cc:40: [E] ALERT!
2023/01/01 00:35:00.000000 c.cc:30: [F] Failure`
)

func testLogReader(collectionName, log string) *loggerreader.TextLogReader {
	logCh := make(chan string)
	go func() {
		for _, line := range strings.Split(log, "\n") {
			logCh <- line
		}
		close(logCh)
	}()
	return loggerreader.New(collectionName, loggerreader.DefaultLineParser(), logCh)
}

type testLogTraceFetcher struct{}

func (tlf *testLogTraceFetcher) Fetch(ctx context.Context, collectionName string) (*Collection, error) {
	var logReaders []logtrace.LogReader
	switch collectionName {
	case "log1":
		logReaders = []logtrace.LogReader{testLogReader("log1", log1)}
	case "log2":
		logReaders = []logtrace.LogReader{testLogReader("log2", log2)}
	case "both":
		logReaders = []logtrace.LogReader{testLogReader("log1", log1), testLogReader("log2", log2)}
	default:
		return nil, fmt.Errorf("can't find collection '%s'", collectionName)
	}
	lt, err := logtrace.NewLogTrace(logReaders...)
	if err != nil {
		return nil, err
	}
	return &Collection{
		lt: lt,
	}, nil
}

func TestQueries(t *testing.T) {
	fatalCol := table.Column(category.New("level_0", "Fatal", "The number of distinct log entries associated with this source file at log level `Fatal`"))
	errorCol := table.Column(category.New("level_1", "Error", "The number of distinct log entries associated with this source file at log level `Error`"))
	warningCol := table.Column(category.New("level_2", "Warning", "The number of distinct log entries associated with this source file at log level `Warning`"))
	infoCol := table.Column(category.New("level_3", "Info", "The number of distinct log entries associated with this source file at log level `Info`"))

	for _, test := range []struct {
		description string
		req         *util.DataRequest
		wantErr     bool
		wantSeries  func(util.DataBuilder)
	}{{
		description: "aggregate table by source file, one log",
		req: &util.DataRequest{
			GlobalFilters: map[string]*util.V{
				collectionNameKey: util.StringValue("log1"),
			},
			SeriesRequests: []*util.DataSeriesRequest{
				&util.DataSeriesRequest{
					QueryName: aggregateSourceFilesTableQuery,
				},
			},
		},
		wantSeries: func(db util.DataBuilder) {
			t := table.New(db, renderSettings,
				sourceFileCol, sourceLocCountCol, entriesCol, errorCol, warningCol, infoCol,
			)
			t.Row(
				table.Cell(sourceFileCol, util.String("a.cc")),
				table.Cell(sourceLocCountCol, util.Integer(3)),
				table.Cell(entriesCol, util.Integer(3)),
				table.Cell(warningCol, util.Integer(1)),
				table.Cell(infoCol, util.Integer(2)),
			).With(
				util.StringProperty(sourceFileKey, "a.cc"),
				color.Secondary(highlightColor),
			)
			t.Row(
				table.Cell(sourceFileCol, util.String("b.cc")),
				table.Cell(sourceLocCountCol, util.Integer(1)),
				table.Cell(entriesCol, util.Integer(1)),
				table.Cell(errorCol, util.Integer(1)),
			).With(
				util.StringProperty(sourceFileKey, "b.cc"),
				color.Secondary(highlightColor),
			)
		},
	}, {
		description: "aggregate table by source file, two logs",
		req: &util.DataRequest{
			GlobalFilters: map[string]*util.V{
				collectionNameKey: util.StringValue("both"),
			},
			SeriesRequests: []*util.DataSeriesRequest{
				&util.DataSeriesRequest{
					QueryName: aggregateSourceFilesTableQuery,
				},
			},
		},
		wantSeries: func(db util.DataBuilder) {
			t := table.New(db, renderSettings,
				sourceFileCol, sourceLocCountCol, entriesCol, fatalCol, errorCol, warningCol, infoCol,
			)
			t.Row(
				table.Cell(sourceFileCol, util.String("a.cc")),
				table.Cell(sourceLocCountCol, util.Integer(4)),
				table.Cell(entriesCol, util.Integer(4)),
				table.Cell(errorCol, util.Integer(1)),
				table.Cell(warningCol, util.Integer(1)),
				table.Cell(infoCol, util.Integer(2)),
			).With(
				util.StringProperty(sourceFileKey, "a.cc"),
				color.Secondary(highlightColor),
			)
			t.Row(
				table.Cell(sourceFileCol, util.String("b.cc")),
				table.Cell(sourceLocCountCol, util.Integer(1)),
				table.Cell(entriesCol, util.Integer(1)),
				table.Cell(errorCol, util.Integer(1)),
			).With(
				util.StringProperty(sourceFileKey, "b.cc"),
				color.Secondary(highlightColor),
			)
			t.Row(
				table.Cell(sourceFileCol, util.String("c.cc")),
				table.Cell(sourceLocCountCol, util.Integer(3)),
				table.Cell(entriesCol, util.Integer(3)),
				table.Cell(fatalCol, util.Integer(1)),
				table.Cell(errorCol, util.Integer(2)),
			).With(
				util.StringProperty(sourceFileKey, "c.cc"),
				color.Secondary(highlightColor),
			)
		},
	}, {
		description: "aggregate table by source file, two logs, filtered by time and source file",
		req: &util.DataRequest{
			GlobalFilters: map[string]*util.V{
				collectionNameKey:      util.StringValue("both"),
				startTimestampKey:      util.TimestampValue(ts(time.Minute * 10)),
				endTimestampKey:        util.TimestampValue(ts(time.Minute * 30)),
				filteredSourceFilesKey: util.StringsValue("a.cc"),
			},
			SeriesRequests: []*util.DataSeriesRequest{
				&util.DataSeriesRequest{
					QueryName: aggregateSourceFilesTableQuery,
				},
			},
		},
		wantSeries: func(db util.DataBuilder) {
			t := table.New(db, renderSettings,
				sourceFileCol, sourceLocCountCol, entriesCol, fatalCol, errorCol, warningCol, infoCol,
			)
			t.Row(
				table.Cell(sourceFileCol, util.String("a.cc")),
				table.Cell(sourceLocCountCol, util.Integer(3)),
				table.Cell(entriesCol, util.Integer(3)),
				table.Cell(errorCol, util.Integer(1)),
				table.Cell(warningCol, util.Integer(1)),
				table.Cell(infoCol, util.Integer(1)),
			).With(
				util.StringProperty(sourceFileKey, "a.cc"),
				color.Secondary(highlightColor),
			)
			t.Row(
				table.Cell(sourceFileCol, util.String("b.cc")),
				table.Cell(sourceLocCountCol, util.Integer(1)),
				table.Cell(entriesCol, util.Integer(1)),
				table.Cell(errorCol, util.Integer(1)),
			).With(
				util.StringProperty(sourceFileKey, "b.cc"),
				color.Secondary(highlightColor),
			)
			t.Row(
				table.Cell(sourceFileCol, util.String("c.cc")),
				table.Cell(sourceLocCountCol, util.Integer(1)),
				table.Cell(entriesCol, util.Integer(1)),
				table.Cell(errorCol, util.Integer(1)),
			).With(
				util.StringProperty(sourceFileKey, "c.cc"),
				color.Secondary(highlightColor),
			)
		},
	}, {
		description: "entries, one log",
		req: &util.DataRequest{
			GlobalFilters: map[string]*util.V{
				collectionNameKey: util.StringValue("log1"),
			},
			SeriesRequests: []*util.DataSeriesRequest{
				&util.DataSeriesRequest{
					QueryName: rawEntriesQuery,
					Options:   map[string]*util.V{},
				},
			},
		},
		wantSeries: func(db util.DataBuilder) {
			t := table.New(db, renderSettings, eventCol).With(
				colorSpacesByLevelWeight[0].Define(),
				colorSpacesByLevelWeight[1].Define(),
				colorSpacesByLevelWeight[2].Define(),
				colorSpacesByLevelWeight[3].Define(),
			)
			t.Row(
				table.FormattedCell(eventCol, eventFormatStr,
					util.TimestampProperty(timestampKey, ts(0)),
					util.StringProperty(levelNameKey, "Info"),
					util.StringProperty(sourceLocNameKey, "a.cc:10"),
					util.StringsProperty(messageKey, "Hello"),
				)).With(
				colorSpacesByLevelWeight[3].PrimaryColor(1),
				color.Secondary(highlightColor),
				util.StringProperty(sourceFileKey, "a.cc"),
				util.TimestampProperty(timestampKey, ts(0)),
			)
			t.Row(
				table.FormattedCell(eventCol, eventFormatStr,
					util.TimestampProperty(timestampKey, ts(10*time.Minute)),
					util.StringProperty(levelNameKey, "Warning"),
					util.StringProperty(sourceLocNameKey, "a.cc:20"),
					util.StringsProperty(messageKey, "We have a problem..."),
				)).With(
				color.Secondary(highlightColor),
				colorSpacesByLevelWeight[2].PrimaryColor(1),
				util.StringProperty(sourceFileKey, "a.cc"),
				util.TimestampProperty(timestampKey, ts(10*time.Minute)),
			)
			t.Row(
				table.FormattedCell(eventCol, eventFormatStr,
					util.TimestampProperty(timestampKey, ts(20*time.Minute)),
					util.StringProperty(levelNameKey, "Info"),
					util.StringProperty(sourceLocNameKey, "a.cc:30"),
					util.StringsProperty(messageKey, "Still here"),
				)).With(
				colorSpacesByLevelWeight[3].PrimaryColor(1),
				color.Secondary(highlightColor),
				util.StringProperty(sourceFileKey, "a.cc"),
				util.TimestampProperty(timestampKey, ts(20*time.Minute)),
			)
			t.Row(
				table.FormattedCell(eventCol, eventFormatStr,
					util.TimestampProperty(timestampKey, ts(30*time.Minute)),
					util.StringProperty(levelNameKey, "Error"),
					util.StringProperty(sourceLocNameKey, "b.cc:10"),
					util.StringsProperty(messageKey, "Trouble!"),
				)).With(
				colorSpacesByLevelWeight[1].PrimaryColor(1),
				color.Secondary(highlightColor),
				util.StringProperty(sourceFileKey, "b.cc"),
				util.TimestampProperty(timestampKey, ts(30*time.Minute)),
			)
		},
	}, {
		description: "per-level timeseries, both logs",
		req: &util.DataRequest{
			GlobalFilters: map[string]*util.V{
				collectionNameKey: util.StringValue("both"),
			},
			SeriesRequests: []*util.DataSeriesRequest{
				&util.DataSeriesRequest{
					QueryName: timeseriesQuery,
					Options: map[string]*util.V{
						aggregateByKey: util.StringValue(levelNameKey),
						binCountKey:    util.IntValue(4),
					},
				},
			},
		},
		wantSeries: func(series util.DataBuilder) {
			binWidth := 35 * time.Minute / 3.0
			// First bin is [ts(0), ts(11 minutes 40 seconds))
			firstBinStart := time.Second * 0
			// Second bin is [ts(11 minutes 40 seconds), ts(23 minutes 20 seconds))
			secondBinStart := firstBinStart + binWidth
			// Third bin is [ts(23 minutes 20 seconds), ts(35 minutes)]
			thirdBinStart := secondBinStart + binWidth
			// Fourth bin is [ts(35 minutes), ...]
			fourthBinStart := thirdBinStart + binWidth
			chart := xychart.New(series,
				continuousaxis.NewTimestampAxis(
					category.New("x_axis", "Message timestamp", "Log message timestamp"),
					ts(0), ts(time.Minute*35)),
				continuousaxis.NewDoubleAxis(
					category.New("y_axis", "Messages per minute", "Log messages per minute"),
					0, 2.0/(float64(binWidth)/float64(time.Minute))),
				colorSpacesByLevelWeight[0].Define(),
				colorSpacesByLevelWeight[1].Define(),
				colorSpacesByLevelWeight[2].Define(),
				colorSpacesByLevelWeight[3].Define(),
				xAxisRenderSettings.Apply(),
				yAxisRenderSettings.Apply(),
			)
			// Fatal datapoints
			s := chart.AddSeries(
				category.New("0", "0", "0"),
				colorSpacesByLevelWeight[0].PrimaryColor(1),
			)
			s.WithPoint(
				ts(firstBinStart),
				0,
			).WithPoint(
				ts(secondBinStart),
				0,
			).WithPoint(
				ts(thirdBinStart),
				0,
			).WithPoint(
				ts(fourthBinStart),
				1.0/(float64(binWidth)/float64(time.Minute)),
			)
			// Error datapoints
			s = chart.AddSeries(
				category.New("1", "1", "1"),
				colorSpacesByLevelWeight[1].PrimaryColor(1),
			)
			s.WithPoint(
				ts(firstBinStart),
				1.0/(float64(binWidth)/float64(time.Minute)),
			).WithPoint(
				ts(secondBinStart),
				1.0/(float64(binWidth)/float64(time.Minute)),
			).WithPoint(
				ts(thirdBinStart),
				2.0/(float64(binWidth)/float64(time.Minute)),
			).WithPoint(
				ts(fourthBinStart),
				0,
			)
			// Warning datapoints
			s = chart.AddSeries(
				category.New("2", "2", "2"),
				colorSpacesByLevelWeight[2].PrimaryColor(1),
			)
			s.WithPoint(
				ts(firstBinStart),
				1.0/(float64(binWidth)/float64(time.Minute)),
			).WithPoint(
				ts(secondBinStart),
				0,
			).WithPoint(
				ts(thirdBinStart),
				0,
			).WithPoint(
				ts(fourthBinStart),
				0,
			)
			// Info datapoints
			s = chart.AddSeries(
				category.New("3", "3", "3"),
				colorSpacesByLevelWeight[3].PrimaryColor(1),
			)
			s.WithPoint(
				ts(firstBinStart),
				1.0/(float64(binWidth)/float64(time.Minute)),
			).WithPoint(
				ts(secondBinStart),
				1.0/(float64(binWidth)/float64(time.Minute)),
			).WithPoint(
				ts(thirdBinStart),
				0,
			).WithPoint(
				ts(fourthBinStart),
				0,
			)
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			ds, err := New(&testLogTraceFetcher{})
			if err != nil {
				t.Fatalf("Unexpected failure creating data source: %s", err)
			}
			qd, err := querydispatcher.New(ds)
			if err != nil {
				t.Fatalf("Unexpected failure creating query dispatcher: %s", err)
			}
			gotData, err := qd.HandleDataRequest(context.Background(), test.req)
			if (err != nil) != test.wantErr {
				t.Fatalf("Unexpected error status: got %s", err)
			}
			if err != nil {
				return
			}
			drb := util.NewDataResponseBuilder()
			test.wantSeries(drb.DataSeries(test.req.SeriesRequests[0]))
			if err := testutil.CompareDataResponses(t, gotData, drb); err != nil {
				t.Fatalf("Failed to compare data responses: %s", err)
			}
		})
	}
}
