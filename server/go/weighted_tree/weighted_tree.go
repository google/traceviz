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
//	node.Payload(payloadType)
//
// which allocate the payload, tag it with the specified type string, and
// return its *util.DataBuilder.
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
//		properties
//		  * datumTypeKey: nodeDatumType
//	   * selfMagnitudeKEy: self magnitude
//		  * <decorators>
//		children
//		  * repeated nodes and payloads
//
// payload
//
//	properties
//	  * datumTypeKey: payloadDatumType
//	  * payloadTypeKey: StringValue
//	  * <anything else>
//	children
//	  * <anything>
package weightedtree

import (
	"github.com/google/traceviz/server/go/magnitude"
	"github.com/google/traceviz/server/go/util"
)

const (
	datumTypeKey   = "tree_datum_type"
	payloadTypeKey = "tree_payload_type"

	frameHeightPxKey = "tree_frame_height_px"
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

// New returns a new Tree populating the provided data builder.
func New(db util.DataBuilder, renderSettings *RenderSettings, properties ...util.PropertyUpdate) *Tree {
	return &Tree{
		db: db.With(renderSettings.Define()).With(properties...),
	}
}

// Node creates and returns a new root node with the specified magnitude in the
// tree.
func (t *Tree) Node(selfMagnitude float64, properties ...util.PropertyUpdate) *Node {
	return &Node{
		db: newChild(t.db, treeNodeDatumType).With(
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

type treeDatumType int64

const (
	treeNodeDatumType treeDatumType = iota
	payloadDatumType
)

func newChild(parentDb util.DataBuilder, datumType treeDatumType) util.DataBuilder {
	return parentDb.
		Child().
		With(util.IntegerProperty(datumTypeKey, int64(datumType)))
}

// Node creates and returns a new child node with the specified magnitude
// beneath the receiver.
func (n *Node) Node(selfMagnitude float64, properties ...util.PropertyUpdate) *Node {
	return &Node{
		db: newChild(n.db, treeNodeDatumType).With(
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
func (n *Node) Payload(payloadType string) util.DataBuilder {
	return newChild(n.db, payloadDatumType).With(
		util.StringProperty(payloadTypeKey, payloadType),
	)
}