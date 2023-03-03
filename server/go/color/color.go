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

// Package color supports declaring color spaces and coloring renderable
// items.
//
// A single Datum may be annotated with colors for up to three different types:
// a primary, secondary, and stroke color.  These correspond to Material
// Design's primary, secondary, and text/iconography/stroke colors, as
// described in https://material.io/design/color/the-color-system.html.
//
// Within TraceViz, these different color types have specific meanings:
//
//   - The primary color should generally be the dominant color within a
//     rendered item, and if the item's color conveys information about it,
//     such as item type or an item-specific metric, that semantic color should
//     be the primary.
//   - The secondary color should be used for accents and interactive elements.
//     An item may be colored with the secondary color to indicate that it is
//     selected or called out.
//   - The stroke color should be used for text, iconography, or strokes,
//     including borders.
//
// Coloring may be specified in multiple ways:
//
//   - A specific, fixed color may be applied with Primary(),
//     Secondary(), or Stroke(), which all expect a string value
//     containing an HTML color representation: a color name
//     or a RGB, RGBA, HSL, HSLA, or hex color specifier.
//   - Alternatively, a color space may be defined somewhere in the response,
//     depending on the visualization data type.  This color space comprises a
//     sequence of HTML color strings; then individual Datum instances may be
//     annotated with their position along that sequence ranging from 0.0
//     ('the leftmost color') to 1.0 ('the rightmost color').  The annotated
//     color is then that position in the linear interpolation of the sequence.
//
// So, a single datum may be given the blue, purple, and white as primary,
// secondary, and stroke colors respectively via:
//
//	myDatum.With(
//	  color.Primary("blue"),
//	  color.Secondary("purple"),
//	  color.Stroke("white"),
//	)
//
// Or, a table in which rows are colored on a blue-to-red continuum depending
// on some row-specific 'weight' value might define that blue-to-red continuum
// at the top of the table, then color each row according to its weight:
//
//	weightColorSpace := color.NewSpace("weight", "blue", "red")
//	tab := table.New(series, cols...).With(
//	  weightColorSpace.Define(),
//	)
//	for _, row := range rows {
//	  tab.Row(
//	    cells...,
//	  ).With(
//	    weightColor.Primary(row.weight),
//	  )
//	}
//
// A given color type may only be defined one way.  If a datum specifies a
// color for a single type in multiple ways, the result is undefined.
package color

import "github.com/google/traceviz/server/go/util"

const (
	// colorSpaceNamePrefix defines a color space.
	colorSpaceNamePrefix = "color_space_"
	// The primary color space and value, or raw color.
	primaryColorSpaceKey      = "primary_color_space"
	primaryColorSpaceValueKey = "primary_color_space_value"
	primaryColorKey           = "primary_color"
	// The secondary color space and value, or raw color.
	secondaryColorSpaceKey      = "secondary_color_space"
	secondaryColorSpaceValueKey = "secondary_color_space_value"
	secondaryColorKey           = "secondary_color"
	// The stroke color space and value, or raw color.
	strokeColorSpaceKey      = "stroke_color_space"
	strokeColorSpaceValueKey = "stroke_color_space_value"
	strokeColorKey           = "stroke_color"
)

// Space represents a color space: a color continuum that can map double
// values to colors.
type Space struct {
	name   string
	colors []string
}

// NewSpace defines a new color space.  Colors in this space will be linearly
// interpolated between the specified colors.
func NewSpace(name string, colors ...string) *Space {
	return &Space{
		name:   name,
		colors: colors,
	}
}

// Name returns the Space's name.
func (s *Space) Name() string {
	return s.name
}

// Define annotates with a definition of the receiving Space.
func (s *Space) Define() util.PropertyUpdate {
	return util.StringsProperty(colorSpaceNamePrefix+s.name, s.colors...)
}

// PrimaryColor annotates a Datum with a primary color along the receiving
// color space.
func (s *Space) PrimaryColor(colorValue float64) util.PropertyUpdate {
	return util.Chain(
		util.StringProperty(primaryColorSpaceKey, colorSpaceNamePrefix+s.name),
		util.DoubleProperty(primaryColorSpaceValueKey, colorValue),
	)
}

// Primary annotates a Datum with the specified primary color.
func Primary(colorValue string) util.PropertyUpdate {
	return util.StringProperty(primaryColorKey, colorValue)
}

// SecondaryColor annotates a Datum with a secondary color along the receiving
// color space.
func (s *Space) SecondaryColor(colorValue float64) util.PropertyUpdate {
	return util.Chain(
		util.StringProperty(secondaryColorSpaceKey, colorSpaceNamePrefix+s.name),
		util.DoubleProperty(secondaryColorSpaceValueKey, colorValue),
	)
}

// Secondary annotates a Datum with the specified secondary color.
func Secondary(colorValue string) util.PropertyUpdate {
	return util.StringProperty(secondaryColorKey, colorValue)
}

// StrokeColor annotates a Datum with a stroke color along the receiving
// color space.
func (s *Space) StrokeColor(colorValue float64) util.PropertyUpdate {
	return util.Chain(
		util.StringProperty(strokeColorSpaceKey, colorSpaceNamePrefix+s.name),
		util.DoubleProperty(strokeColorSpaceValueKey, colorValue),
	)
}

// Stroke annotates a Datum with the specified stroke color.
func Stroke(colorValue string) util.PropertyUpdate {
	return util.StringProperty(strokeColorKey, colorValue)
}
