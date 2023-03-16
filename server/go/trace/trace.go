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

// Package trace provides structural helpers for defining trace data.  Given
// a dedicated tableRoot *util.DataBuilder representing the root node of the
// trace, and which must not be used for any other purpose, and either a
// timestamp or duration-based axis, a new trace may be
// created via
//
//	trace := New(tableRoot, axis)
//
// Traces may also be annotated with additional properties, via
//
//	trace.With(properties...)
//
// The choice of axis depends on the nature of the temporal data to be shown.
// If absolute timestamps for all events are known, a TimestampAxis should be
// used; on the other hand, if events' timestamps are reckoned from some
// unknown but fixed previous point, a DurationAxis may be used.  Note that
// when unioning trace data from multiple data sources (see below), they must
// agree about this time basis.
//
// Every meaningful trace has at least one Category and at least one Span.
// Trace categories represent independent, concurrent portions of the trace.  A
// trace may have a single Category representing the entire trace, or many
// categories representing different concurrent aspects of the trace, and
// categories may have subcategories representing independent and concurrent
// portions of trace under their parent.  Given `c *category.Category`, a
// toplevel trace Category corresponding to `c` may be added to a trace via
//
//	cat := trace.Category(c, properties...)
//
// Subcategories may be added via
//
//	subcat := cat.Category(c, properties...)
//
// Categories may also be annotated with additional properties, via
//
//	cat.With(properties...)
//
// The fundamental unit of trace visualization is the Span.  A Trace Span
// exists in exactly one Category, has an offset and a duration, and its
// temporal extent lies entirely within its parent trace's (indeed, a trace's
// temporal extent is generally the spanning interval of all its spans).  A
// span may be created under `cat *trace.Category` via
//
//	span := cat.Span(offset, duration, properties...)
//
// Spans may have nested child spans, which are created via:
//
//	childSpan := span.Span(offset, duration, properties...)
//
// Spans may also be annotated with additional properties, via
//
//	span.With(properties...)
//
// Spans may have subspans, which are intervals that comprise some part of their
// parent span, and often represent lifecycle phases of their parent span.
// Spans may also have children, which usually represent subsidiary but
// independent work.
// Subspans are rendered as portions of their parent and so may not have
// subspans or children of their own, but child spans are rendered separately
// (e.g., depending below their parent) and may have subspans and children.  A
// subspan may be created under `span *trace.Span` via:
//
//	subspan := span.Subspan(offset, duration, properties...)
//
// Subspans may also be annotated with additional properties, via
//
//	subspan.With(properties...)
//
// All children and Subspans of a Span belong to that parent Span's Category.
//
// Arbitrary payloads may be composed into traces under Spans and Subspans, via
//
//	span.Payload(payloadType)
//	subspan.Payload(payloadType)
//
// which allocate the payload, tag it with the specified type string, and
// return its *util.DataBuilder.
//
// This format supports composition, or 'unioning', on the frontend, which
// allows multiple distinct data sources to contribute to a single trace view
// on the frontend without needing to be aware of one another.  The union U of
// a set S of traces has:
//   - an axis with the lowest min extent and highest max extent across all in
//     S;
//   - the union of all toplevel trace categories in S;
//   - a recursively constructed category tree: for each category path P in
//     any trace in S, P also exists in U
//   - all spans: for any category path P in any trace in S that has
//     a set N of associated spans, the category path P in U also associates
//     all spans in N.
//
// Thus, unioning is done at the granularity of trace categories.  Three
// restrictions are recommended:
//   - It should be an error if any two traces in S have different axis types,
//     and if all traces in S have 'Duration'-type axes, they must have, or be
//     corrected to have, the same offset time;
//   - It should be an error if two different datasources specify a category
//     with the same path P but with different display names or descriptions.
//     In other words, categories must be identical to be merged;
//   - If a data source specifies a set of spans at the path P, no other data
//     source should specify spans at path P.  This helps avoid the case of
//     two sibling spans overlapping, which is generally an undefined input
//     for trace visualizations.  Different data sources are likely working at
//     different granularities (and thus different leaf categories) anyway,
//     but an apparent need to merge spans from multiple data sources into a
//     single category is probably a sign that the data sources themselves
//     should be merged.
//
// Encoded into the TraceViz data model, a trace is:
//
// trace
//
//	properties
//	  * time axis definition
//	  * <decorators>
//	children
//	  * repeated trace categories
//
// trace category
//
//	properties
//	  * nodeTypeKey: categoryNodeType
//	  * category definition
//	  * <decorators>
//	children
//	  * repeated trace categories and spans
//
// span
//
//	properties
//	  * nodeTypeKey: spanNodeType
//	  * offsetKey: Duration (offset from time axis min)
//	  * durationKey: Duration
//	  * <decorators>
//	children
//	  * repeated spans, subspans, and payloads
//
// subspan
//
//	properties
//	  * nodeTypeKey: subspanNodeType
//	  * offsetKey: Duration (offset from time axis min)
//	  * durationKey: Duration
//	  * <decorators>
//	children
//	  * repeated payloads
//
// payload
//
//	properties
//	  * nodeTypeKey: payloadNodeType
//	  * payloadTypeKey: StringValue
//	  * <anything else>
//	children
//	  * <anything>
package trace

