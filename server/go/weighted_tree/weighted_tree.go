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

// Package weightedtree provides structural helpers for defining weighted tree
// data.  Given a DataBuilder db, a new Tree may be constructed via:
//
//	tree := New(db, renderSettings, properties...)
//
// Trees may also be annotated with additional properties, via:
//
//	tree.With(properties...)
//
// A tree has one or more root nodes, defined via:
//
//	root := tree.Node(selfMagnitude, properties...)
//
// And nodes may have other nodes as children:
//
//	child := root.Node(selfMagnitude, properties...)
//
// Each node's self-magnitude is provided at its creation; a node's total-
// magnitude is computed as the sum of its self-magnitude and the total-
// magnitude of all its children.  Generally, a node's displayed width is
// proportional to its total-magnitude.
//
// Arbitrary payloads may be composed into trees under Nodes, via
//
//	payload.New(node)
//
// which allocate the payload and return its *util.DataBuilder.  See payload.go
// for more detail.
//
// Encoded into the TraceViz data model, a tree is:
//
// tree
//
//	properties
//	  * render settings definition
//	  * <decorators>
//	children
//	  * repeated root nodes
//
// node
//
//	properties
//	   * selfMagnitudeKEy: self magnitude
//		 * <decorators>
//	children
//		 * repeated nodes and payloads
package weightedtree

import (
	"github.com/google/traceviz/server/go/magnitude"
	"github.com/google/traceviz/server/go/util"
)

const (
	frameHeightPxKey = "weighted_tree_frame_height_px"
	// The tree's direction, top-down or bottom-up.  If unspecified, it is
	// top-down.
	directionKey = "weighted_tree_direction"
)

const (
	topDown  = "top_down"
	bottomUp = "bottom_up"
)

// RenderSettings is a collection of rendering settings for trees.
type RenderSettings struct {
	// The height of a frame in pixels.
	FrameHeightPx int64
}

// Define applies the receiver as a set of properties.
func (rs *RenderSettings) Define() util.PropertyUpdate {
	return util.Chain(
		util.IntegerProperty(frameHeightPxKey, rs.FrameHeightPx),
	)
}

// Tree represents a tree of hierarchical, weighted data, such as the
// aggregated callstacks presented in a flame chart.
type Tree struct {
	db util.DataBuilder
}

// New returns a new Tree populating the provided data builder.  A tree is by
// default top-down, but can be explicitly marked as top-down or bottom-up with
// TopDown() and BottomUp() respectively.
func New(db util.DataBuilder, renderSettings *RenderSettings, properties ...util.PropertyUpdate) *Tree {
	return &Tree{
		db: db.With(renderSettings.Define()).With(properties...),
	}
}

// TopDown marks the receiver as a top-down tree.  This is the default tree
// direction.
func (t *Tree) TopDown() *Tree {
	return t.With(
		util.StringProperty(directionKey, topDown),
	)
}

// BottomUp marks the receiver as a bottom-up tree.
func (t *Tree) BottomUp() *Tree {
	return t.With(
		util.StringProperty(directionKey, bottomUp),
	)
}

// Node creates and returns a new root node with the specified magnitude in the
// tree.
func (t *Tree) Node(selfMagnitude float64, properties ...util.PropertyUpdate) *Node {
	return &Node{
		db: t.db.Child().With(
			magnitude.SelfMagnitude(selfMagnitude),
		).With(properties...),
	}
}

// With applies a set of properties to the receiving Tree, returning that Tree
// to facilitate chaining.
func (t *Tree) With(properties ...util.PropertyUpdate) *Tree {
	t.db.With(properties...)
	return t
}

// Node represents a node within a Tree.
type Node struct {
	db util.DataBuilder
}

// Node creates and returns a new child node with the specified magnitude
// beneath the receiver.
func (n *Node) Node(selfMagnitude float64, properties ...util.PropertyUpdate) *Node {
	return &Node{
		db: n.db.Child().With(
			magnitude.SelfMagnitude(selfMagnitude),
		).With(properties...),
	}
}

// With applies a set of properties to the receiving Node, returning that Node
// to facilitate chaining.
func (n *Node) With(properties ...util.PropertyUpdate) *Node {
	n.db.With(properties...)
	return n
}

// Payload creates and returns a DataBuilder that can be used to attach
// arbitrary structured information to the receiving Node.
func (n *Node) Payload() util.DataBuilder {
	return n.db.Child()
}
