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

// Package dot provides a projection of the graph specification language DOT
// into the TraceViz data format. This implementation follows the language
// specification at https://graphviz.org/doc/info/lang.html.
//
// Here, as in DOT, graphs are specified in terms of nodes, edges between
// nodes, and recursive subgraphs.  A new graph is created with one of the
// graph constructors NewGraph, NewDigraph, NewStrictGraph, NewStrictDigraph:
//
//	g := NewGraph(graphRoot, options...)
//
// (where `options` specifies graph-level options such as layout engine, graph
// directionality, or 'strictness' (whether a given ordered pair of nodes can
// have multiple edges between them).
//
// and constructed via successive calls to AddNode, AddEdge, AddSubgraph,
// AddGraphAttrs, AddNodeAttrs, and AddEdgeAttrs; the first three are
// equivalent to, and generate, *node_stmt*, *edge_stmt*, and *subgraph*
// respectively; the last three are equivalent to *attr_stmt*.  AddSubgraph
// returns a new graph instance with the same interface.  On the frontend,
// this encoding is converted into a DOT specification, with all statements
// in the same order as they were defined here.
//
// Attribute lists are defined via the Attributes type:
//
//	a := NewAttributes().With('color', 'red')
//
// So, the backend response:
//
//		g := NewStrictDigraph(graphRoot)
//		g.AddNodeAttrs(
//		  NewAttributes().
//		    With("color", "blue").
//	     WithString("label", "node 1"),
//		)
//		g.AddNode("A", nil).With(
//		  util.IntegerProperty("node_id", 0),
//		)
//		g.AddNode("B", nil).With(
//		  util.IntegerProperty("node_id", 1),
//		)
//		g.AddNode("C", nil).With(
//		  util.IntegerProperty("node_id", 2),
//		)
//		g.AddEdge("A", "B", nil)
//		g.AddEdge("A", "C", nil)
//
// is equivalent to the DOT specification:
//
//	digraph {
//	  node [color=blue label="node 1"]
//	  A
//	  B
//	  C
//	  A -> B
//	  A -> C
//	}
//
// Note the distinction between DOT Attributes and Properties.  The latter are
// arbitrary TraceViz properties, and can be used to support interactions on
// individual nodes and edges.  Additionally, AddNode and AddEdge both return
// util.DataBuilders, so additional content may be attached to them, though of
// course this is not rendered by standard GraphViz layout engines.
//
// Careful observers will note that some valid DOT formulations are
// inexpressible with this encoding, including:
//
//   - multiple attribute lists (e.g., `node [color=blue][fillcolor=red]`;
//     this is equivalent to `node [color=blue;fillcolor=red]`)
//   - subgraphs as edge termini (e.g., `A -> {B C}`; this is equivalent to
//     `A -> B; A -> C`)
//   - implicit node definition (e.g., `A -> B` where neither A nor B has been
//     defined; this is equivalent to `A; B; A -> B`)
//   - anonymous subgraphs (e.g., `{A; B; C}`; this is equivalent to
//     `subgraph my_subgraph_1 { A; B; C }`)
//
// In all these cases, an equivalent workaround is expressible with this
// encoding.
//
// Additionally, note that layout ports may be defined by carefully choosing
// node IDs.  Likewise, clusters may be defined with subgraph IDs beginning
// with 'cluster'.
//
// Encoded into the TraceViz data model, a dot graph specification is:
//
// graph
//
//		properties
//	   * strictnessKey: strict|nonstrict
//	   * directionalityKey: directed|undirected
//	   * layoutEngineKey: dot
//		  * [strictKey|multiEdgeKey]: [graphType|digraphType]
//		children
//		  * repeated nodes, edges, subgraphs, and attr statements
//
// node
//
//		properties
//	   * nodeIDKey: <string>
//	   * propertyMapTagKey: <string>
//		  * statementTypeKey: nodeStatement
//		  * attributesKey: <attributes list>
//		  * <decorators>
//		children
//		  * <anything>
//
// edge
//
//		properties
//	   * startNodeIDKey: <string>
//	   * endNodeIDKey: <string>
//	   * propertyMapTagKey: <string>
//		  * statementTypeKey: edgeStatement
//		  * attributesKey: <attributes list>
//		  * <decorators>
//		children
//		  * <anything>
//
// subgraph
//
//	properties
//	  * statementTypeKey: subgraphStatement
//	  * attributesKey: <attributes list>
//	  * <decorators>
//	children
//	  * repeated nodes, edges, subgraphs, and attr statements
//
// attr
//
//	properties
//	  * statementTypeKey: attrStatement
//	  * attrStatementTargetKey: [graphAttr|nodeAttr|edgeAttr]
//	  * attributesKey: <attributes list>
//
// Where <attributes list> is a repeated string of even length, comprising
// alternating (string key, string value) pairs.  These keys and values are
// as specified at https://graphviz.org/doc/info/attrs.html; note that not all
// attributes are valid in all contexts or meaningful to all layout engines.
package dot

