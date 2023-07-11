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

package dot

import (
	"testing"

	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

func TestGraph(t *testing.T) {
	for _, test := range []struct {
		description   string
		buildGraph    func(util.DataBuilder)
		buildExplicit func(util.DataBuilder)
	}{{
		description: "simple graph",
		buildGraph: func(db util.DataBuilder) {
			g, err := NewGraph(db, Strict(), Directed())
			if err != nil {
				t.Fatalf("Unexpected error initializing graph: %s", err)
			}
			g.WithNodeAttrs(
				NewAttributes().
					With("color", "blue").
					WithString("label", "\\N"),
			)
			g.AddNode("A", nil).With(
				util.IntegerProperty("node_id", 0),
			)
			g.AddNode("B", nil).With(
				util.IntegerProperty("node_id", 1),
			)
			g.AddNode("C", nil).With(
				util.IntegerProperty("node_id", 2),
			)
			g.AddEdge("A:B", "A", "B", nil)
			g.AddEdge("A:C", "A", "C", nil)
		},
		buildExplicit: func(db util.DataBuilder) {
			g := db.With(
				util.StringProperty(directionalityKey, directed),
				util.StringProperty(layoutEngineKey, dotEngine),
				util.StringProperty(strictnessKey, strict),
			)
			g.Child().With(
				util.StringProperty(statementTypeKey, attrStatement),
				util.StringProperty(attrStatementTargetKey, nodeAttr),
				util.StringsProperty(attributesKey, "color", "blue", "label", "\"\\N\""),
			)
			g.Child().With(
				util.StringProperty(statementTypeKey, nodeStatement),
				util.StringProperty(nodeIDKey, "A"),
				util.IntegerProperty("node_id", 0),
			)
			g.Child().With(
				util.StringProperty(statementTypeKey, nodeStatement),
				util.StringProperty(nodeIDKey, "B"),
				util.IntegerProperty("node_id", 1),
			)
			g.Child().With(
				util.StringProperty(statementTypeKey, nodeStatement),
				util.StringProperty(nodeIDKey, "C"),
				util.IntegerProperty("node_id", 2),
			)
			g.Child().With(
				util.StringProperty(statementTypeKey, edgeStatement),
				util.StringProperty(edgeIDKey, "A:B"),
				util.StringProperty(startNodeIDKey, "A"),
				util.StringProperty(endNodeIDKey, "B"),
			)
			g.Child().With(
				util.StringProperty(statementTypeKey, edgeStatement),
				util.StringProperty(edgeIDKey, "A:C"),
				util.StringProperty(startNodeIDKey, "A"),
				util.StringProperty(endNodeIDKey, "C"),
			)
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			if err := testutil.CompareResponses(t, test.buildGraph, test.buildExplicit); err != nil {
				t.Fatalf("encountered unexpected error building the graph: %s", err)
			}
		})
	}
}