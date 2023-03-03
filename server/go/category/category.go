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

// Package category supports declaring data categories, such as table columns,
// histogram bins, data series in a graph, or individual trace series.  A
// single DataBuilder may define one Category, and may store data pertaining
// to that category in child DataBuilders; alternatively, DataBuilders may
// be tagged as pertaining to one or more categories defined elsewhere.
package category

import (
	"github.com/google/traceviz/server/go/util"
)

const (
	categoryDefinedIDKey   = "category_defined_id"
	categoryDescriptionKey = "category_description"
	categoryDisplayNameKey = "category_display_name"
	categoryIDsKey         = "category_ids"
)

// Category defines a data category.
type Category struct {
	id, description, displayName string
}

// New returns a new Category with the provided ID, display name, and
// description.
func New(id, displayName, description string) *Category {
	return &Category{
		id:          id,
		description: description,
		displayName: displayName,
	}
}

// Define defines a category.  If multiple categories are Defined on the same
// DataBuilder, only the last takes effect.
func (c *Category) Define() util.PropertyUpdate {
	return util.Chain(
		util.StringProperty(categoryDefinedIDKey, c.id),
		util.StringProperty(categoryDisplayNameKey, c.displayName),
		util.StringProperty(categoryDescriptionKey, c.description),
	)
}

// ID returns the category's ID.
func (c *Category) ID() string {
	return c.id
}

// Tag annotates an item as belonging to a category.  Multiple Categories may
// Tag the same item in succession.
func (c *Category) Tag() util.PropertyUpdate {
	return util.StringsPropertyExtended(categoryIDsKey, c.id)
}

// Tag annotates with the provided set of Categories.
func Tag(cats ...*Category) util.PropertyUpdate {
	categoryIDs := make([]string, len(cats))
	for idx, cat := range cats {
		categoryIDs[idx] = cat.id
	}
	return util.StringsPropertyExtended(categoryIDsKey, categoryIDs...)
}
