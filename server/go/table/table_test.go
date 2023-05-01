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

package table

import (
	"testing"

	"github.com/google/traceviz/server/go/category"
	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

var (
	puzzleCol = Column(category.New("puzzle", "Puzzle", "Here's the problem"))
	answerCol = Column(category.New("answer", "Answer", "Here's the solution"))
	hintCol   = Column(category.New("hint", "Hint", "Need some help?"))

	nameCol = Column(category.New("name", "Name", "The addressee"))

	sortableNameCol = Column(category.New("name", "Name", "The addressee")).With(
		util.StringProperty("sort_by", "name"),
		util.StringProperty("sort_direction", "descending"),
	)

	renderSettings = &RenderSettings{
		RowHeightPx: 20,
		FontSizePx:  14,
	}
)

func TestColumns(t *testing.T) {
	for _, test := range []struct {
		description   string
		buildTabular  func(db util.DataBuilder)
		buildExplicit func(db testutil.TestDataBuilder)
	}{{
		description: "simple columns",
		buildTabular: func(db util.DataBuilder) {
			New(db, renderSettings, puzzleCol, answerCol, hintCol).Row(
				Cell(puzzleCol, util.String("I in a F")),
				Cell(answerCol, util.Integer(12)),
				Cell(hintCol, util.String("length")),
			)
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegerProperty(rowHeightPxKey, 20),
				util.IntegerProperty(fontSizePxKey, 14),
			).Child(). // column definitions
					Child().With(puzzleCol.cat.Define()).
					AndChild().With(answerCol.cat.Define()).
					AndChild().With(hintCol.cat.Define()).
					Parent().Parent(). // back to table root
					Child().           // row 0
					Child().With(      // row 0 cell 0
				puzzleCol.cat.Tag(),
				util.StringProperty(cellKey, "I in a F"),
			).AndChild().With( // row 0 cell 1
				answerCol.cat.Tag(),
				util.IntegerProperty(cellKey, 12),
			).AndChild().With( // row 0 cell 2
				hintCol.cat.Tag(),
				util.StringProperty(cellKey, "length"),
			)
		},
	}, {
		description: "format cell, decorate table, column, row, and cell",
		buildTabular: func(db util.DataBuilder) {
			New(db, renderSettings, sortableNameCol).With(
				util.StringProperty("table_title", "People"),
			).Row(
				FormattedCell(sortableNameCol,
					"$(first_name) $(last_name)",
					util.StringProperty("first_name", "Jane"),
					util.StringProperty("last_name", "Doe"),
				),
			).With(
				util.StringProperty("hover_text", "Here's ol Jane again"),
			)
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.StringProperty("table_title", "People"),
				util.IntegerProperty(rowHeightPxKey, 20),
				util.IntegerProperty(fontSizePxKey, 14),
			).Child(). // column definitions
					Child().With(
				nameCol.cat.Define(),
				util.StringProperty("sort_by", "name"),
				util.StringProperty("sort_direction", "descending"),
			).
				Parent().Parent(). // back to table root
				Child().With(      // row 0
				util.StringProperty("hover_text", "Here's ol Jane again"),
			).
				Child().With( // row 0 cell 0
				nameCol.cat.Tag(),
				util.StringProperty(formattedCellKey, "$(first_name) $(last_name)"),
				util.StringProperty("first_name", "Jane"),
				util.StringProperty("last_name", "Doe"),
			)
		},
	}, {
		description: "payloads",
		buildTabular: func(db util.DataBuilder) {
			table := New(db, nil, nameCol)
			row := table.Row()
			row.AddCellWithPayloads(FormattedCell(nameCol, "thumbnail"), "overtime_bins")["overtime_bins"].With(
				util.IntegersProperty("bins", 1, 2, 3, 4),
			)
			subtableDb := row.AddPayload("subtable")
			subtable := New(subtableDb, nil, nameCol)
			subtable.Row(FormattedCell(nameCol, "thing"))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.Child(). // column definitions
					Child().With(nameCol.cat.Define())
			row := db.Child() // row 0
			row.Child().With( // row 0 cell 0
				nameCol.cat.Tag(),
				util.StringProperty(formattedCellKey, "thumbnail"),
			).Child().With( // row 0 cell 0 payload
				util.StringProperty(payloadKey, "overtime_bins"),
				util.IntegersProperty("bins", 1, 2, 3, 4),
			)
			subtableDb := row.Child().With( // row 0 payload
				util.StringProperty(payloadKey, "subtable"),
			)
			subtableDb.Child(). // subtable column definitions
						Child().With(nameCol.cat.Define())
			subtableDb.Child(). // subtable row 0
						Child().With( // subtable row 0 cell 0
				nameCol.cat.Tag(),
				util.StringProperty(formattedCellKey, "thing"),
			)
		}}} {
		t.Run(test.description, func(t *testing.T) {
			if err := testutil.CompareResponses(t, test.buildTabular, test.buildExplicit); err != nil {
				t.Fatalf("encountered unexpected error building the table: %s", err)
			}
		})
	}
}
