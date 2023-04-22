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

// Types and functions for traversing weighted trees in 'heaviest-first' order
// -- the next node visited is always the node with the 'highest' total weight
// whose parent has also been visited.
//
// A weighted tree is comprised of TreeNodes, each of which has a path of
// ScopeIDs indicating its location in the tree and a set of child TreeNodes.
// Except for the root TreeNode, each TreeNode has a ScopeID (the last element
// in its path).  TreeNodes must conform to tree constraints:
//   - the root TreeNode's path is empty;
//   - a non-root TreeNode's path must be its parent's path with its own
//     ScopeID appended at the end;
//   - all children of a single TreeNode must have distinct ScopeIDs.
//
// 'Highest' is determined by a provided comparator, and may be arbitrary (and
// of course may actually be 'lowest'.)
//
// Walk(TreeNode, Compare, WalkOptions...) traverses the specified TreeNode in
// 'heaviest-first' order (as determined by the provided Compare function), and
// with the walk limited by the provided WalkOptions.  It returns a slice of
// traversal root SubtreeNodes representing a view on the tree.  Each
// SubtreeNode corresponds to a single TreeNode, and includes that TreeNode and
// its Path, and the SubtreeNode's parent and children.  Note that, due to
// node elision via ElidePrefix and ElideTreeNodes (see below), given a
// SubtreeNode SN corresponding to TreeNode TN, SN's parent and children may not
// correspond to TN's parent and children.
//
// A variety of traversal options are supported, including:
//   - PathPrefix(ids...): specify ids... as a traversal path prefix.  When one
//     or more path prefix is defined, then traversals only begin from
//     specified path prefixes.  If multiple path prefixes are defined, then a
//     prefix tree is constructed from their union, and traversal begins from
//     the leaves of that tree.
//   - ElidePrefix(): elide non-leaf nodes in specified prefixes.  If at least
//     one path prefix is specified and ElidePrefix is not, SubtreeNodes lying
//     within a specified path prefix are returned with Prefix=true.
//   - MaxDepth(n): do not traverse deeper than n nodes from a specified path
//     prefix.
//   - MaxNodes(n): do not return more than n non-prefix nodes.
//   - FilterTreeNodes(func(TreeNode) bool): only traverse nodes for which the
//     specified filter function returns true.
//   - ElideTreeNodes(func(TreeNode) bool): Traverse normally, but only return
//     SubtreeNodes for TreeNodes for which the specified filter function
//     returns true.
//
// Subtrees returned from Walk() may be rapidly constructed into the TraceViz
// data format with SubtreeNode.BuildResponse().
package weightedtree

import (
	"container/heap"
	"fmt"

	"github.com/google/traceviz/server/go/util"
)

// ScopeID is the unique ID of a scope.  The same scope may appear at multiple
// places throughout a tree.
type ScopeID uint

// TreeNode represents a node of a weighted tree.
type TreeNode interface {
	// The path of this node.  It:
	//  * must be empty for the tree root;
	//  * must be unique for all nodes in the tree;
	//  * must, for a child C of parent P, be P.Path() with a single scope ID
	//    appended at the end.  That ScopeID is the node's unique scope ID.
	// During Walk, Path() is cached, so it may be dynamically computed.
	Path() []ScopeID
	// The children of this node with the specified scope IDs.  If no scope IDs
	// are provided, all children should be returned.  Requested scope IDs
	// without corresponding children should just be dropped.
	Children(...ScopeID) ([]TreeNode, error)
}

// Compare compares two arbitrary TreeNodes, returning <0, 0, or >0 if the
// first compares less than, equal to, or greater than the second.  It may
// return an error if some relationship invariant between the two is not met.
type Compare func(a, b TreeNode) (int, error)

// WalkOption specifies an option configuring a tree traversal.
type WalkOption func(wo *walkOptions) error

const unspecifiedOption = -1

// walkOpts assembles a *walkOptions from the provided comparator and set of
// WalkOptions.  Default walk option values are encoded here.
func walkOpts(compare Compare, opts ...WalkOption) (*walkOptions, error) {
	ret := &walkOptions{
		prefixTree:  newPrefixTreeNode(),
		maxDepth:    unspecifiedOption,
		maxNodes:    unspecifiedOption,
		compare:     compare,
		elidePrefix: false,
	}
	for _, opt := range opts {
		if err := opt(ret); err != nil {
			return nil, err
		}
	}
	return ret, nil
}

