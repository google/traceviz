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
	"slices"
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
	// During Walk, Path() is cached, so it may be dynamically computed, but it
	// is best for it not to be too expensive.
	Path() []ScopeID
	// The children of this node with the specified scope IDs.  If no scope IDs
	// are provided, all children should be returned.  Requested scope IDs
	// without corresponding children should just be dropped.
	Children(...ScopeID) ([]TreeNode, error)
}

// Comparable describes a comparable argument to CompareFn.
type Comparable struct {
	// The path of the associated SubtreeNode, if one is generated in the
	// traversal.  This can be used to break comparison ties or to index
	// cached weight values.
	Path []ScopeID
	// The set of TreeNodes of the associated SubtreeNode, if one is generated in
	// the traversal.
	TreeNodes []TreeNode
}

// CompareFn compares two items, returning <0, 0, or >0 if the first compares
// less than, equal to, or greater than the second.  It may return an error if
// some relationship invariant between the two is not met.
type CompareFn func(a, b Comparable) (int, error)

// WalkOption specifies an option configuring a tree traversal.
type WalkOption func(wo *walkOptions) error

const unspecifiedOption = -1

// walkOpts assembles a *walkOptions from the provided comparator and set of
// WalkOptions.  Default walk option values are encoded here.
func walkOpts(opts ...WalkOption) (*walkOptions, error) {
	ret := &walkOptions{
		maxDepth:    unspecifiedOption,
		maxNodes:    unspecifiedOption,
		elidePrefix: false,
	}
	for _, opt := range opts {
		if err := opt(ret); err != nil {
			return nil, err
		}
	}
	return ret, nil
}

// MergePrefix specifies a path to a TreeNode which should be part of the
// returned subtree's root node.  This may be provided multiple times, defining
// a merge prefix tree: all leaves in that tree will be unioned into the
// returned subtree's root, and their descendants will be merged by common path
// suffix from the merge prefix tree.  Specifying more than one MergePrefix may
// result in returned SubtreeNodes with more than one TreeNode.
func MergePrefix(path ...ScopeID) WalkOption {
	return func(wo *walkOptions) error {
		if wo.mergePrefixTree == nil {
			wo.mergePrefixTree = newPrefixTreeNode()
		}
		wo.mergePrefixTree.addPath(path, false /* leaves cannot have children */)
		return nil
	}
}

