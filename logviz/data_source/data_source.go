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

// Package datasource provides a TraceViz data source for logs traces.
package datasource

import (
	"context"
	"fmt"
	"hash/fnv"
	"log"
	"sort"
	"strings"
	"time"

	logtrace "github.com/google/traceviz/logviz/analysis/log_trace"
	"github.com/google/traceviz/logviz/logger"
	"github.com/google/traceviz/server/go/category"
	"github.com/google/traceviz/server/go/color"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	"github.com/google/traceviz/server/go/table"
	"github.com/google/traceviz/server/go/util"
	xychart "github.com/google/traceviz/server/go/xy_chart"
)

const (
	aggregateSourceFilesTableQuery = "logs.aggregate_source_files_table"
	rawEntriesQuery                = "logs.raw_entries"
	timeseriesQuery                = "logs.timeseries"

	collectionNameKey      = "collection_name"
	endTimestampKey        = "end_timestamp"
	entriesKey             = "entries"
	eventFormatKey         = "event_format"
	filteredSourceFilesKey = "filtered_source_files"
	levelNameKey           = "level_name"
	messageKey             = "message"
	sourceFileKey          = "source_file"
	sourceLocCountKey      = "source_loc_count"
	sourceLocNameKey       = "source_loc_name"
	startTimestampKey      = "start_timestamp"
	timestampKey           = "timestamp"

	aggregateByKey = "aggregate_by"
	binCountKey    = "bin_count"
)

// queryFilters is a collection of filters assembled by filterFromGlobalFilters
// once per DataRequest, prior to handling any individual DataSeriesRequest.
type queryFilters struct {
	// The filtered-in time range.  Defaults to the start and end time of the
	// LogTrace.
	startTimestamp, endTimestamp time.Time
	// The filtered-in set of source files; empty means no filter.  Defaults to
	// empty.
	sourceFiles []*logtrace.SourceFile
}

func (qf *queryFilters) duration() time.Duration {
	return qf.endTimestamp.Sub(qf.startTimestamp)
}

type filterBy int

const (
	timeFilters filterBy = iota
	sourceFileFilter
)

// filters assembles and returns a logtrace.Filter filtering for the specified
// filterBy types.
func (qf *queryFilters) filters(filterBys ...filterBy) logtrace.Filter {
	ret := []logtrace.Filter{}
	for _, fb := range filterBys {
		switch fb {
		case timeFilters:
			ret = append(ret, logtrace.WithStartTime(qf.startTimestamp), logtrace.WithEndTime(qf.endTimestamp))
		case sourceFileFilter:
			ret = append(ret, logtrace.WithSourceFiles(qf.sourceFiles...))
		}
	}
	return logtrace.ConcatenateFilters(ret...)
}

// filterFromGlobalFilters returns a queryFilters constructed from the provided
// TraceViz DataRequest global filters key-value map.
func filterFromGlobalFilters(lt *logtrace.LogTrace, options map[string]*util.V) (*queryFilters, error) {
	qf := &queryFilters{}
	var err error
	startTs, endTs := lt.TimeRange()
	if tsv, ok := options[startTimestampKey]; ok {
		qf.startTimestamp, err = util.ExpectTimestampValue(tsv)
		if err != nil {
			return nil, err
		}
		if qf.startTimestamp.Before(startTs) {
			qf.startTimestamp = startTs
		}
	} else {
		qf.startTimestamp = startTs
	}
	if tsv, ok := options[endTimestampKey]; ok {
		qf.endTimestamp, err = util.ExpectTimestampValue(tsv)
		if err != nil {
			return nil, err
		}
		if qf.endTimestamp.Before(startTs) {
			qf.endTimestamp = endTs
		}
	} else {
		qf.endTimestamp = endTs
	}
	if filteredSourceFiles, ok := options[filteredSourceFilesKey]; ok {
		filteredSourceFileNames, err := util.ExpectStringsValue(filteredSourceFiles)
		if err != nil {
			return nil, err
		}
		for _, sourceFileName := range filteredSourceFileNames {
			sourceFile, ok := lt.SourceFilesByID[sourceFileName]
			if !ok {
				return nil, fmt.Errorf("'%s' does not specify a known source file", sourceFileName)
			}
			qf.sourceFiles = append(qf.sourceFiles, sourceFile)
		}
	}
	return qf, nil
}

// LogTraceFetcher describes types capable of fetching log traces by collection
// name.
type LogTraceFetcher interface {
	// FetchLog fetches the log specified by collectionName, returning a
	// LogTrace or an error if a failure is encountered.
	Fetch(ctx context.Context, collectionName string) (*Collection, error)
}

