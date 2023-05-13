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

package weightedtree

import (
	"testing"

	"github.com/google/traceviz/server/go/magnitude"
	"github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

func name(name string) util.PropertyUpdate {
	return util.StringProperty("name", name)
}

func datumType(datumType treeDatumType) util.PropertyUpdate {
	return util.IntegerProperty(datumTypeKey, int64(datumType))
}

var defaultRenderSettings = &RenderSettings{
	FrameHeightPx: 20,
}

func TestTreeConstruction(t *testing.T) {
	for _, test := range []struct {
		description   string
		buildTree     func(db util.DataBuilder)
		buildExplicit func(db testutil.TestDataBuilder)
	}{{
		description: "tree with multiple roots",
		buildTree: func(db util.DataBuilder) {
			tree := New(db, defaultRenderSettings)
			root1 := tree.Node(1, name("root 1"))
			a := root1.Node(2, name("a"))
			a.Node(3, name("b"))
			a.Node(4, name("c"))
			root2 := tree.Node(4, name("root 2"))
			x := root2.Node(3, name("x"))
			root2.Node(2, name("y"))
			x.Node(1, name("z")).
				Payload("stuffing").
				With(util.IntegerProperty("count", 3))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegerProperty(frameHeightPxKey, 20),
			).Child().With(
				magnitude.SelfMagnitude(1),
				name("root 1"),
				datumType(treeNodeDatumType),
			).Child().With(
				magnitude.SelfMagnitude(2),
				name("a"),
				datumType(treeNodeDatumType),
			).Child().With(
				magnitude.SelfMagnitude(3),
				name("b"),
				datumType(treeNodeDatumType),
			).AndChild().With(
				magnitude.SelfMagnitude(4),
				name("c"),
				datumType(treeNodeDatumType),
			)
			db.Child().With(
				magnitude.SelfMagnitude(4),
				name("root 2"),
				datumType(treeNodeDatumType),
			).Child().With(
				magnitude.SelfMagnitude(3),
				name("x"),
				datumType(treeNodeDatumType),
			).Child().With(
				magnitude.SelfMagnitude(1),
				name("z"),
				datumType(treeNodeDatumType),
			).Child().With(
				datumType(payloadDatumType),
				util.StringProperty(payloadTypeKey, "stuffing"),
				util.IntegerProperty("count", 3),
			).Parent().Parent().AndChild().With( // Back up to root2
				magnitude.SelfMagnitude(2),
				name("y"),
				datumType(treeNodeDatumType),
			)
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			err := testutil.CompareResponses(t, test.buildTree, test.buildExplicit)
			if err != nil {
				t.Fatalf("encountered unexpected error building the tree: %s", err)
			}
		})
	}
}
