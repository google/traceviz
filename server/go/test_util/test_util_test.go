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

package testutil

import (
	"testing"

	"github.com/google/traceviz/server/go/util"
)

func TestUpdateComparator(t *testing.T) {
	for _, test := range []struct {
		description string
		comparator  *UpdateComparator
		different   bool
	}{{
		description: "equal simple updates",
		comparator: NewUpdateComparator().
			WithTestUpdates(util.StringProperty("greetings", "hello")).
			WithWantUpdates(util.StringProperty("greetings", "hello")),
	}, {
		description: "order independence",
		comparator: NewUpdateComparator().
			WithTestUpdates(
				util.StringProperty("greeting", "hello"),
				util.IntegerProperty("tuba_count", 5),
			).
			WithWantUpdates(
				util.IntegerProperty("tuba_count", 5),
				util.StringProperty("greeting", "hello"),
			),
	}, {
		description: "redefinition",
		comparator: NewUpdateComparator().
			WithTestUpdates(
				util.IntegerProperty("cowbell_count", 5),
				util.IntegerProperty("cowbell_count", 10),
			).
			WithWantUpdates(
				util.IntegerProperty("cowbell_count", 10),
			),
	}, {
		description: "unequal (strings version)",
		comparator: NewUpdateComparator().
			WithTestUpdates(
				util.StringProperty("greeting", "hello"),
			).
			WithWantUpdates(
				util.StringProperty("greeting", "howdy, partner!"),
			),
		different: true,
	}, {
		description: "unequal (numeric version)",
		comparator: NewUpdateComparator().
			WithTestUpdates(
				util.IntegerProperty("cowbell_count", 10),
			).
			WithWantUpdates(
				util.DoubleProperty("cowbell_count", 10),
			),
		different: true,
	}} {
		t.Run(test.description, func(t *testing.T) {
			gotMsg, different := test.comparator.Compare(t)
			if test.different != different {
				t.Errorf("Compare() yielded unexpected return message '%s'", gotMsg)
			}
		})
	}
}