// collection represents a single fetched log trace, along with any metadata it
// requires.
type Collection struct {
	lt *logtrace.LogTrace
}

func NewCollection(lt *logtrace.LogTrace) *Collection {
	return &Collection{
		lt: lt,
	}
}

// DataSource implements querydispatcher.dataSource for logs data.  It caches
// the most recently used logs.
type DataSource struct {
	// A log fetcher used to fetch uncached logs.
	fetcher LogTraceFetcher
}

// New returns a new DataSource with the specified cache capacity, and using
// the provided log fetcher.
func New(fetcher LogTraceFetcher) (*DataSource, error) {
	return &DataSource{
		fetcher: fetcher,
	}, nil
}

// SupportedDataSeriesQueries returns the DataSeriesRequest query names
// supported by DataSource.
func (ds *DataSource) SupportedDataSeriesQueries() []string {
	return []string{
		aggregateSourceFilesTableQuery,
		rawEntriesQuery,
		timeseriesQuery,
	}
}

// fetchCollection returns the specified collection from the LRU if it's
// present there.  If it isn't already in the LRU, it is fetched and added to
// the LRU before being returned.
func (ds *DataSource) fetchCollection(ctx context.Context, collectionName string) (*Collection, error) {
	coll, err := ds.fetcher.Fetch(ctx, collectionName)
	if err != nil {
		return nil, err
	}
	return coll, nil
}

// HandleDataSeriesRequests handles the provided set of DataSeriesRequests, with
// the provided global filters.  It assembles its responses in the provided
// DataResponseBuilder.
func (ds *DataSource) HandleDataSeriesRequests(ctx context.Context, globalFilters map[string]*util.V, drb *util.DataResponseBuilder, reqs []*util.DataSeriesRequest) error {
	// Log how long it takes to handle each DataRequest.
	start := time.Now()
	queryNames := make([]string, 0, len(reqs))
	for _, req := range reqs {
		queryNames = append(queryNames, req.QueryName)
	}
	defer func() {
		fmt.Printf("Handled [%s] queries in %s\n", strings.Join(queryNames, ", "), time.Now().Sub(start))
	}()
	// Pull the collection name from the global filters.
	collectionNameVal, ok := globalFilters[collectionNameKey]
	if !ok {
		return fmt.Errorf("missing required filter option '%s'", collectionNameKey)
	}
	collectionName, err := util.ExpectStringValue(collectionNameVal)
	if err != nil {
		return fmt.Errorf("required filter option '%s' must be a string", collectionNameKey)
	}
	// Fetch the collection, from the cache if it's there.
	coll, err := ds.fetchCollection(ctx, collectionName)
	if err != nil {
		log.Printf(logger.Error("Failed to fetch collection: %s", err))
		return err
	}
	log.Printf(logger.Info("Loaded collection %s", collectionName))
	// Build the queryFilters, just once, for all DataSeriesRequests.
	qf, err := filterFromGlobalFilters(coll.lt, globalFilters)
	if err != nil {
		return err
	}
	// Handle each DataSeriesRequest.  Can be parallelized.
	for _, req := range reqs {
		series := drb.DataSeries(req)
		var err error
		switch req.QueryName {
		case aggregateSourceFilesTableQuery:
			err = handleSourceFileTableQuery(coll, qf, series, req.Options)
		case rawEntriesQuery:
			err = handleRawEntriesQuery(coll, qf, series, req.Options)
		case timeseriesQuery:
			err = handleTimeseriesQuery(coll, qf, series, req.Options)
		default:
			err = fmt.Errorf("unsupported data query")
		}
		if err != nil {
			return fmt.Errorf("error handling data query %s: %s", req.QueryName, err)
		}
	}
	return nil
}

// sourceFileData helps aggregate log data at source-file granularity.
type sourceFileData struct {
	// The source file.
	sourceFile *logtrace.SourceFile
	// A set of unique source line granularities.  Since a single sourceFileData
	// concerns only one source file, the size of this set is also the number
	// of distinct source lines.
	lines map[int]struct{}
	// The number of entries associated with this source file.
	entries int
	// A mapping from log Level to the number of entries for this source file at
	// that level.
	entriesAtLevel map[*logtrace.Level]int
	// A mapping from log Level to table columns.
	levelColumns map[*logtrace.Level]*table.ColumnUpdate
}

var (
	sourceFileCol     = table.Column(category.New(sourceFileKey, "Source\nFile", "The logging source file"))
	sourceLocCountCol = table.Column(category.New(sourceLocCountKey, "Source\nLocations", "The number of distinct source locations (logging lines) in this source file"))
	entriesCol        = table.Column(category.New(entriesKey, "Entries", "The number of distinct log entries associated with this source file"))
)

