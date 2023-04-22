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
	"fmt"
	"math"
	"sort"
	"strings"
	"testing"

	"github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

type testTreeNode struct {
	path      []ScopeID
	selfVals  map[string]int64
	totalVals map[string]int64
	children  map[ScopeID]*testTreeNode
}

func (ttn *testTreeNode) Path() []ScopeID {
	return ttn.path
}

func (ttn *testTreeNode) sumUp() {
	for name, val := range ttn.selfVals {
		ttn.totalVals[name] = val
	}
	for _, child := range ttn.children {
		child.sumUp()
		for name, val := range child.totalVals {
			ttn.totalVals[name] += val
		}
	}
}

var errorScopeID ScopeID = math.MaxUint

func (ttn *testTreeNode) Children(scopeIDs ...ScopeID) ([]TreeNode, error) {
	var ret []TreeNode
	if len(scopeIDs) == 0 {
		ret = make([]TreeNode, 0, len(ttn.children))
		for _, child := range ttn.children {
			ret = append(ret, child)
		}
	} else {
		ret = make([]TreeNode, 0, len(scopeIDs))
		for _, childScopeID := range scopeIDs {
			if child, ok := ttn.children[childScopeID]; ok {
				ret = append(ret, child)
			}
		}
	}
	for _, child := range ret {
		if child.Path()[len(child.Path())-1] == errorScopeID {
			return nil, fmt.Errorf("oops")
		}
	}
	return ret, nil
}

type op func(ttn *testTreeNode)

func val(name string, val int64) op {
	return func(ttn *testTreeNode) {
		ttn.selfVals[name] = val
	}
}

func node(scopeID ScopeID, ops ...op) op {
	return func(ttn *testTreeNode) {
		child := &testTreeNode{
			path:      append(ttn.path, scopeID),
			selfVals:  map[string]int64{},
			totalVals: map[string]int64{},
			children:  map[ScopeID]*testTreeNode{},
		}
		ttn.children[scopeID] = child
		for _, op := range ops {
			op(child)
		}
	}
}

func tree(ops ...func(ttn *testTreeNode)) TreeNode {
	root := &testTreeNode{
		selfVals:  map[string]int64{},
		totalVals: map[string]int64{},
		children:  map[ScopeID]*testTreeNode{},
	}
	for _, op := range ops {
		op(root)
	}
	root.sumUp()
	return root
}

const (
	decreasing = true
	increasing = false
)

func CompareBy(valName string, decreasing bool) Compare {
	return func(a, b TreeNode) (int, error) {
		aTtn, aOK := a.(*testTreeNode)
		bTtn, bOK := b.(*testTreeNode)
		if !aOK || !bOK {
			return 0, fmt.Errorf("can only compare *testTreeNodes")
		}
		// For testing, CompareBy should be deterministic.  If equal, the path
		// breaks the tie.
		if aTtn.totalVals[valName] == bTtn.totalVals[valName] {
			pathLenDiff := len(aTtn.path) - len(bTtn.path)
			if pathLenDiff != 0 {
				return pathLenDiff, nil
			}
			// The paths are the same length.  Use the path elements to decide.
			for idx := 0; idx < len(aTtn.path); idx++ {
				pathElDiff := aTtn.path[idx] - bTtn.path[idx]
				if pathElDiff != 0 {
					return int(pathElDiff), nil
				}
			}
		}
		if decreasing {
			return int(aTtn.totalVals[valName] - bTtn.totalVals[valName]), nil
		}
		return int(bTtn.totalVals[valName] - aTtn.totalVals[valName]), nil
	}
}

const (
	timeNsKey = "time_ns"
	eventsKey = "events"
	spansKey  = "spans"
)

func timeNs(timeNs int64) op {
	return val(timeNsKey, timeNs)
}

func events(events int64) op {
	return val(eventsKey, events)
}

func spans(spans int64) op {
	return val(spansKey, spans)
}

var tree1 = tree( // total timeNs=210, events=17, spans=8
	node(1, timeNs(100), events(3), // total timeNs=110, events=6, spans=5
		node(2, timeNs(10), spans(4), // total timeNs=10, events=2, spans=4
			node(3, events(2)), // total events=2
		),
		node(3, events(1), spans(1)), // total events=1, spans=1
	),
	node(2, events(5), // total timeNs=100, events=11, spans=3
		node(2, timeNs(50), spans(3), // total timeNs=100, events=6, spans=3
			node(3, events(4)),             // total events=4
			node(1, timeNs(50), events(2)), // total timeNS=50, events=2
		),
	),
)

