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

// Package style supports specifying SVG, CSS, or other graphic styling.
//
// A Style instance comprises a mapping from style attribute name to value,
// both represented as strings.  A Style may be attached to a response Datum
// via the `Define()` method.  Which attributes are supported, and how they
// are used, is up to each UI component, but in general styles should have the
// names and expected values of SVG attributes or CSS styles, e.g.
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute.
package style

import (
	"fmt"

	"github.com/google/traceviz/server/go/util"
)

const (
	keyPrefix = "style_"
)

// Style defines a set of styles that can be attached to a Datum.
type Style struct {
	attrs map[string]string
}

// New returns a new, empty Style.
func New() *Style {
	return &Style{
		attrs: map[string]string{},
	}
}

// Define returns a PropertyUpdate defining the receiver into a Datum.
func (s *Style) Define() util.PropertyUpdate {
	ret := make([]util.PropertyUpdate, 0, len(s.attrs))
	for attr, val := range s.attrs {
		ret = append(ret, util.StringProperty(keyPrefix+attr, val))
	}
	return util.Chain(ret...)
}

// Px formats the provided value as a pixel specifier.
func Px(valPx float64) string {
	return fmt.Sprintf("%.2fpx", valPx)
}

// With sets the specified attribute type and value in the receiver.
func (s *Style) With(attrType string, attrVal string) *Style {
	s.attrs[attrType] = attrVal
	return s
}