func levelCol(level *logtrace.Level) *table.ColumnUpdate {
	return table.Column(category.New(
		level.Key(),
		level.DisplayName(),
		fmt.Sprintf("The number of distinct log entries associated with this source file at log level `%s`", level.DisplayName()),
	))
}

type levelInfo struct {
	level  *logtrace.Level
	column *table.ColumnUpdate
}

// row returns a set of cells comprising the receiver's table row.
func (sfd *sourceFileData) row(levels []*levelInfo) []table.CellUpdate {
	cells := []table.CellUpdate{
		table.Cell(sourceFileCol, util.String(sfd.sourceFile.Identifier())),
		table.Cell(sourceLocCountCol, util.Integer(int64(len(sfd.lines)))),
		table.Cell(entriesCol, util.Integer(int64(sfd.entries))),
	}
	for _, levelInfo := range levels {
		if entriesAtLevel, ok := sfd.entriesAtLevel[levelInfo.level]; ok {
			cells = append(cells, table.Cell(levelInfo.column, util.Integer(int64(entriesAtLevel))))
		}
	}
	return cells
}

var (
	highlightColor = "rgb(127, 127, 127)"
	renderSettings = &table.RenderSettings{
		RowHeightPx: 20,
		FontSizePx:  14,
	}
)

func handleSourceFileTableQuery(coll *Collection, qf *queryFilters, tableDb util.DataBuilder, reqOpts map[string]*util.V) error {
	for key := range reqOpts {
		switch key {
		default:
			return fmt.Errorf("unsupported option '%s'", key)
		}
	}
	cols := []*table.ColumnUpdate{
		sourceFileCol, sourceLocCountCol, entriesCol,
	}
	// Add a column for each log level, in order of increasing weight.
	levels := []*levelInfo{}
	for level := range coll.lt.Levels {
		col := table.Column(category.New(
			level.Key(),
			level.DisplayName(),
			fmt.Sprintf("The number of distinct log entries associated with this source file at log level `%s`", level.DisplayName()),
		))
		levels = append(levels, &levelInfo{
			level:  level,
			column: col,
		})
	}
	sort.Slice(levels, func(a, b int) bool {
		return levels[a].level.Weight < levels[b].level.Weight
	})
	for _, li := range levels {
		cols = append(cols, li.column)
	}
	// Set up a mapping of observed source file names to *sourceFileData, and
	// a helper to fetch a *sourceFileData by name, creating it if it doesn't
	// already exist.
	dataBySourceFile := map[string]*sourceFileData{}
	sourceFileDatas := []*sourceFileData{}
	getSourceFileData := func(sf *logtrace.SourceFile) *sourceFileData {
		data, ok := dataBySourceFile[sf.Filename]
		if !ok {
			data = &sourceFileData{
				sourceFile:     sf,
				lines:          map[int]struct{}{},
				entriesAtLevel: map[*logtrace.Level]int{},
			}
			sourceFileDatas = append(sourceFileDatas, data)
			dataBySourceFile[sf.Filename] = data
		}
		return data
	}
	// Aggregate in each filtered-in log entry.  Add in all filtered source files
	// so that they appear in the list even when they would otherwise be filtered
	// out.
	for _, filteredInSourceFile := range qf.sourceFiles {
		getSourceFileData(filteredInSourceFile)
	}
	// For each entry, update its corresponding *sourceFileData.
	if err := coll.lt.ForEachEntry(func(entry *logtrace.Entry) error {
		data := getSourceFileData(entry.SourceLocation.SourceFile)
		data.lines[entry.SourceLocation.Line] = struct{}{}
		data.entries = data.entries + 1
		data.entriesAtLevel[entry.Level] = data.entriesAtLevel[entry.Level] + 1
		return nil
	}, qf.filters(timeFilters)); err != nil {
		return err
	}
	// Sort sourceFileDatas by source file name
	sort.Slice(sourceFileDatas, func(a, b int) bool {
		return sourceFileDatas[a].sourceFile.Filename < sourceFileDatas[b].sourceFile.Filename
	})
	// Emit the data series as a table.
	table := table.New(tableDb, renderSettings, cols...)
	for _, sfd := range sourceFileDatas {
		table.Row(sfd.row(levels)...).With(
			util.StringProperty(sourceFileKey, sfd.sourceFile.Filename),
			color.Secondary(highlightColor),
		)
	}
	return nil
}

var (
	eventCol = table.Column(category.New(eventFormatKey, "Raw Event", "Raw events, in temporal order"))
)

