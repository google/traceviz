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

// Package magnitude supports attaching magnitudes to items.
package magnitude

import "github.com/google/traceviz/server/go/util"

const (
	selfMagnitudeKey = "self_magnitude"
)

// SelfMagnitude returns a PropertyUpdate that annotates with the provided
// self-magnitude.
func SelfMagnitude(selfMagnitude float64) util.PropertyUpdate {
	return util.DoubleProperty(selfMagnitudeKey, selfMagnitude)
}