import (
	"github.com/google/traceviz/server/go/util"
)

const (
	strictnessKey          = "dot_strictness"
	directionalityKey      = "dot_directionality"
	layoutEngineKey        = "dot_layout_engine"
	statementTypeKey       = "dot_statement_type"
	attrStatementTargetKey = "dot_attr_statement_target"
	attributesKey          = "dot_attributes"

	// Keys associated with node and subgraph IDs
	subgraphIDKey  = "dot_subgraph_id"
	nodeIDKey      = "dot_node_id"
	edgeIDKey      = "dot_edge_id"
	startNodeIDKey = "dot_start_node_id"
	endNodeIDKey   = "dot_end_node_id"

	strict     = "strict"
	nonstrict  = "nonstrict"
	undirected = "undirected"
	directed   = "directed"

	// Types of 'statements', or definitions, within a graph or subgraph.
	edgeStatement     = "edge"
	nodeStatement     = "node"
	subgraphStatement = "subgraph"
	attrStatement     = "attr"

	// The target type for an attr statement.
	graphAttr = "graph"
	nodeAttr  = "node"
	edgeAttr  = "edge"

	dotEngine   = "dot"
	neatoEngine = "neato"
)

// Graph supports injection of the DOT language into a DataBuilder.
type Graph struct {
	db util.DataBuilder
}

type options struct {
	directionality string
	strictness     string
	layoutEngine   string
}

// Option specifies a graph-level option.
type Option func(opts *options) error

func getOpts(optFns ...Option) (*options, error) {
	ret := &options{
		directionality: undirected,
		strictness:     nonstrict,
		layoutEngine:   dotEngine,
	}
	for _, optFn := range optFns {
		if err := optFn(ret); err != nil {
			return nil, err
		}
	}
	return ret, nil
}

// Directed specifies a directed graph.  Edges are arrows going from the first
// to the second node.
func Directed() Option {
	return func(opts *options) error {
		opts.directionality = directed
		return nil
	}
}

// Undirected specifies an undirected graph.  Edges are lines connecting two
// nodes.
func Undirected() Option {
	return func(opts *options) error {
		opts.directionality = undirected
		return nil
	}
}

// Strict specifies a strict graph, in which each pair of nodes (A, B) may have
// at most one edge between them (in digraphs, one in each direction.)
func Strict() Option {
	return func(opts *options) error {
		opts.strictness = strict
		return nil
	}
}

// Nonstrict specifies a nonstrict graph, in which each pair of nodes (A, B)
// may have multiple edges between them.
func Nonstrict() Option {
	return func(opts *options) error {
		opts.strictness = nonstrict
		return nil
	}
}

// Dot specifies the `dot` layout engine.
func Dot() Option {
	return func(opts *options) error {
		opts.layoutEngine = dotEngine
		return nil
	}
}

// Neato specifies the `neato` layout engine.
func Neato() Option {
	return func(opts *options) error {
		opts.layoutEngine = neatoEngine
		return nil
	}
}

// NewGraph returns a new Graph configured to support undirected edges
// ('graph') and supporting multiple edges with the same endoints.
func NewGraph(db util.DataBuilder, optFns ...Option) (*Graph, error) {
	opts, err := getOpts(optFns...)
	if err != nil {
		return nil, err
	}
	return &Graph{
		db: db.With(
			util.StringProperty(strictnessKey, opts.strictness),
			util.StringProperty(directionalityKey, opts.directionality),
			util.StringProperty(layoutEngineKey, opts.layoutEngine),
		),
	}, nil
}