import (
	"time"

	"github.com/google/traceviz/server/go/category"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	"github.com/google/traceviz/server/go/util"
)

const (
	offsetKey      = "trace_offset"
	durationKey    = "trace_duration"
	nodeTypeKey    = "trace_node_type"
	payloadTypeKey = "trace_payload_type"

	// Rendering property keys
	spanWidthCatPx          = "span_width_cat_px"
	spanPaddingCatPx        = "span_padding_cat_px"
	categoryHeaderCatPx     = "category_header_cat_px"
	categoryPaddingCatPx    = "category_padding_cat_px"
	categoryMarginTempPx    = "category_margin_temp_px"
	categoryMinWidthCatPx   = "category_min_width_cat_px"
	categoryBaseWidthTempPx = "category_base_width_temp_px"
)

// RenderSettings is a collection of rendering settings for traces.  A trace is
// rendered on a two-dimensional plane, with one axis (typically the x-axis)
// showing trace temporal duration ('temp') and the other (typically the
// y-axis) showing the hierarchical and concurrent dimension of the trace via a
// hierarchy of trace categories ('cat').
//
// These settings are generally defined as extents, in units of pixels, along
// these two axes, so are suffixed 'TempPx' for a pixel extent along the
// temporal axis, or 'CatPx' for a pixel extent along the category axis.
type RenderSettings struct {
	// The width of a span along the category axis.  If x is the temporal axis,
	// this is the default height of a span.
	SpanWidthCatPx int64
	// The padding between adjacent spans along the category axis.  If x is the
	// temporal axis, this is the vertical spacing between spans.
	SpanPaddingCatPx int64
	// The width of the category header along the category axis.  If x is the
	// temporal axis, this is the vertical space at the top of a category header
	// where a category label may be shown.
	CategoryHeaderCatPx int64
	// The padding between adjacent categories along the category axis.  If x is
	// the temporal axis, this is the vertical spacing between categories.
	CategoryPaddingCatPx int64
	// The margin between parent and child categories along the temporal axis.
	// If x is the temporal axis, this is the horizontal indent of a child
	// category under its parent.
	CategoryMarginTempPx int64
	// The minimum width of a category along the category axis.  If x is the
	// temporal axis, this is the minimum height of a category header.
	CategoryMinWidthCatPx int64
	// The base width of a category along the temporal axis, not including
	// margins.  If x is the temporal axis, this is the minimum horizontal width
	// of any category header in the trace (though ancestor categories will have
	// wider headers.)
	CategoryBaseWidthTempPx int64
}

// Define applies the receiver as a set of properties.
func (rs *RenderSettings) Define() util.PropertyUpdate {
	return util.Chain(
		util.IntegerProperty(spanWidthCatPx, rs.SpanWidthCatPx),
		util.IntegerProperty(spanPaddingCatPx, rs.SpanPaddingCatPx),
		util.IntegerProperty(categoryHeaderCatPx, rs.CategoryHeaderCatPx),
		util.IntegerProperty(categoryPaddingCatPx, rs.CategoryPaddingCatPx),
		util.IntegerProperty(categoryMarginTempPx, rs.CategoryMarginTempPx),
		util.IntegerProperty(categoryMinWidthCatPx, rs.CategoryMinWidthCatPx),
		util.IntegerProperty(categoryBaseWidthTempPx, rs.CategoryBaseWidthTempPx),
	)
}

type traceNodeType int64

const (
	categoryNodeType traceNodeType = iota
	spanNodeType
	subspanNodeType
	payloadNodeType
)

func traceNode(parentDb util.DataBuilder, nodeType traceNodeType) util.DataBuilder {
	return parentDb.Child().
		With(util.IntegerProperty(nodeTypeKey, int64(nodeType)))
}

// Trace represents a trace: a profile including all events at specific
// granularities, organized into hierarchical categories and as hierarchical
// spans, usually against a temporal axis whose extent represents the profiled
// interval.  Trace visualizations help identify causal relationships, dynamic
// phases, and opportunities for improved parallelism and latency among
// visualized traces.
// Every trace has a single axis, provided at its creation, extending across
// the portion of the trace to be visualized.  Spans' and subspans' offsets are
// reckoned from the minimum extent of this access.
type Trace struct {
	db util.DataBuilder
}

// New returns a new Trace populating the provided data builder.
func New(db util.DataBuilder, axis continuousaxis.Axis, renderSettings *RenderSettings) *Trace {
	return &Trace{
		db: db.With(
			axis.Define(),
			renderSettings.Define(),
		),
	}
}