// PathPrefix specifies a path from which heaviest-first traversal should
// begin.  This may be provided multiple times to specify a prefix tree: nodes
// within that tree are visited on the traversal, but non-leaf prefix tree
// nodes (which are marked with Prefix=true) only visit their children on the
// prefix tree.  Defaults to an empty prefix tree.
func PathPrefix(path ...ScopeID) WalkOption {
	return func(wo *walkOptions) error {
		if wo.pathPrefixTree == nil {
			wo.pathPrefixTree = newPrefixTreeNode()
		}
		wo.pathPrefixTree.addPath(path, true /* leaves can have children */)
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
// returning true for nodes that satisfy that filter and should be omitted
// during traversal.
type TreeNodeFilterFunc func(TreeNode) bool

// FilterTreeNodes filters the traversal based on a provided TreeNode filter:
// TreeNodes for which the provided function returns false, and any descendant
// of such TreeNodes, are not included in the traversal.
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

// ElideTreeNodes elides traversed nodes based on a provided TreeNode filter:
// TreeNodes for which the provided function returns true are elided, and are
// traversed normally, but do not result in output SubTreeNodes.
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
	// The TreeNodes corresponding to this SubtreeNode.  Only traversals with
	// non-empty merge prefix trees (MergePrefix()) or those that elide TreeNodes
	// (ElideTreeNodes()) can have more than one TreeNode per SubtreeNode.
	TreeNodes []TreeNode
	// The children of this SubtreeNode.
	Children []*SubtreeNode
}

// A node in the cumulative tree of prefixes defined for a given tree
// traversal.  A prefixTreeNode is a leaf if it has no children.
type prefixTreeNode struct {
	childrenByScopeID map[ScopeID]*prefixTreeNode
	isLeaf            bool
}

func newPrefixTreeNode() *prefixTreeNode {
	return &prefixTreeNode{
		childrenByScopeID: map[ScopeID]*prefixTreeNode{},
	}
}

func (ptn *prefixTreeNode) addPath(path []ScopeID, pathLeavesCanHaveChildren bool) {
	if len(path) == 0 {
		ptn.isLeaf = true
		if !pathLeavesCanHaveChildren {
			ptn.childrenByScopeID = map[ScopeID]*prefixTreeNode{}
		}
		return
	}
	if !pathLeavesCanHaveChildren && ptn.isLeaf {
		return
	}
	child, ok := ptn.childrenByScopeID[path[0]]
	if !ok {
		child = newPrefixTreeNode()
		ptn.childrenByScopeID[path[0]] = child
	}
	child.addPath(path[1:], pathLeavesCanHaveChildren)
}

func (ptn *prefixTreeNode) descend(path ...ScopeID) (*prefixTreeNode, int) {
	if len(path) == 0 {
		return ptn, 0
	}
	if ptn != nil {
		if child, ok := ptn.childrenByScopeID[path[0]]; ok {
			leaf, leafDepth := child.descend(path[1:]...)
			return leaf, leafDepth + 1
		}
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
	// The root of this walk's defined prefix tree.  Nil if there is no prefix
	// tree; default nil.
	pathPrefixTree *prefixTreeNode
	// The root of this walk's defined merge tree.  Nil if there is no merge
	// tree; default nil.
	mergePrefixTree    *prefixTreeNode
	maxDepth           int                // If unspecifiedOption, no max depth.
	maxNodes           int                // If unspecifiedOption, no max node count.
	elidePrefix        bool               // default false.
	filterTreeNodeFunc TreeNodeFilterFunc // default nil.
	elideTreeNodeFunc  TreeNodeFilterFunc // default nil.
}

// An entry in the heaviest-first heap used for tree traversal.
type walkHeapEntry struct {
	Comparable
	// The prefix tree node corresponding to this walkHeapEntry.  Nil if this
	// entry does not lie on the prefix tree.
	prefixTreeNode *prefixTreeNode
	// The output SubtreeNode which should parent any SubtreeNode produced by
	// a visit function.  May be nil for root response nodes.
	parent *SubtreeNode
	// A mapping of child scope ID to corresponding TreeNodes.
	childrenByScopeID map[ScopeID][]TreeNode
}

// walkHeap implements heap.Heap for walkHeapEntry entries.
type walkHeap struct {
	wo      *walkOptions
	compare CompareFn
	entries []*walkHeapEntry
}

func (wh *walkHeap) Len() int {
	return len(wh.entries)
}

// Although Heap calls this 'Less', since we're performing a heaviest-first
// traversal, we treat it as 'Greater'.
func (wh *walkHeap) Less(i, j int) bool {
	ei, ej := wh.entries[i], wh.entries[j]
	cmp, err := wh.compare(ei.Comparable, ej.Comparable)
	if err != nil {
		panic("failed to compare walkHeap entries: " + err.Error())
	}
	return cmp > 0
}

func (wh *walkHeap) Swap(i, j int) {
	wh.entries[i], wh.entries[j] = wh.entries[j], wh.entries[i]
}

func (wh *walkHeap) Push(e any) {
	wh.entries = append(wh.entries, e.(*walkHeapEntry))
}

func (wh *walkHeap) Pop() any {
	n := len(wh.entries)
	ret := wh.entries[n-1]
	wh.entries = wh.entries[:n-1]
	return ret
}

// children returns a mapping of the receiver's children: child scope ID to
// child TreeNodes.  The provided walkOptions are used to filter and elide
// TreeNodes.
func (whe *walkHeapEntry) children(wo *walkOptions) (map[ScopeID][]TreeNode, error) {
	if whe.childrenByScopeID != nil {
		return whe.childrenByScopeID, nil
	}
	whe.childrenByScopeID = map[ScopeID][]TreeNode{}
	for _, tn := range whe.TreeNodes {
		childTNs, err := treeNodeChildren(whe.prefixTreeNode, tn, wo)
		if err != nil {
			return nil, err
		}
		for _, childTN := range childTNs {
			path := childTN.Path()
			scopeID := path[len(path)-1]
			whe.childrenByScopeID[scopeID] = append(whe.childrenByScopeID[scopeID], childTN)
		}
	}
	return whe.childrenByScopeID, nil
}

// treeNodeChildren creates and returns a set of child TreeNodes from the
// provided TreeNode, with filtering and elision from the provided walkOptions
// applied.  It is not idempotent; multiple calls will return new child
// instances.
func treeNodeChildren(ptn *prefixTreeNode, tn TreeNode, wo *walkOptions) ([]TreeNode, error) {
	var children []TreeNode
	if ptn.onPrefix() {
		for _, childScopeID := range ptn.children() {
			child, err := tn.Children(childScopeID)
			if err != nil {
				return nil, err
			}
			if len(child) == 1 {
				children = append(children, child[0])
			}
		}
	} else {
		var err error
		children, err = tn.Children()
		if err != nil {
			return nil, err
		}
	}
	ret := make([]TreeNode, 0, len(children))
	for _, childTN := range children {
		filteredIn := wo.filterTreeNodeFunc == nil || wo.filterTreeNodeFunc(childTN)
		elided := (wo.elideTreeNodeFunc != nil && wo.elideTreeNodeFunc(childTN))
		if !filteredIn {
			// Stop traversing here.
		} else if elided {
			// Replace this elided TreeNode with its children.
			elidedChildren, err := treeNodeChildren(ptn, childTN, wo)
			if err != nil {
				return nil, err
			}
			ret = append(ret, elidedChildren...)
		} else {
			// Add this non-filtered-out, non-elided node to children.
			ret = append(ret, childTN)
		}
	}
	return ret, nil
}

func newWalkHeapRoot(prefixTreeNode *prefixTreeNode, tns []TreeNode) *walkHeapEntry {
	return &walkHeapEntry{
		Comparable: Comparable{
			TreeNodes: tns,
		},
		prefixTreeNode: prefixTreeNode,
	}
}

func newWalkHeapEntry(parentPrefixTreeNode *prefixTreeNode, scopeID ScopeID, tns []TreeNode, parent *SubtreeNode) *walkHeapEntry {
	var path []ScopeID
	if parent != nil {
		path = slices.Clone(parent.Path)
	}
	path = append(path, scopeID)
	ptn, _ := parentPrefixTreeNode.descend(scopeID)
	return &walkHeapEntry{
		Comparable: Comparable{
			Path:      path,
			TreeNodes: tns,
		},
		prefixTreeNode: ptn,
		parent:         parent,
	}
}

// visit visits the receiver, possibly returning a SubtreeNode for inclusion
// in the returned subtree, and returning a set of child walkHeapEntries that
// may be subsequently visited.
func (whe *walkHeapEntry) visit(wo *walkOptions) (subtreeNode *SubtreeNode, childEntries []*walkHeapEntry, err error) {
	// Skip this node if its depth, past any prefix, is greater than the max.
	depthBelowPrefix := 1
	for cursor := whe.parent; cursor != nil; cursor = cursor.Parent {
		if cursor.Prefix {
			break
		}
		depthBelowPrefix++
	}
	if wo.maxDepth != unspecifiedOption && depthBelowPrefix > wo.maxDepth {
		return nil, nil, nil
	}
	// If this node isn't a prefix, or prefix nodes aren't elided, include it in
	// the returned subtree.  Never elide the root.
	if whe.prefixTreeNode == nil || !wo.elidePrefix || !whe.prefixTreeNode.onPrefix() || whe.parent == nil {
		subtreeNode = &SubtreeNode{
			Parent:    whe.parent,
			Path:      whe.Path,
			TreeNodes: whe.TreeNodes,
			Prefix:    whe.prefixTreeNode != nil && whe.prefixTreeNode.onPrefix(),
		}
		if whe.parent != nil {
			whe.parent.Children = append(whe.parent.Children, subtreeNode)
		}
	} else {
		// If it is a prefix and we're eliding prefixes, don't include it in the
		// returned subtree, and return its parent SubtreeNode instead.
		subtreeNode = whe.parent
	}
	// Build a heap entry for every set of child TreeNodes.  TreeNode filtering
	// and elision via FilterTreeNodes and ElideTreeNodes is handled within
	// this call to children().
	children, err := whe.children(wo)
	if err != nil {
		return nil, nil, err
	}
	childEntries = make([]*walkHeapEntry, 0, len(children))
	for scopeID, child := range children {
		childEntries = append(childEntries, newWalkHeapEntry(whe.prefixTreeNode, scopeID, child, subtreeNode))
	}
	return subtreeNode, childEntries, nil
}

// Walk traverses the tree rooted at the provided root node, returning the root
// node of the traversed top-down subtree.  The traversal algorithm is
// 'heaviest-first': at each step of the traversal, the 'heaviest' candidate
// node (as determined by the provided CompareFn) is visited next.
//
// The traversal can be tuned with the provided WalkOptions:
//   - MaxDepth specifies the maximum depth, past any prefix, to traverse.
//   - MaxNodes specifies the maximum number of nodes, not including prefix
//     nodes, to traverse.
//   - ElidePrefix specifies that prefix nodes should be elided from the
//     returned subtree.  The root is never elided.
//   - FilterTreeNodes specifies a TreeNode-filtering function applied to every
//     TreeNode during traversal; TreeNodes for which this function returns
//     false are not visited.
//   - ElideTreeNodes specifies a TreeNode-filtering function applied to every
//     TreeNode during traversal; TreeNodes for which this function returns true
//     are not included in the returned subtree (but are traversed, and their
//     descendants may appear in it).  Specifying ElideTreeNodes may result in
//     returned SubtreeNodes with more than one TreeNode.
//   - PathPrefix specifies a path from which heaviest-first traversal should
//     begin.  This may be provided multiple times to specify a prefix tree:
//     nodes within that tree are visited on the traversal, but non-leaf prefix
//     tree nodes (which are marked with Prefix=true) only visit their children
//     on the prefix tree.
//   - MergePrefix specifies a path to a TreeNode which should be part of the
//     returned subtree's root node.  Like PathPrefix, this may be provided
//     multiple times, defining a merge prefix tree: all leaves in that tree
//     will be unioned into the returned subtree's root, and their descendants
//     will be merged by common path suffix from the merge prefix tree.
//     Specifying more than one MergePrefix may result in returned SubtreeNodes
//     with more than one TreeNode.
func Walk(root TreeNode, compare CompareFn, opts ...WalkOption) (*SubtreeNode, error) {
	wo, err := walkOpts(opts...)
	if err != nil {
		return nil, err
	}
	mwh := &walkHeap{
		wo:      wo,
		compare: compare,
	}
	heap.Init(mwh)
	// The root of the returned subtree.
	var subtreeRoot *SubtreeNode
	if wo.mergePrefixTree == nil {
		// If there is no merge prefix tree, the returned subtree root corresponds
		// simply to the provided root TreeNode.
		heap.Push(mwh, newWalkHeapRoot(wo.pathPrefixTree, []TreeNode{root}))
	} else {
		// If, however, there is a merge prefix tree, the returned subtree root
		// corresponds to the union of all TreeNodes at the merge prefix tree's
		// leaves.  We must find those TreeNodes:
		rootTreeNodesByScope := map[ScopeID][]TreeNode{}
		var visit func(mergeTN *prefixTreeNode, tn TreeNode, depth uint) error
		visit = func(mergeTN *prefixTreeNode, tn TreeNode, depth uint) error {
			if len(mergeTN.childrenByScopeID) == 0 {
				// This is a prefix leaf.  This TreeNode may be part of one of the
				// top-level children of the returned merged root.
				path := tn.Path()
				scopeID := path[len(path)-1]
				rootTreeNodesByScope[scopeID] = append(rootTreeNodesByScope[scopeID], tn)
				return nil
			}
			childTNs, err := tn.Children()
			if err != nil {
				return err
			}
			for _, childTN := range childTNs {
				childPath := childTN.Path()
				if depth >= uint(len(childPath)) {
					return fmt.Errorf("tree structure invalid: some TreeNodes have paths of length less than or equal to their parents'")
				}
				if childPrefixTN, ok := mergeTN.childrenByScopeID[childPath[depth]]; ok {
					if err := visit(childPrefixTN, childTN, depth+1); err != nil {
						return err
					}
				}
			}
			return err
		}
		// Walk the merge prefix tree, assembling TreeNodes for the top-level frames
		// (i.e., the prefix tree leaves) and their parents (taken together, the
		// root.)
		visit(wo.mergePrefixTree, root, 0)
		// ... then push the merge prefix leaf TreeNodes onto the heap.
		for scopeID, initialNodes := range rootTreeNodesByScope {
			heap.Push(mwh, newWalkHeapEntry(wo.pathPrefixTree, scopeID, initialNodes, nil))
		}
		// Finally, we create an empty subtree root.  Any SubtreeRoots generated by
		// the heaviest-first traversal that do not have a parent will be placed
		// under this root.
		subtreeRoot = &SubtreeNode{
			Parent: nil,
			Path:   []ScopeID{},
			// If a path prefix was specified, the root is on it.
			Prefix: wo.pathPrefixTree != nil,
		}
	}
	// Until we've added the maximum requested number of non-prefix subtree
	// nodes, or exhausted all candidate nodes, pop the next entry from the stack
	// and visit it.
	addedNodes := 0
	for mwh.Len() > 0 && (wo.maxNodes == unspecifiedOption || addedNodes < wo.maxNodes) {
		entry := heap.Pop(mwh).(*walkHeapEntry)
		// Visit the entry, getting its SubtreeNode and all its child heap entries.
		stn, childEntries, err := entry.visit(wo)
		if err != nil {
			return nil, err
		}
		if stn != nil {
			if entry.parent == nil {
				if wo.mergePrefixTree != nil {
					// If the merge prefix tree exists, and this entry has no parent, it
					// should be placed under subtreeRoot.
					subtreeRoot.Children = append(subtreeRoot.Children, stn)
					subtreeRoot.TreeNodes = append(subtreeRoot.TreeNodes, stn.TreeNodes...)
				} else {
					// Otherwise, we've found multiple roots: an error.
					if subtreeRoot != nil {
						return nil, fmt.Errorf("Walk() found multiple root nodes (%v and %v)", subtreeRoot, stn)
					}
					subtreeRoot = stn
				}
			}
			if !stn.Prefix {
				addedNodes++
			}
		}
		// Push each child heap entry onto the heap.
		for _, childEntry := range childEntries {
			heap.Push(mwh, childEntry)
		}
	}
	return subtreeRoot, nil
}
