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
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
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

func compareBy(valName string, decreasing bool) CompareFn {
	return func(a, b Comparable) (int, error) {
		var aSum, bSum int64
		for _, tn := range a.TreeNodes {
			ttn, ok := tn.(*testTreeNode)
			if !ok {
				return 0, fmt.Errorf("can only compare *testTreeNodes")
			}
			aSum += ttn.totalVals[valName]
		}
		for _, tn := range b.TreeNodes {
			ttn, ok := tn.(*testTreeNode)
			if !ok {
				return 0, fmt.Errorf("can only compare *testTreeNodes")
			}
			bSum += ttn.totalVals[valName]
		}
		diff := int(aSum - bSum)
		if diff == 0 {
			// For testing, CompareBy should be deterministic.  If equal, the path
			// breaks the tie.
			pathLenDiff := len(a.Path) - len(b.Path)
			if pathLenDiff != 0 {
				return pathLenDiff, nil
			}
			// The paths are the same length.  Use the path elements to decide.
			for idx := 0; idx < len(a.Path); idx++ {
				pathElDiff := a.Path[idx] - b.Path[idx]
				if pathElDiff != 0 {
					return int(pathElDiff), nil
				}
			}
		}
		if decreasing {
			return diff, nil
		}
		return -diff, nil
	}
}

func pathAsString(path []ScopeID) string {
	ret := make([]string, len(path))
	for idx, scopeID := range path {
		ret[idx] = strconv.Itoa(int(scopeID))
	}
	return "/" + strings.Join(ret, "/")
}

func prettyPrintTreeNode(tn TreeNode, isMergedRoot bool) string {
	path := tn.Path()
	if isMergedRoot {
		// Merged subtree roots
		mergePoint := len(path) - 1
		return pathAsString(path[:mergePoint]) + " < " + pathAsString(path[mergePoint:])
	}
	return pathAsString(path)
}