var eventFormatStr = fmt.Sprintf("[$(%s)] $(%s) ($(%s)): $(%s)",
	levelNameKey,
	timestampKey,
	sourceLocNameKey,
	messageKey,
)

var (
	fatalColorSpace   = "fatal"
	errorColorSpace   = "error"
	warningColorSpace = "warning"
	infoColorSpace    = "info"
)

var colorSpacesByLevelWeight = map[int]*color.Space{
	0: color.NewSpace(fatalColorSpace, "rgba(153, 0, 0, .5)"),
	1: color.NewSpace(errorColorSpace, "rgba(255, 0, 0, .5)"),
	2: color.NewSpace(warningColorSpace, "rgba(255, 153, 0, .5)"),
	3: color.NewSpace(infoColorSpace, "rgba(153, 153, 153, .5)"),
}

func handleRawEntriesQuery(coll *Collection, qf *queryFilters, tableDb util.DataBuilder, reqOpts map[string]*util.V) error {
	for key := range reqOpts {
		switch key {
		default:
			return fmt.Errorf("unsupported option '%s'", key)
		}
	}
	t := table.New(tableDb, renderSettings, eventCol)
	for _, colorSpace := range colorSpacesByLevelWeight {
		t.With(colorSpace.Define())
	}
	// Aggregate across all filtered-in log entries.
	if err := coll.lt.ForEachEntry(func(entry *logtrace.Entry) error {
		coloring := colorSpacesByLevelWeight[entry.Level.Weight]
		var primaryColor util.PropertyUpdate
		if coloring != nil {
			primaryColor = coloring.PrimaryColor(1)
		}
		t.Row(
			table.FormattedCell(eventCol, eventFormatStr,
				util.TimestampProperty(timestampKey, entry.Time),
				util.StringProperty(levelNameKey, entry.Level.DisplayName()),
				util.StringProperty(sourceLocNameKey, entry.SourceLocation.DisplayName()),
				util.StringsProperty(messageKey, entry.Message...),
			)).With(
			util.StringProperty(sourceFileKey, entry.SourceLocation.SourceFile.Identifier()),
			util.TimestampProperty(timestampKey, entry.Time),
			primaryColor,
			color.Secondary(highlightColor),
		)
		return nil
	}, qf.filters(timeFilters, sourceFileFilter)); err != nil {
		return err
	}
	return nil
}

// idToColorSpace is a helper defining color spaces based on ID hashes.
func idToColorSpace(id string) *color.Space {
	hasher := fnv.New32()
	hasher.Write([]byte(id))
	hash := hasher.Sum32()
	return color.NewSpace(
		fmt.Sprintf("%s_color", id),
		fmt.Sprintf("rgba(%d, %d, %d, .5)", hash%256, (hash/256)%256, (hash/(256*256))%256))
}

var (
	xAxisRenderSettings = continuousaxis.XAxisRenderSettings{
		LabelHeightPx:   10,
		MarkersHeightPx: 20,
	}
	yAxisRenderSettings = continuousaxis.YAxisRenderSettings{
		LabelWidthPx:   10,
		MarkersWidthPx: 30,
	}
)