// PathPrefix specifies a path prefix from which a walk should begin.  If the
// traversal was invoked without ElidePrefix(), the nodes on the prefix path
// are returned, and marked with Prefix=true.  PathPrefix may be specified
// multiple times, in which case the traversal will choose the next largest
// descendant of any specified prefix at each step, but if one specified
// PathPrefix is itself a prefix of another specified PathPrefix, only the more
// specific (=longer) one will apply.  All nodes lying on any specified path
// prefix will be included in the response and marked with Prefix=true, even
// those whose children are not traversed, unless ElidePrefix() is also
// specified.  Defaults to the empty path, i.e., no prefix.
func PathPrefix(path ...ScopeID) WalkOption {
	return func(wo *walkOptions) error {
		wo.prefixTree.addPath(path)
		return nil
	}
}

// MaxDepth specifies the maximum depth (or path length) that a walk may
// traverse, as counted from the most proximate specified prefix (so that
// nodes at different absolute depths may be returned if they have different-
// length prefixes).  Defaults to no limit.
func MaxDepth(maxDepth uint) WalkOption {
	return func(wo *walkOptions) error {
		wo.maxDepth = int(maxDepth)
		return nil
	}
}

// MaxNodes specifies the maximum number of non-prefix nodes that a walk may
// traverse.  Defaults to no limit.
func MaxNodes(maxNodes uint) WalkOption {
	return func(wo *walkOptions) error {
		wo.maxNodes = int(maxNodes)
		return nil
	}
}

// ElidePrefix specifies whether nodes lying on specified prefix paths are
// included in the traversal response.  If not provided, such prefix nodes will
// be included, but will be marked with Prefix=true.  The root is never elided.
// Defaults to true.
func ElidePrefix() WalkOption {
	return func(wo *walkOptions) error {
		wo.elidePrefix = true
		return nil
	}
}

// TreeNodeFilterFunc defines a callback implementing a TreeNode filter, and
// returning true for nodes that satisfy that filter.
type TreeNodeFilterFunc func(TreeNode) bool

// FilterTreeNodes filters the traversal based on a provided TreeNode filter.
// This can be used to dynamically react to viewport size: a TreeNode may
// be constructed using the viewport width in pixels (e.g., as a TraceViz
// DataQuery parameter) and the width of the Tree's root node to ensure that
// only frames that will render at or above a minimum pixel width are returned.
func FilterTreeNodes(f TreeNodeFilterFunc) WalkOption {
	return func(wo *walkOptions) error {
		wo.filterTreeNodeFunc = f
		return nil
	}
}

// ElideTreeNodes elides traversed nodes based on a provided TreeNode filter.
// Elided nodes are traversed normally, but do not result in output
// SubTreeNodes.
func ElideTreeNodes(f TreeNodeFilterFunc) WalkOption {
	return func(wo *walkOptions) error {
		wo.elideTreeNodeFunc = f
		return nil
	}
}

// SubtreeNode is a node on a traversal subtree returned by Walk.  Every
// SubtreeNode corresponds directly to a TreeNode, which it includes as a
// member field.
type SubtreeNode struct {
	// Parent is set to this node's parent SubtreeNode.  It is nil if this
	// SubtreeNode corresponds to a root TreeNode, and may be nil for
	// SubtreeNodes corresponding to non-root TreeNodes, if scopes are elided.
	Parent *SubtreeNode
	// Prefix is true if this SubtreeNode lies within (but not at the leaf of) a
	// traversal prefix path as specified by PrefixPath().  If the traversal
	// options include ElidePrefix(), prefix nodes are elided.
	Prefix bool
	// Path is set to this node's full path.  It is empty if this SubtreeNode
	// corresponds to the tree root.
	Path []ScopeID
	// The TreeNode corresponding to this SubtreeNode.
	TreeNode TreeNode
	// The children of this SubtreeNode.
	Children []*SubtreeNode
}

// NodeCallback describes a callback invoked on each SubtreeNode in an
// invocation of SubtreeNode.BuildResponse.
type NodeCallback func(inputNode *SubtreeNode, outputNode util.DataBuilder)

