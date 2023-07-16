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

// Package payload facilitates attaching payloads of arbitrary data to elements
// in structured TraceViz data responses.
//
// There are many structured TraceViz response types, such as tree, tabular,
// and trace data.  In such structured types, some element types (for example,
// nodes in trees, cells in tables, and spans or subspans in traces) can host
// further structured data (but not necessarily following the structure of the
// host element) within them.  Some examples:
//
// *   A table cell containing a histogram;
// *   A trace span containing an overtime xy chart;
// *   A tree node divided into differently-colored regions.
//
// This package facilitates embedding structured data within other structured
// data in this way.  Any type into which other structured data may be embedded
// should implement the Payloader interface.
package payload

import "github.com/google/traceviz/server/go/util"

const (
	// TypeKey, if present in a Datum's properties, indicates that that datum is
	// an embedded payload.  properties[TypeKey] should be a string value
	// indicating the type of the payload; each embeddable structured type
	// should export a unique payload type string.
	TypeKey = "payload_type"
)

// Payloader is implemented by types able to accept payloads.
type Payloader interface {
	// Payload implementations should add a child to the receiver and return
	// that child.
	Payload() util.DataBuilder
}

// New creates and returns a payload of the specified type under the provided
// parent.
func New(parent Payloader, payloadType string) util.DataBuilder {
	return parent.Payload().With(
		util.StringProperty(TypeKey, payloadType),
	)
}