// With applies a set of properties to the receiving Trace, returning that Span
// to facilitate chaining.
func (t *Trace) With(properties ...util.PropertyUpdate) *Trace {
	t.db.With(properties...)
	return t
}

// Category adds and returns a Category within the receiving Trace.
func (t *Trace) Category(category *category.Category, properties ...util.PropertyUpdate) *Category {
	db := traceNode(t.db, categoryNodeType).
		With(category.Define()).
		With(properties...)
	return &Category{
		db: db,
	}
}

// Category is a grouping of spans that may have explicit subspan or child
// relationships among themselves, but have no such relationships with spans in
// different category.  Note that this does not imply that no cross-category
// relationships exist in the underlying data, only that they are not expressed
// in this data model (or are expressed in other ways, such as by edges between
// two categories at a particular moment.)  Categories may contain nested
// Categories.
// In the canonical trace view (trace time-extent on the x-axis and spans as
// rectangles covering their extent), Categories are often represented as
// bins in the y-axis: all spans from a given Category fall into that
// Category's y-extent, and no spans from any other Category fall into that
// extent.
// Categories are often used to break out sequential portions of a concurrent
// trace.  For example, in an RPC fanout, each RPC span might get its own
// Category, and the child RPCs it calls belong to child Categories nested
// under their parent's; or a system-wide trace might include a Category for
// each CPU or thread in the system (that is, for each sequential line of
// execution in the concurrent system.)
type Category struct {
	db util.DataBuilder
}

// Category adds and returns a sub-Category under the receiving Category.
func (c *Category) Category(category *category.Category, properties ...util.PropertyUpdate) *Category {
	db := traceNode(c.db, categoryNodeType).
		With(category.Define()).
		With(properties...)
	return &Category{
		db: db,
	}
}

// Span creates a new Span with the specified offset (from the axis minimum)
// and duration under the receiving Category, and returns it.
func (c *Category) Span(offset, duration time.Duration, properties ...util.PropertyUpdate) *Span {
	db := traceNode(c.db, spanNodeType).
		With(
			util.DurationProperty(offsetKey, offset),
			util.If(duration > 0, util.DurationProperty(durationKey, duration)),
		).With(properties...)
	return &Span{
		db: db,
	}
}

// With applies a set of properties to the receiving Category, returning that Category
// to facilitate chaining.
func (c *Category) With(properties ...util.PropertyUpdate) *Category {
	c.db.With(properties...)
	return c
}

// Span is an event within a trace with a start offset and a duration.  Its
// duration may be zero, in which case it may be called an 'event.
// This package distinguishes two types of spans: 'hierarchical spans', which
// should be rendered separately and represent parent/child relationships, and
// 'subspans', which should be rendered atop their parent hierarchical span and
// represent phases of that parent span, or events within it.  Subspans may not
// have children.
type Span struct {
	db util.DataBuilder
}

// Span creates a new Span with the specified offset (from the axis minimum)
// and duration under the receiving Span, and returns it.
func (s *Span) Span(offset, duration time.Duration, properties ...util.PropertyUpdate) *Span {
	db := traceNode(s.db, spanNodeType).
		With(
			util.DurationProperty(offsetKey, offset),
			util.If(duration > 0, util.DurationProperty(durationKey, duration)),
		).With(properties...)
	return &Span{
		db: db,
	}
}

// With applies a set of properties to the receiving Span, returning that Span
// to facilitate chaining.
func (s *Span) With(properties ...util.PropertyUpdate) *Span {
	s.db.With(properties...)
	return s
}

// Payload creates and returns a DataBuilder that can be used to attach
// arbitrary structured information to the receiving Span.
func (s *Span) Payload(payloadType string) util.DataBuilder {
	return traceNode(s.db, payloadNodeType).With(
		util.StringProperty(payloadTypeKey, payloadType),
	)
}

// Subspan creates a new Subspan with the specified offset (from the axis
// minimum) and duration under the receiving Span, and returns it.
func (s *Span) Subspan(offset, duration time.Duration, properties ...util.PropertyUpdate) *Subspan {
	db := traceNode(s.db, subspanNodeType).
		With(
			util.DurationProperty(offsetKey, offset),
			util.If(duration > 0, util.DurationProperty(durationKey, duration))).
		With(properties...)
	return &Subspan{
		db: db,
	}
}

// Subspan is a part of a parent Span, often representing a phase or event
// within that Span.
type Subspan struct {
	db util.DataBuilder
}

// Payload creates and returns a DataBuilder that can be used to attach
// arbitrary structured information to the receiving SubSpan.
func (ss *Subspan) Payload(payloadType string) util.DataBuilder {
	return traceNode(ss.db, payloadNodeType).With(
		util.StringProperty(payloadTypeKey, payloadType),
	)
}

// With applies a set of properties to the receiving Subspan, returning that
// Subspan to facilitate chaining.
func (ss *Subspan) With(properties ...util.PropertyUpdate) *Subspan {
	ss.db.With(properties...)
	return ss
}
