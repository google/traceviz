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
	"fmt"
	"sort"
	"strings"

	logtrace "github.com/google/traceviz/logviz/analysis/log_trace"
	"github.com/google/traceviz/server/go/category"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	"github.com/google/traceviz/server/go/trace"
	"github.com/google/traceviz/server/go/util"
)

type timeSeriesTreeNode struct {
	pathFragment string
	entries      []*logtrace.Entry
	children     map[string]*timeSeriesTreeNode
}

func newTimeSeriesTreeNode(pathFragment string) *timeSeriesTreeNode {
	return &timeSeriesTreeNode{
		pathFragment: pathFragment,
		children:     map[string]*timeSeriesTreeNode{},
	}
}

func (tstn *timeSeriesTreeNode) add(entry *logtrace.Entry, path ...string) {
	tstn.entries = append(tstn.entries, entry)
	if len(path) > 0 {
		var child *timeSeriesTreeNode
		childPathFragment := path[0]
		var ok bool
		if child, ok = tstn.children[childPathFragment]; !ok {
			child = newTimeSeriesTreeNode(childPathFragment)
		}
		child.add(entry, path[1:]...)
	}
}

func (tstn *timeSeriesTreeNode) sortedChildren() []*timeSeriesTreeNode {
	ret := []*timeSeriesTreeNode{}
	for _, child := range tstn.children {
		ret = append(ret, child)
	}
	sort.Slice(ret, func(a, b int) bool {
		return ret[a].pathFragment < ret[b].pathFragment
	})
	return ret
}

var (
	traceRenderSettings = &trace.RenderSettings{
		SpanWidthCatPx:          30,
		SpanPaddingCatPx:        1,
		CategoryHeaderCatPx:     30,
		CategoryHandleTempPx:    10,
		CategoryPaddingCatPx:    3,
		CategoryMarginTempPx:    10,
		CategoryMinWidthCatPx:   20,
		CategoryBaseWidthTempPx: 200,
	}
)

type categoryer interface {
	Category(category *category.Category, properties ...util.PropertyUpdate) *trace.Category
}

func handleTraceQuery(coll *Collection, qf *queryFilters, series util.DataBuilder, reqOpts map[string]*util.V) error {
	root := newTimeSeriesTreeNode("")
	// For each filtered-in Entry, add that entry to the proper bin in its proper
	// seriesInfo, creating that seriesInfo if it doesn't exist.
	if err := coll.lt.ForEachEntry(func(entry *logtrace.Entry) error {
		path := strings.Split(entry.SourceLocation.SourceFile.Filename, "/")
		root.add(entry, path...)
		return nil
	}, qf.filters(timeFilters, sourceFileFilter)); err != nil {
		return err
	}
	if len(root.entries) == 0 {
		return fmt.Errorf("can't render trace: log has no entries")
	}
	startTimestamp := root.entries[0].Time
	endTimestamp := root.entries[len(root.entries)-1].Time
	t := trace.New(
		series,
		continuousaxis.NewTimestampAxis(
			category.New("x_axis", "Time", "Time from start of log"),
			startTimestamp, endTimestamp),
		traceRenderSettings).With(
		xAxisRenderSettings.Apply(),
		colorSpacesByLevelWeight[0].Define(),
		colorSpacesByLevelWeight[1].Define(),
		colorSpacesByLevelWeight[2].Define(),
		colorSpacesByLevelWeight[3].Define(),
	)
	var visit func(parent categoryer, node *timeSeriesTreeNode)
	visit = func(parent categoryer, node *timeSeriesTreeNode) {
		childCat := parent.Category(
			category.New(node.pathFragment, node.pathFragment, node.pathFragment),
		)
		childSpan := childCat.Span(0, endTimestamp.Sub(startTimestamp))
		for _, entry := range node.entries {
			childSpan.Subspan(
				entry.Time.Sub(startTimestamp),
				0,
				colorSpacesByLevelWeight[entry.Level.Weight].PrimaryColor(1),
			)
		}
		for _, childNode := range node.children {
			visit(childCat, childNode)
		}
	}
	for _, toplevel := range root.children {
		visit(t, toplevel)
	}
	return nil
}