// A tree with a Problem at depth 2
var tree2 = tree(
	node(1, timeNs(100),
		node(2, timeNs(200),
			node(errorScopeID, timeNs(300)),
		),
	),
)

func annotatePrefix(stn *SubtreeNode) util.PropertyUpdate {
	return util.If(stn.Prefix, util.StringProperty("prefix", "true"))
}

func annotatePath(stn *SubtreeNode) util.PropertyUpdate {
	ttn := stn.TreeNode.(*testTreeNode)
	path := make([]int64, len(ttn.path))
	for idx, pathEl := range ttn.path {
		path[idx] = int64(pathEl)
	}
	return util.IntegersProperty("path", path...)
}

func annotateTotalWeights(stn *SubtreeNode) util.PropertyUpdate {
	ttn := stn.TreeNode.(*testTreeNode)
	fields := make([]string, 0, len(ttn.totalVals))
	for name := range ttn.totalVals {
		fields = append(fields, name)
	}
	sort.Strings(fields)
	ret := make([]string, len(fields))
	for idx, field := range fields {
		ret[idx] = fmt.Sprintf("%s: %d", field, ttn.totalVals[field])
	}
	return util.StringProperty("total_weights", strings.Join(ret, ", "))
}

func TestWalk(t *testing.T) {
	for _, test := range []struct {
		description   string
		tree          TreeNode
		compare       Compare
		opts          []WalkOption
		nodeCallback  func() NodeCallback
		buildExplicit func(db testutil.TestDataBuilder)
		wantErr       bool
	}{{
		description: "whole tree, ordered by events decreasing",
		tree:        tree1,
		compare:     CompareBy(eventsKey, decreasing),
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
				db.With(
					annotatePath(inputNode),
					annotateTotalWeights(inputNode),
				)
			}
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegersProperty("path"),
				util.StringProperty("total_weights", "events: 17, spans: 8, time_ns: 210"),
			).Child().With(
				util.IntegersProperty("path", 2),
				util.StringProperty("total_weights", "events: 11, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2),
				util.StringProperty("total_weights", "events: 6, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2, 3),
				util.StringProperty("total_weights", "events: 4"),
			).AndChild().With(
				util.IntegersProperty("path", 2, 2, 1),
				util.StringProperty("total_weights", "events: 2, time_ns: 50"),
			).Parent().Parent().AndChild().With( // back to root
				util.IntegersProperty("path", 1),
				util.StringProperty("total_weights", "events: 6, spans: 5, time_ns: 110"),
			).Child().With(
				util.IntegersProperty("path", 1, 2),
				util.StringProperty("total_weights", "events: 2, spans: 4, time_ns: 10"),
			).Child().With(
				util.IntegersProperty("path", 1, 2, 3),
				util.StringProperty("total_weights", "events: 2"),
			).Parent().AndChild().With(
				util.IntegersProperty("path", 1, 3),
				util.StringProperty("total_weights", "events: 1, spans: 1"),
			)
		},
	}, {
		description: "whole tree, ordered by spans increasing",
		tree:        tree1,
		compare:     CompareBy(spansKey, increasing),
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
				db.With(
					annotatePath(inputNode),
					annotateTotalWeights(inputNode),
				)
			}
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegersProperty("path"),
				util.StringProperty("total_weights", "events: 17, spans: 8, time_ns: 210"),
			).Child().With(
				util.IntegersProperty("path", 2),
				util.StringProperty("total_weights", "events: 11, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2),
				util.StringProperty("total_weights", "events: 6, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2, 3), // 2/2/3 and 2/2/1 are tied; the path breaks the tie.
				util.StringProperty("total_weights", "events: 4"),
			).AndChild().With(
				util.IntegersProperty("path", 2, 2, 1),
				util.StringProperty("total_weights", "events: 2, time_ns: 50"),
			).Parent().Parent().AndChild().With( // back to root
				util.IntegersProperty("path", 1),
				util.StringProperty("total_weights", "events: 6, spans: 5, time_ns: 110"),
			).Child().With(
				util.IntegersProperty("path", 1, 3),
				util.StringProperty("total_weights", "events: 1, spans: 1"),
			).AndChild().With(
				util.IntegersProperty("path", 1, 2),
				util.StringProperty("total_weights", "events: 2, spans: 4, time_ns: 10"),
			).Child().With(
				util.IntegersProperty("path", 1, 2, 3),
				util.StringProperty("total_weights", "events: 2"),
			)
		},
	}, {
		description: "top two levels, ordered by events decreasing",
		tree:        tree1,
		compare:     CompareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MaxDepth(2),
		},
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
				db.With(
					annotatePath(inputNode),
					annotateTotalWeights(inputNode),
				)
			}
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegersProperty("path"),
				util.StringProperty("total_weights", "events: 17, spans: 8, time_ns: 210"),
			).Child().With(
				util.IntegersProperty("path", 2),
				util.StringProperty("total_weights", "events: 11, spans: 3, time_ns: 100"),
			).AndChild().With( // back to root
				util.IntegersProperty("path", 1),
				util.StringProperty("total_weights", "events: 6, spans: 5, time_ns: 110"),
			)
		},
	}, {
		description: "top one level from prefix 1/, ordered by events decreasing",
		tree:        tree1,
		compare:     CompareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MaxDepth(1),
			PathPrefix(1),
		},
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
				db.With(
					annotatePath(inputNode),
					annotateTotalWeights(inputNode),
				)
			}
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegersProperty("path"),
				util.StringProperty("total_weights", "events: 17, spans: 8, time_ns: 210"),
			).Child().With(
				util.IntegersProperty("path", 1),
				util.StringProperty("total_weights", "events: 6, spans: 5, time_ns: 110"),
			)
		},
	}, {
		description: "top 4 nodes, ordered by time_ns decreasing",
		tree:        tree1,
		compare:     CompareBy(timeNsKey, decreasing),
		opts: []WalkOption{
			MaxNodes(4),
		},
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
				db.With(
					annotatePath(inputNode),
					annotateTotalWeights(inputNode),
				)
			}
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegersProperty("path"),
				util.StringProperty("total_weights", "events: 17, spans: 8, time_ns: 210"),
			).Child().With(
				util.IntegersProperty("path", 1),
				util.StringProperty("total_weights", "events: 6, spans: 5, time_ns: 110"),
			).AndChild().With(
				util.IntegersProperty("path", 2),
				util.StringProperty("total_weights", "events: 11, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2),
				util.StringProperty("total_weights", "events: 6, spans: 3, time_ns: 100"),
			)
		},
	}, {
		description: "subtree at 2/2, prefix elided, ordered by events increasing",
		tree:        tree1,
		compare:     CompareBy(eventsKey, increasing),
		opts: []WalkOption{
			ElidePrefix(),
			PathPrefix(2, 2),
		},
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
				db.With(
					annotatePath(inputNode),
					annotateTotalWeights(inputNode),
				)
			}
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegersProperty("path"),
				util.StringProperty("total_weights", "events: 17, spans: 8, time_ns: 210"),
			).Child().With(
				util.IntegersProperty("path", 2, 2),
				util.StringProperty("total_weights", "events: 6, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2, 1),
				util.StringProperty("total_weights", "events: 2, time_ns: 50"),
			).AndChild().With(
				util.IntegersProperty("path", 2, 2, 3),
				util.StringProperty("total_weights", "events: 4"),
			)
		},
	}, {
		description: "subtree at 2/2, prefix included, ordered by events increasing",
		tree:        tree1,
		compare:     CompareBy(eventsKey, increasing),
		opts: []WalkOption{
			PathPrefix(2, 2),
		},
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
				db.With(
					annotatePrefix(inputNode),
					annotatePath(inputNode),
					annotateTotalWeights(inputNode),
				)
			}
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.StringProperty("prefix", "true"),
				util.IntegersProperty("path"),
				util.StringProperty("total_weights", "events: 17, spans: 8, time_ns: 210"),
			).Child().With(
				util.StringProperty("prefix", "true"),
				util.IntegersProperty("path", 2),
				util.StringProperty("total_weights", "events: 11, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2),
				util.StringProperty("total_weights", "events: 6, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2, 1),
				util.StringProperty("total_weights", "events: 2, time_ns: 50"),
			).AndChild().With(
				util.IntegersProperty("path", 2, 2, 3),
				util.StringProperty("total_weights", "events: 4"),
			)
		},
	}, {
		description: "custom TreeNode filter dropping node without time_ns, ordered by events decreasing",
		tree:        tree1,
		compare:     CompareBy(eventsKey, decreasing),
		opts: []WalkOption{
			FilterTreeNodes(func(tn TreeNode) bool {
				ttn := tn.(*testTreeNode)
				timeNs, ok := ttn.totalVals[timeNsKey]
				return ok && timeNs != 0
			}),
		},
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
				db.With(
					annotatePath(inputNode),
					annotateTotalWeights(inputNode),
				)
			}
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegersProperty("path"),
				util.StringProperty("total_weights", "events: 17, spans: 8, time_ns: 210"),
			).Child().With(
				util.IntegersProperty("path", 2),
				util.StringProperty("total_weights", "events: 11, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2),
				util.StringProperty("total_weights", "events: 6, spans: 3, time_ns: 100"),
			).Child().With(
				util.IntegersProperty("path", 2, 2, 1),
				util.StringProperty("total_weights", "events: 2, time_ns: 50"),
			).Parent().Parent().AndChild().With( // back to root
				util.IntegersProperty("path", 1),
				util.StringProperty("total_weights", "events: 6, spans: 5, time_ns: 110"),
			).Child().With(
				util.IntegersProperty("path", 1, 2),
				util.StringProperty("total_weights", "events: 2, spans: 4, time_ns: 10"),
			)
		},
	}, {
		description: "whole tree, all nodes at scope 2 elided, ordered by events decreasing",
		tree:        tree1,
		compare:     CompareBy(eventsKey, decreasing),
		opts: []WalkOption{
			ElideTreeNodes(func(tn TreeNode) bool {
				return len(tn.Path()) > 0 && tn.Path()[len(tn.Path())-1] == 2
			}),
		},
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
				db.With(
					annotatePath(inputNode),
					annotateTotalWeights(inputNode),
				)
			}
		},
		// Nodes marked E on the left are elided on the right:
		//     <root>                 <root>
		//     /    \               /    |   \
		//    1      2E            1   2/2/1  2/2/3
		//   / \      \      ->   / \
		//  3   2E     2E        3  2/3
		//       |    /  \
		//       3   1    3
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.IntegersProperty("path"),
				util.StringProperty("total_weights", "events: 17, spans: 8, time_ns: 210"),
			).Child().With(
				util.IntegersProperty("path", 1),
				util.StringProperty("total_weights", "events: 6, spans: 5, time_ns: 110"),
			).Child().With(
				util.IntegersProperty("path", 1, 2, 3),
				util.StringProperty("total_weights", "events: 2"),
			).AndChild().With( // child of 1
				util.IntegersProperty("path", 1, 3),
				util.StringProperty("total_weights", "events: 1, spans: 1"),
			).Parent().Parent(). // back to <ROOT>
						AndChild().With(
				util.IntegersProperty("path", 2, 2, 3),
				util.StringProperty("total_weights", "events: 4"),
			).AndChild().With( // child of <ROOT>
				util.IntegersProperty("path", 2, 2, 1),
				util.StringProperty("total_weights", "events: 2, time_ns: 50"),
			)
		},
	}, {
		description: "error traversing",
		tree:        tree2,
		compare:     CompareBy(timeNsKey, decreasing),
		nodeCallback: func() NodeCallback {
			return func(inputNode *SubtreeNode, db util.DataBuilder) {
			}
		},
		wantErr: true,
	}} {
		t.Run(test.description, func(t *testing.T) {
			subtree, err := Walk(test.tree, test.compare, test.opts...)
			if (err != nil) != test.wantErr {
				t.Errorf("Collection.Subtree yielded unexpected error %v", err)
			}
			if test.wantErr {
				return
			}
			if subtree == nil {
				t.Fatalf("Expected a subtree root, got none")
			}
			if err := testutil.CompareResponses(t, func(db util.DataBuilder) {
				subtree.BuildResponse(db, test.nodeCallback())
			}, test.buildExplicit); err != nil {
				t.Fatalf("encountered unexpected error building the subtree response: %s", err)
			}
		})
	}
}