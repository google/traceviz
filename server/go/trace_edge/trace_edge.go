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

// Package traceedge provides types and methods for defining edges embedded
// within over-time traces (or within any structured data supporting payloads
// and with a time axis.)  Edge endpoints are attached to payload-bearing Datums
// using New() or AttachNew(), providing a parent object (e.g., a span); an
// offset, a unique string identifier, and zero or more endpoint identifiers
// which are  connected with edges to this endpoint.  For example,
//
//	edgeNode := New(traceSpan, 100 * time.Millisecond, "1", "2", "3")
//
// attaches an edge endpoint named '1' under traceSpan at a trace offset of
// 100ms, and adds two edges, one from '1' to '2' and one from '1' to '3'.
// Properties may then be attached to the edge as usual:
//
//	edgeNode.With(color.Stroke("blue")
//
// In the context of traces, edges provide a way to indicate inter-category
// relationships, such as causal event predecessors or critical paths.
package traceedge

import (
	"time"

	"github.com/google/traceviz/server/go/payload"
	"github.com/google/traceviz/server/go/util"
)

const (
	nodeIDKey          = "trace_edge_node_id"
	offsetKey          = "trace_edge_offset"
	endpointNodeIDsKey = "trace_edge_endpoint_node_ids"

	// PayloadType defines the payload type for trace edge nodes.
	PayloadType = "trace_edge_payload"
)

// Node defines an endpoint in a trace edge graph.
type Node struct {
	db util.DataBuilder
}

// New produces a new Node in the provided DataBuilder, with the provided
// offset, ID, and endpoint node IDs.
func New(parent payload.Payloader, offset time.Duration, id string, edgeEndpointNodeIDs ...string) *Node {
	return &Node{
		db: payload.New(parent, PayloadType).With(
			util.StringProperty(nodeIDKey, id),
			util.DurationProperty(offsetKey, offset),
			util.StringsProperty(endpointNodeIDsKey, edgeEndpointNodeIDs...),
		),
	}
}

// With annotates the receiver with the provided updates.
func (n *Node) With(updates ...util.PropertyUpdate) *Node {
	n.db.With(updates...)
	return n
}