// With annotates the receiver with the provided updates.
func (g *Graph) With(updates ...util.PropertyUpdate) *Graph {
	g.db.With(updates...)
	return g
}

// WithAttributes attaches a set of attributes to the receiving Graph.
func (g *Graph) WithAttributes(attrs *Attributes) *Graph {
	g.db.With(
		attrs.toPropertyUpdate(),
	)
	return g
}

type attribute struct {
	attr  string
	value string
}

// Attributes represents a DOT attribute list; a set of (string) key to
// (string) property definitions.
type Attributes struct {
	attrs []attribute
}

// NewAttributes returns a new, empty Attributes set.
func NewAttributes() *Attributes {
	return &Attributes{}
}

// With adds the specified attribute and value to the receiver.
func (a *Attributes) With(attr, value string) *Attributes {
	a.attrs = append(a.attrs, attribute{
		attr:  attr,
		value: value,
	})
	return a
}

// WithString adds the specified attribute and value to the receiver.  The
// value must be a Dot `string` or `escString`, and will be wrapped in double
// quotes.
func (a *Attributes) WithString(attr, value string) *Attributes {
	a.attrs = append(a.attrs, attribute{
		attr:  attr,
		value: "\"" + value + "\"",
	})
	return a
}

func (a *Attributes) toPropertyUpdate() util.PropertyUpdate {
	if a == nil {
		return util.EmptyUpdate
	}
	strs := make([]string, len(a.attrs)*2)
	for idx, attr := range a.attrs {
		strs[2*idx] = attr.attr
		strs[2*idx+1] = attr.value
	}
	return util.StringsProperty(attributesKey, strs...)
}

// AddNode defines a node with the specified ID beneath the receiving Graph.
func (g *Graph) AddNode(nodeID string, attrs *Attributes) util.DataBuilder {
	return g.db.Child().With(
		util.StringProperty(nodeIDKey, nodeID),
		util.StringProperty(statementTypeKey, nodeStatement),
		attrs.toPropertyUpdate(),
	)
}

// AddEdge defines an edge with the specified ID between the two specified node
// IDs beneath the receiving Graph.
func (g *Graph) AddEdge(edgeID string, startNodeID, endNodeID string, attrs *Attributes) util.DataBuilder {
	return g.db.Child().With(
		util.StringProperty(edgeIDKey, edgeID),
		util.StringProperty(startNodeIDKey, startNodeID),
		util.StringProperty(endNodeIDKey, endNodeID),
		util.StringProperty(statementTypeKey, edgeStatement),
		attrs.toPropertyUpdate(),
	)
}

// AddSubgraph defines a subgraph with the specified ID beneath the receiving
// Graph.  Note that subgraph IDs that begin with 'cluster' are treated
// specially by some layout engines: rendered near one another and bounded by
// a rectangle.
func (g *Graph) AddSubgraph(subgraphID string, properties ...util.PropertyUpdate) *Graph {
	return &Graph{
		db: g.db.Child().With(
			util.StringProperty(subgraphIDKey, subgraphID),
			util.StringProperty(statementTypeKey, subgraphStatement),
		).With(properties...),
	}
}

// WithGraphAttrs defines 'graph' attributes under the receiving Graph.
// Returns the receiver for chaining.
func (g *Graph) WithGraphAttrs(attrs *Attributes) *Graph {
	g.db.Child().With(
		util.StringProperty(statementTypeKey, attrStatement),
		util.StringProperty(attrStatementTargetKey, graphAttr),
		attrs.toPropertyUpdate(),
	)
	return g
}

// WithNodeAttrs defines 'node' attributes under the receiving Graph.
// Returns the receiver for chaining.
func (g *Graph) WithNodeAttrs(attrs *Attributes) *Graph {
	g.db.Child().With(
		util.StringProperty(statementTypeKey, attrStatement),
		util.StringProperty(attrStatementTargetKey, nodeAttr),
		attrs.toPropertyUpdate(),
	)
	return g
}

// WithEdgeAttrs defines 'edge' attributes under the receiving Graph.
// Returns the receiver for chaining.
func (g *Graph) WithEdgeAttrs(attrs *Attributes) *Graph {
	g.db.Child().With(
		util.StringProperty(statementTypeKey, attrStatement),
		util.StringProperty(attrStatementTargetKey, edgeAttr),
		attrs.toPropertyUpdate(),
	)
	return g
}
