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

// Package label supports labeling renderable items.
package label

import "github.com/google/traceviz/server/go/util"

const (
	// labelFormatKey specifies the label format string used to label nodes.
	labelFormatKey = "label_format"
)

// Format returns a PropertyUpdate that labels with the provided label format.
// labelFormat should be a format string as described in ValueMap.format in the
// TraceViz client core.
func Format(labelFormat string) util.PropertyUpdate {
	return util.StringProperty(labelFormatKey, labelFormat)
}
