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

// Package table provides structural helpers for defining tables.
// Given a dedicated tableRoot *util.DataBuilder representing the root node of
// the table, and which must not be used for any other purpose, a new Table
// instance may be created via
//
//	table := New(tableRoot, ...columns)
//
// Then, a new row may be added via
//
//	row := table.Row(...<Cell() or FormattedCell()>)
//
// defining a row with the provided columns.  Columns with payloads may also
// be added, via
//
//	payloadsByType := row.AddCellWithPayload(<Cell() or FormattedCell()>,
//	                                         ...<payload names>)
//
// which returns a map from specified payload name to that payload's
// *util.DataBuilder.
// Rows may also have payloads, via
//
//	payloadDb := row.Payload(payloadName)
//
// The structure of a table in a TraceViz response, with each level
// representing a DataSeries or nested Datum is:
//
//	table
//	  children:
//	    * header row
//	    * repeated rows
//
//	header row
//	  children
//	    * repeated column definition
//
//	column definition
//	  properties
//	    * category definition
//	    * <decorators>
//
//	row
//	  properties
//	    * <decorators>
//	  children
//	    * repeated cells, formatted cells and payloads
//
//	cell
//	  properties
//	    * column tag
//	    * cellKey: Value (cell contents)
//	    * <decorators>
//	  children
//	    * repeated payloads
//
//	formatted cell
//	  properties
//	    * column tag
//	    * formattedCellKey: StringValue (cell format string)
//	    * <decorators>
//	  children
//	    * repeated payloads
//
//	payload
//	  properties
//	    * payloadKey: StringValue (payload type)
//	    * <anything else>
//	  children
//	    * <anything>
package table

import (
	"github.com/google/traceviz/server/go/category"
	"github.com/google/traceviz/server/go/util"
)

const (
	cellKey          = "table_cell"
	formattedCellKey = "table_formatted_cell"
	payloadKey       = "table_payload"

	rowHeightPxKey = "table_row_height_px"
	fontSizePxKey  = "table_font_size_px"
)

// RenderSettings is a collection of rendering settings for trees.
type RenderSettings struct {
	// The height of a row in pixels.
	RowHeightPx int64
	// The table text font size in pixels.
	FontSizePx int64
}

func (rs *RenderSettings) define() util.PropertyUpdate {
	if rs == nil {
		return util.EmptyUpdate
	}
	return util.Chain(
		util.IntegerProperty(rowHeightPxKey, rs.RowHeightPx),
		util.IntegerProperty(fontSizePxKey, rs.FontSizePx),
	)
}

// ColumnUpdate represents a table column.  It couples a category (specifying
// the column's unique ID, display name, and description) with arbitrary column
// properties.
type ColumnUpdate struct {
	cat        *category.Category
	properties []util.PropertyUpdate
}

// Column returns a new Column with the specified category and properties.
func Column(cat *category.Category, properties ...util.PropertyUpdate) *ColumnUpdate {
	properties = append(properties, cat.Define())
	return &ColumnUpdate{
		cat:        cat,
		properties: properties,
	}
}

// With annotates the receiving column with the provided properties.
func (cu *ColumnUpdate) With(properties ...util.PropertyUpdate) *ColumnUpdate {
	cu.properties = append(cu.properties, properties...)
	return cu
}

func (cu *ColumnUpdate) define() util.PropertyUpdate {
	return util.Chain(cu.properties...)
}

// CellUpdate is a PropertyUpdate specifically annotating a cell.
type CellUpdate util.PropertyUpdate

// Cell returns a CellUpdate -- a PropertyUpdate that annotates a datum as a
// cell belonging to the column specified by the provided columnID and holding
// the specified value.  Any specified PropertyUpdates are also applied.
func Cell(column *ColumnUpdate, value util.Value, cellUpdates ...util.PropertyUpdate) CellUpdate {
	cellUpdates = append(cellUpdates,
		column.cat.Tag(),
		value(cellKey),
	)
	return CellUpdate(util.Chain(cellUpdates...))
}

// FormattedCell returns a PropertyUpdate that annotates a cell as belonging to
// the column specified by the provided columnID and holding the specified
// string value, which should be interpreted as a format string.  Any specified
// PropertyUpdates, such as those referenced in the format string, are also
// applied.
func FormattedCell(column *ColumnUpdate, value string, cellUpdates ...util.PropertyUpdate) CellUpdate {
	cellUpdates = append(cellUpdates,
		column.cat.Tag(),
		util.StringProperty(formattedCellKey, value),
	)
	return CellUpdate(util.Chain(cellUpdates...))
}

// Node represents a table embedded in a TraceViz response.
type Node struct {
	db util.DataBuilder
}

// With annotates the receiving table with the provided properties.
func (n *Node) With(properties ...util.PropertyUpdate) *Node {
	n.db.With(properties...)
	return n
}

// New defines a new table in the provided DataBiulder, with the specified
// columns.
func New(db util.DataBuilder, renderSettings *RenderSettings, columns ...*ColumnUpdate) *Node {
	colGroup := db.Child()
	for _, column := range columns {
		colGroup.Child().With(column.define())
	}
	db.With(renderSettings.define())
	return &Node{
		db: db,
	}
}

// RowNode represents a row embedded in a TraceViz response.
type RowNode struct {
	db util.DataBuilder
}

// Row adds a new child to the provided canonically-structured table
// representing a new row, then adds the specified cells as children to that
// new row, returning the new row's DataBuilder.  As the children added to the
// new row may not be further amended, they cannot have children of their own.
// If this is required -- e.g., for nested tables -- outer tables must be
// explicitly created.
func (n *Node) Row(cells ...CellUpdate) *RowNode {
	db := n.db.Child()
	for _, cell := range cells {
		db.Child().With(util.PropertyUpdate(cell))
	}
	return &RowNode{
		db,
	}
}

// With annotates the receiving row with the provided properties.
func (rn *RowNode) With(properties ...util.PropertyUpdate) *RowNode {
	rn.db.With(properties...)
	return rn
}

// AddCellWithPayloads adds the specified cell to the receiving row, and
// allocates payload nodes for each specified payload type, returning a mapping
// from type name to payload node DataBuilder.
func (rn *RowNode) AddCellWithPayloads(cell CellUpdate, payloadTypes ...string) map[string]util.DataBuilder {
	cellDb := rn.db.Child().With(util.PropertyUpdate(cell))
	ret := map[string]util.DataBuilder{}
	for _, payloadType := range payloadTypes {
		ret[payloadType] = cellDb.Child().With(
			util.StringProperty(payloadKey, payloadType),
		)
	}
	return ret
}

// AddPayload adds a payload of the specified type to the receiving row,
// returning a DataBuilder for that payload.
func (rn *RowNode) AddPayload(payloadType string) util.DataBuilder {
	return rn.db.Child().With(util.StringProperty(payloadKey, payloadType))
}