func handleTimeseriesQuery(coll *Collection, qf *queryFilters, series util.DataBuilder, reqOpts map[string]*util.V) error {
	// Handle query parameters.
	var binCount int64
	var aggregateBy string
	var err error
	for key, val := range reqOpts {
		switch key {
		case binCountKey:
			binCount, err = util.ExpectIntegerValue(val)
		case aggregateByKey:
			aggregateBy, err = util.ExpectStringValue(val)
		default:
			return fmt.Errorf("unsupported option '%s'", key)
		}
		if err != nil {
			return err
		}
	}
	if binCount <= 1 {
		return fmt.Errorf("timeseries bin count must be >1")
	}
	// Information about a single series.
	type seriesInfo struct {
		id   string
		name string
		// if nil, will be generated by hashing the name.
		colorSpace *color.Space
		points     []float64
	}
	// Based on aggregateBy, set up a helper, getSeriesInfo, to fetch the right
	// seriesInfo for a given log Entry.
	seriesInfoByName := map[string]*seriesInfo{}
	// getSeriesInfo must be defined by each supported aggregation type.
	var getSeriesInfo func(entry *logtrace.Entry) *seriesInfo
	switch aggregateBy {
	case levelNameKey:
		getSeriesInfo = func(entry *logtrace.Entry) *seriesInfo {
			if si, ok := seriesInfoByName[entry.Level.Identifier()]; ok {
				return si
			}
			si := &seriesInfo{
				id:         entry.Level.Identifier(),
				name:       entry.Level.String(),
				colorSpace: colorSpacesByLevelWeight[entry.Level.Weight],
				points:     make([]float64, binCount),
			}
			seriesInfoByName[entry.Level.Identifier()] = si
			return si
		}
	default:
		return fmt.Errorf("unsupported aggregation type '%s'", aggregateBy)
	}
	if getSeriesInfo == nil {
		return fmt.Errorf("aggregation type must be specified")
	}
	// Figure out how wide each bin should be given the requested bin count.
	totalWidth := qf.duration()
	// The last bin will only contain samples at the last observed timestamp,
	// so we allocate the rest of the total width over (binCount-1) bins.
	// Each bin includes its lower bound and does not include its upper bound.
	binWidth := totalWidth / time.Duration(binCount-1)
	// Set the bin normalization factor, and the y-axis label, to the nearest
	// larger time unit.
	var binNormalization float64
	var binNormalizationLabel string
	switch {
	case binWidth >= time.Hour:
		binNormalization = float64(binWidth) / float64(time.Hour)
		binNormalizationLabel = "hour"
	case binWidth >= time.Minute:
		binNormalization = float64(binWidth) / float64(time.Minute)
		binNormalizationLabel = "minute"
	case binWidth >= time.Second:
		binNormalization = float64(binWidth) / float64(time.Second)
		binNormalizationLabel = "second"
	case binWidth >= time.Millisecond:
		binNormalization = float64(binWidth) / float64(time.Millisecond)
		binNormalizationLabel = "millisecond"
	case binWidth >= time.Microsecond:
		binNormalization = float64(binWidth) / float64(time.Microsecond)
		binNormalizationLabel = "microsecond"
	case binWidth >= time.Nanosecond:
		binNormalization = float64(binWidth) / float64(time.Nanosecond)
		binNormalizationLabel = "nanosecond"
	}
	// whichBin returns the bin index for a given Entry.
	whichBin := func(entry *logtrace.Entry) (int, error) {
		if entry.Time.Before(qf.startTimestamp) || entry.Time.After(qf.endTimestamp) {
			return 0, fmt.Errorf("entry is unexpectedly out of range")
		}
		startOffset := entry.Time.Sub(qf.startTimestamp)
		return int(startOffset / binWidth), nil
	}
	// For each filtered-in Entry, add that entry to the proper bin in its proper
	// seriesInfo, creating that seriesInfo if it doesn't exist.
	if err := coll.lt.ForEachEntry(func(entry *logtrace.Entry) error {
		si := getSeriesInfo(entry)
		bin, err := whichBin(entry)
		if err != nil {
			return err
		}
		si.points[bin]++
		return nil
	}, qf.filters(timeFilters, sourceFileFilter)); err != nil {
		return err
	}
	// Sort series output for test stability
	seriesNames := make([]string, 0, len(seriesInfoByName))
	for seriesName := range seriesInfoByName {
		seriesNames = append(seriesNames, seriesName)
	}
	sort.Strings(seriesNames)
	seriesColorSpaces := make([]util.PropertyUpdate, len(seriesNames))
	for idx, seriesName := range seriesNames {
		si := seriesInfoByName[seriesName]
		seriesColorSpaces[idx] = si.colorSpace.Define()
	}
	// Find the y-axis maximum.
	var yAxisMax float64
	for _, seriesName := range seriesNames {
		si := seriesInfoByName[seriesName]
		for _, dataPoint := range si.points {
			weight := dataPoint / binNormalization
			if weight > yAxisMax {
				yAxisMax = weight
			}
		}
	}
	// Emit the series data.
	chart := xychart.New(series,
		continuousaxis.NewTimestampAxis(
			category.New("x_axis", "Message timestamp", "Log message timestamp"),
			qf.startTimestamp, qf.endTimestamp),
		continuousaxis.NewDoubleAxis(
			category.New("y_axis", "Messages per "+binNormalizationLabel, "Log messages per "+binNormalizationLabel),
			0, yAxisMax), seriesColorSpaces...).With(
		xAxisRenderSettings.Apply(),
		yAxisRenderSettings.Apply(),
	)
	for _, seriesName := range seriesNames {
		si := seriesInfoByName[seriesName]
		timeseries := chart.AddSeries(
			category.New(si.id, si.name, si.name),
			si.colorSpace.PrimaryColor(1.0),
		)
		// For each point in the series, emit that point.
		binLow := qf.startTimestamp
		for _, dataPoint := range si.points {
			weight := dataPoint / binNormalization
			timeseries.WithPoint(
				binLow,
				weight,
			)
			binLow = binLow.Add(binWidth)
		}
	}
	return nil
}