// BuildResponse builds a TraceViz response tree mirroring the subtree rooted
// at the receiver, with the provided DataBuilder representing the receiver.
// BuildResponse assembles the structure of the tree but sets no properties;
// instead, node properties (and response node children apart from the
// receiver's tree structure) may be set using the supplied callback, which
// is invoked once for every SubtreeNode in the receiver's subtree with that
// SubtreeNode and its corresponding response DataBuilder node.
func (sn *SubtreeNode) BuildResponse(db util.DataBuilder, nodeCallback NodeCallback) {
	if nodeCallback != nil {
		nodeCallback(sn, db)
	}
	for _, child := range sn.Children {
		child.BuildResponse(db.Child(), nodeCallback)
	}
}

// PrefixTreeNode represents a node in the cumulative tree of prefixes defined
// for a given Tree traversal.  A prefixTreeNode is a leaf if it has no
// children.
type prefixTreeNode struct {
	childrenByScopeID map[ScopeID]*prefixTreeNode
}

func newPrefixTreeNode() *prefixTreeNode {
	return &prefixTreeNode{
		childrenByScopeID: map[ScopeID]*prefixTreeNode{},
	}
}

func (ptn *prefixTreeNode) addPath(path []ScopeID) {
	if len(path) == 0 {
		return
	}
	child, ok := ptn.childrenByScopeID[path[0]]
	if !ok {
		child = newPrefixTreeNode()
		ptn.childrenByScopeID[path[0]] = child
	}
	child.addPath(path[1:])
}

func (ptn *prefixTreeNode) descend(path []ScopeID) (*prefixTreeNode, int) {
	if len(path) == 0 {
		return ptn, 0
	}
	if child, ok := ptn.childrenByScopeID[path[0]]; ok {
		leaf, leafDepth := child.descend(path[1:])
		return leaf, leafDepth + 1
	}
	return nil, 0
}

func (ptn *prefixTreeNode) onPrefix() bool {
	return ptn != nil && len(ptn.childrenByScopeID) > 0
}

func (ptn *prefixTreeNode) children() []ScopeID {
	if ptn == nil {
		return nil
	}
	ret := make([]ScopeID, 0, len(ptn.childrenByScopeID))
	for scopeID := range ptn.childrenByScopeID {
		ret = append(ret, scopeID)
	}
	return ret
}

type walkOptions struct {
	// The root of this walk's defined prefix tree.
	prefixTree         *prefixTreeNode
	maxDepth           int // If unspecifiedOption, no max depth.
	maxNodes           int // If unspecifiedOption, no max node count.
	compare            Compare
	elidePrefix        bool
	filterTreeNodeFunc TreeNodeFilterFunc
	elideTreeNodeFunc  TreeNodeFilterFunc
}

// An entry in the heaviest-first heap used for tree traversal.
type heapEntry struct {
	// The path is cached from tn.Path.
	path []ScopeID
	// The output SubtreeNode which should parent any SubtreeNode produced by
	// visit().  May be nil for root response nodes.
	parent *SubtreeNode
	// The tree node to visit with this heapEntry.
	tn TreeNode
}

func newHeapEntry(tn TreeNode, wo *walkOptions, parent *SubtreeNode) *heapEntry {
	return &heapEntry{
		path:   tn.Path(),
		parent: parent,
		tn:     tn,
	}
}