func prettyPrintSubtreeNode(t *testing.T, stn *SubtreeNode, indent string) string {
	t.Helper()
	if stn == nil {
		return "<nil>"
	}
	var totalTimeNs, totalEvents, totalSpans int64
	var hasTotalTimeNs, hasEvents, hasSpans bool
	for _, tn := range stn.TreeNodes {
		tn, ok := tn.(*testTreeNode)
		if !ok {
			t.Fatalf("expected *testTreeNode, but didn't get it")
		}
		v, ok := tn.totalVals[timeNsKey]
		if ok {
			hasTotalTimeNs = true
		}
		totalTimeNs += v
		v, ok = tn.totalVals[eventsKey]
		if ok {
			hasEvents = true
		}
		totalEvents += v
		v, ok = tn.totalVals[spansKey]
		if ok {
			hasSpans = true
		}
		totalSpans += v
	}
	weights := []string{}
	if hasTotalTimeNs {
		weights = append(weights, fmt.Sprintf("%s", time.Duration(totalTimeNs)*time.Nanosecond))
	}
	if hasEvents {
		weights = append(weights, fmt.Sprintf("%de", totalEvents))
	}
	if hasSpans {
		weights = append(weights, fmt.Sprintf("%ds", totalSpans))
	}
	prefix := ""
	if stn.Prefix {
		prefix = " (prefix)"
	}
	ret := []string{
		indent + pathAsString(stn.Path) +
			fmt.Sprintf(" (%s)%s:", strings.Join(weights, ", "), prefix),
	}
	otnPaths := make([]string, len(stn.TreeNodes))
	for idx, tn := range stn.TreeNodes {
		otnPaths[idx] = prettyPrintTreeNode(tn, (len(stn.Path) == 0 && len(stn.TreeNodes) > 1))
	}
	sort.Strings(otnPaths)
	ret = append(ret,
		indent+"  ["+strings.Join(otnPaths, ", ")+"]",
	)
	for _, child := range stn.Children {
		ret = append(ret, prettyPrintSubtreeNode(t, child, indent+"  "))
	}
	return strings.Join(ret, "\n")
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

// A very mergeable tree.
var tree3 = tree(
	node(1, timeNs(10), // total time 300ns
		node(2, timeNs(20), // total time 90ns
			node(3, timeNs(30), // total time 70ns
				node(4, timeNs(40)), // total time 40ns
			),
		),
		node(1, timeNs(10), // total time 200ns
			node(2, timeNs(20), // total time 90ns
				node(3, timeNs(30), // total time 70ns
					node(4, timeNs(40)), // total time 40ns
				),
			),
			node(1, timeNs(10), // total time 100ns
				node(2, timeNs(20), // total time 90ns
					node(3, timeNs(30), // total time 70ns
						node(4, timeNs(40)), // total time 40ns
					),
				),
			),
		),
	),
)

func TestWalk(t *testing.T) {
	for _, test := range []struct {
		description     string
		tree            TreeNode
		compare         CompareFn
		opts            []WalkOption
		wantPrettyPrint string
		wantErr         bool
	}{{
		description: "whole tree, ordered by events decreasing",
		tree:        tree1,
		compare:     compareBy(eventsKey, decreasing),
		wantPrettyPrint: `
/ (210ns, 17e, 8s):
  [/]
  /2 (100ns, 11e, 3s):
    [/2]
    /2/2 (100ns, 6e, 3s):
      [/2/2]
      /2/2/3 (4e):
        [/2/2/3]
      /2/2/1 (50ns, 2e):
        [/2/2/1]
  /1 (110ns, 6e, 5s):
    [/1]
    /1/2 (10ns, 2e, 4s):
      [/1/2]
      /1/2/3 (2e):
        [/1/2/3]
    /1/3 (1e, 1s):
      [/1/3]`,
	}, {
		description: "whole tree, ordered by spans increasing",
		tree:        tree1,
		compare:     compareBy(spansKey, increasing),
		wantPrettyPrint: `
/ (210ns, 17e, 8s):
  [/]
  /2 (100ns, 11e, 3s):
    [/2]
    /2/2 (100ns, 6e, 3s):
      [/2/2]
      /2/2/3 (4e):
        [/2/2/3]
      /2/2/1 (50ns, 2e):
        [/2/2/1]
  /1 (110ns, 6e, 5s):
    [/1]
    /1/3 (1e, 1s):
      [/1/3]
    /1/2 (10ns, 2e, 4s):
      [/1/2]
      /1/2/3 (2e):
        [/1/2/3]`,
	}, {
		description: "top two levels, ordered by events decreasing",
		tree:        tree1,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MaxDepth(2),
		},
		wantPrettyPrint: `
/ (210ns, 17e, 8s):
  [/]
  /2 (100ns, 11e, 3s):
    [/2]
  /1 (110ns, 6e, 5s):
    [/1]`,
	}, {
		description: "top one level from prefix 1/, ordered by events decreasing",
		tree:        tree1,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MaxDepth(1),
			PathPrefix(1),
		},
		wantPrettyPrint: `
/ (210ns, 17e, 8s) (prefix):
  [/]
  /1 (110ns, 6e, 5s):
    [/1]`,
	}, {
		description: "top 4 nodes, ordered by time_ns decreasing",
		tree:        tree1,
		compare:     compareBy(timeNsKey, decreasing),
		opts: []WalkOption{
			MaxNodes(4),
		},
		wantPrettyPrint: `
/ (210ns, 17e, 8s):
  [/]
  /1 (110ns, 6e, 5s):
    [/1]
  /2 (100ns, 11e, 3s):
    [/2]
    /2/2 (100ns, 6e, 3s):
      [/2/2]`,
	}, {
		description: "subtree at 2/2, prefix elided, ordered by events increasing",
		tree:        tree1,
		compare:     compareBy(eventsKey, increasing),
		opts: []WalkOption{
			ElidePrefix(),
			PathPrefix(2, 2),
		},
		wantPrettyPrint: `
/ (210ns, 17e, 8s) (prefix):
  [/]
  /2 (100ns, 6e, 3s):
    [/2/2]
    /2/1 (50ns, 2e):
      [/2/2/1]
    /2/3 (4e):
      [/2/2/3]`,
	}, {
		description: "subtree at 2/2, prefix included, ordered by events increasing",
		tree:        tree1,
		compare:     compareBy(eventsKey, increasing),
		opts: []WalkOption{
			PathPrefix(2, 2),
		},
		wantPrettyPrint: `
/ (210ns, 17e, 8s) (prefix):
  [/]
  /2 (100ns, 11e, 3s) (prefix):
    [/2]
    /2/2 (100ns, 6e, 3s):
      [/2/2]
      /2/2/1 (50ns, 2e):
        [/2/2/1]
      /2/2/3 (4e):
        [/2/2/3]`,
	}, {
		description: "custom TreeNode filter dropping node without time_ns, ordered by events decreasing",
		tree:        tree1,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			FilterTreeNodes(func(tn TreeNode) bool {
				ttn := tn.(*testTreeNode)
				timeNs, ok := ttn.totalVals[timeNsKey]
				return ok && timeNs != 0
			}),
		},
		wantPrettyPrint: `
/ (210ns, 17e, 8s):
  [/]
  /2 (100ns, 11e, 3s):
    [/2]
    /2/2 (100ns, 6e, 3s):
      [/2/2]
      /2/2/1 (50ns, 2e):
        [/2/2/1]
  /1 (110ns, 6e, 5s):
    [/1]
    /1/2 (10ns, 2e, 4s):
      [/1/2]`,
	}, {
		description: "whole tree, all nodes at scope 2 elided, ordered by events decreasing",
		tree:        tree1,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			ElideTreeNodes(func(tn TreeNode) bool {
				return len(tn.Path()) > 0 && tn.Path()[len(tn.Path())-1] == 2
			}),
		},
		// Nodes marked E on the left are elided on the right:
		//     <root>                       <root>
		//     /    \                    /        \
		//    1      2E          1 [1, 2/2/1]   3 [2/2/3]
		//   / \      \      ->       |
		//  3   2E     2E        3 [1/2/3, 1/3]
		//       |    /  \
		//       3   1    3
		wantPrettyPrint: `
/ (210ns, 17e, 8s):
  [/]
  /1 (160ns, 8e, 5s):
    [/1, /2/2/1]
    /1/3 (3e, 1s):
      [/1/2/3, /1/3]
  /3 (4e):
    [/2/2/3]`,
	}, {
		description: "error traversing",
		tree:        tree2,
		compare:     compareBy(timeNsKey, decreasing),
		wantErr:     true,
	}, {
		description: "whole tree1 merged at /1/2 and /2",
		tree:        tree1,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MergePrefix(1, 2),
			MergePrefix(2),
		},
		wantPrettyPrint: `
/ (110ns, 13e, 7s):
  [/ < /2, /1 < /2]
  /2 (110ns, 13e, 7s):
    [/1/2, /2]
    /2/2 (100ns, 6e, 3s):
      [/2/2]
      /2/2/3 (4e):
        [/2/2/3]
      /2/2/1 (50ns, 2e):
        [/2/2/1]
    /2/3 (2e):
      [/1/2/3]`,
	}, {
		description: "whole tree3 merged at /1/2, /1/1/2, and /1/1/1/2, max depth 2",
		tree:        tree3,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MergePrefix(1, 2),
			MergePrefix(1, 1, 2),
			MergePrefix(1, 1, 1, 2),
			MaxDepth(2),
		},
		wantPrettyPrint: `
/ (270ns):
  [/1 < /2, /1/1 < /2, /1/1/1 < /2]
  /2 (270ns):
    [/1/1/1/2, /1/1/2, /1/2]
    /2/3 (210ns):
      [/1/1/1/2/3, /1/1/2/3, /1/2/3]`,
	}, {
		description: "whole tree3 merged at /1/2, /1/1/2, and /1/1/1/2, prefix 2/3",
		tree:        tree3,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MergePrefix(1, 2),
			MergePrefix(1, 1, 2),
			MergePrefix(1, 1, 1, 2),
			PathPrefix(2, 3),
		},
		wantPrettyPrint: `
/ (270ns) (prefix):
  [/1 < /2, /1/1 < /2, /1/1/1 < /2]
  /2 (270ns) (prefix):
    [/1/1/1/2, /1/1/2, /1/2]
    /2/3 (210ns):
      [/1/1/1/2/3, /1/1/2/3, /1/2/3]
      /2/3/4 (120ns):
        [/1/1/1/2/3/4, /1/1/2/3/4, /1/2/3/4]`,
	}, {
		description: "whole tree3 merged at /1/2, /1/1/2, and /1/1/1/2, elide '3' nodes",
		tree:        tree3,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MergePrefix(1, 2),
			MergePrefix(1, 1, 2),
			MergePrefix(1, 1, 1, 2),
			ElideTreeNodes(func(tn TreeNode) bool {
				path := tn.Path()
				return path[len(path)-1] == 3
			}),
		},
		wantPrettyPrint: `
/ (270ns):
  [/1 < /2, /1/1 < /2, /1/1/1 < /2]
  /2 (270ns):
    [/1/1/1/2, /1/1/2, /1/2]
    /2/4 (120ns):
      [/1/1/1/2/3/4, /1/1/2/3/4, /1/2/3/4]`,
	}, {
		description: "whole tree3 merged at /1/2, /1/1/2, and /1/1/1/2, filter out node 1/1/2/3.",
		tree:        tree3,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MergePrefix(1, 2),
			MergePrefix(1, 1, 2),
			MergePrefix(1, 1, 1, 2),
			FilterTreeNodes(func(tn TreeNode) bool {
				path := tn.Path()
				diff := cmp.Diff(path, []ScopeID{1, 1, 2, 3})
				return diff != ""
			}),
		},
		wantPrettyPrint: `
/ (270ns):
  [/1 < /2, /1/1 < /2, /1/1/1 < /2]
  /2 (270ns):
    [/1/1/1/2, /1/1/2, /1/2]
    /2/3 (140ns):
      [/1/1/1/2/3, /1/2/3]
      /2/3/4 (80ns):
        [/1/1/1/2/3/4, /1/2/3/4]`,
	}, {
		description: "whole tree3 merged at /1, /1/1, and /1/1/1 (merging includes ancestors)",
		tree:        tree3,
		compare:     compareBy(eventsKey, decreasing),
		opts: []WalkOption{
			MergePrefix(1),
			MergePrefix(1, 1),
			MergePrefix(1, 1, 1),
			FilterTreeNodes(func(tn TreeNode) bool {
				path := tn.Path()
				diff := cmp.Diff(path, []ScopeID{1, 1, 2, 3})
				return diff != ""
			}),
		},
		wantPrettyPrint: `
/ (300ns):
  [/1]
  /1 (300ns):
    [/1]
    /1/2 (90ns):
      [/1/2]
      /1/2/3 (70ns):
        [/1/2/3]
        /1/2/3/4 (40ns):
          [/1/2/3/4]
    /1/1 (200ns):
      [/1/1]
      /1/1/2 (90ns):
        [/1/1/2]
      /1/1/1 (100ns):
        [/1/1/1]
        /1/1/1/2 (90ns):
          [/1/1/1/2]
          /1/1/1/2/3 (70ns):
            [/1/1/1/2/3]
            /1/1/1/2/3/4 (40ns):
              [/1/1/1/2/3/4]`,
	}} {
		t.Run(test.description, func(t *testing.T) {
			gotSubtree, err := Walk(test.tree, test.compare, test.opts...)
			if (err != nil) != test.wantErr {
				t.Fatalf("Collection.Subtree yielded unexpected error %v", err)
			}
			if test.wantErr {
				return
			}
			gotPrettyPrint := "\n" + prettyPrintSubtreeNode(t, gotSubtree, "")
			if diff := cmp.Diff(test.wantPrettyPrint, gotPrettyPrint); diff != "" {
				t.Errorf("got tree\n%s\ndiff (-want +got) %s", gotPrettyPrint, diff)
			}
		})
	}
}