// visit visits the receiving heapEntry, possibly returning a SubtreeNode for
// inclusion in the top-level walk response, and possibly returning a set of
// child heapEntries that may be subsequently visited.
func (he *heapEntry) visit(wo *walkOptions) (subtreeNode *SubtreeNode, childEntries []*heapEntry, err error) {
	// Skip this node if its scope or total weight are filtered out.
	if wo.filterTreeNodeFunc != nil {
		if !wo.filterTreeNodeFunc(he.tn) {
			return nil, nil, nil
		}
	}
	parent := he.parent
	// Determine if this node lies on a specified path prefix.
	prefixNode, prefixDepth := wo.prefixTree.descend(he.path)
	onPrefix := prefixNode.onPrefix()
	// Elide this node from the subtree if it's on the path prefix and prefix
	// nodes should not be included.  The root is never elided.
	elided := wo.elidePrefix && onPrefix && parent != nil
	// ...or if an elided scope ID filter was defined and this node's scope is
	// filtered out.
	elided = elided || (wo.elideTreeNodeFunc != nil && wo.elideTreeNodeFunc(he.tn))
	// If this node isn't elided, spit it out.
	if !elided {
		subtreeNode = &SubtreeNode{
			Parent:   parent,
			Path:     he.path,
			Prefix:   onPrefix,
			TreeNode: he.tn,
		}
		if he.parent != nil {
			he.parent.Children = append(he.parent.Children, subtreeNode)
		}
		parent = subtreeNode
	}
	// Add this node's children to the heap.
	//
	// Only return children to potentially traverse if no max depth is specified,
	// or if the current depth, as counted from the most proximate prefix node,
	// is still under the max depth.
	if wo.maxDepth == unspecifiedOption || onPrefix || len(he.path)-prefixDepth+1 < wo.maxDepth {
		var children []TreeNode
		var err error
		// If this entry is on a path prefix, only add the children that lie on
		// that prefix to the heap.  Otherwise, add them all.
		if onPrefix {
			for _, childScopeID := range prefixNode.children() {
				child, err := he.tn.Children(childScopeID)
				if err != nil {
					return nil, nil, err
				}
				if len(child) == 1 {
					children = append(children, child[0])
				}
			}
		} else {
			children, err = he.tn.Children()
			if err != nil {
				return nil, nil, err
			}
		}
		for _, child := range children {
			childEntries = append(childEntries, newHeapEntry(child, wo, parent))
		}
	}
	return subtreeNode, childEntries, nil
}

// walkHeap implements heap.Heap for heapEntry entries.
type walkHeap struct {
	wo      *walkOptions
	entries []*heapEntry
}

func (wh *walkHeap) Len() int {
	return len(wh.entries)
}

// Although Heap calls this 'Less', since we're performing a heaviest-first
// traversal, we treat it as 'Greater'.
func (wh *walkHeap) Less(i, j int) bool {
	ei, ej := wh.entries[i], wh.entries[j]
	cmp, err := wh.wo.compare(ei.tn, ej.tn)
	if err != nil {
		panic("failed to compare walkHeap entries: " + err.Error())
	}
	return cmp > 0
}

func (wh *walkHeap) Swap(i, j int) {
	wh.entries[i], wh.entries[j] = wh.entries[j], wh.entries[i]
}

func (wh *walkHeap) Push(e any) {
	wh.entries = append(wh.entries, e.(*heapEntry))
}

func (wh *walkHeap) Pop() any {
	n := len(wh.entries)
	ret := wh.entries[n-1]
	wh.entries = wh.entries[:n-1]
	return ret
}

// Walk returns the subtree of tree rooted at the provided TreeNode, traversed
// with the provided walk options.  The entire traversed subtree, modulo prefix
// nodes (if ElidePrefix is specified) and any nodes elided by ElideScopeIDs,
// is constructed and returned, so Walk is unsuitable for very large
// traversals; it should return visualizable quantities of data.  Note that
// zero SubtreeNodes may be returned if all TreeNodes are filtered out, and
// more than one SubtreeNodes may be returned if TreeNodes are elided.  An
// invocation of Walk with no nodes elided or filtered out will always return
// a slice containing one SubtreeNode, corresponding to the provided TreeNode.
//
// Walk is thread-compatible; if Path() and Children() are thread-safe for tn
// and all its descendants, Walk is thread-safe.
func Walk(tn TreeNode, compare Compare, opts ...WalkOption) (*SubtreeNode, error) {
	wo, err := walkOpts(compare, opts...)
	if err != nil {
		return nil, err
	}
	wh := &walkHeap{
		wo: wo,
	}
	heap.Init(wh)
	heap.Push(wh, newHeapEntry(tn, wo, nil))
	var ret *SubtreeNode
	addedNonPrefixNodes := 0
	for wh.Len() > 0 && (wo.maxNodes == unspecifiedOption || addedNonPrefixNodes < wo.maxNodes) {
		entry := heap.Pop(wh).(*heapEntry)
		subtreeNode, childEntries, err := entry.visit(wo)
		if err != nil {
			return nil, err
		}
		if subtreeNode != nil {
			if entry.parent == nil {
				if ret != nil {
					return nil, fmt.Errorf("Walk() found multiple root nodes")
				}
				// The toplevel response only includes parentless subtree nodes.
				ret = subtreeNode
			}
			if !subtreeNode.Prefix {
				addedNonPrefixNodes++
			}
		}
		for _, childEntry := range childEntries {
			heap.Push(wh, childEntry)
		}
	}
	return ret, nil
}