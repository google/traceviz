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

package color

import (
	"testing"

	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

func TestColorSpaceDefinition(t *testing.T) {
	for _, test := range []struct {
		description string
		spaces      []*Space
		wantUpdates []util.PropertyUpdate
	}{{
		description: "single color space",
		spaces: []*Space{
			NewSpace("grey_space", "grey"),
		},
		wantUpdates: []util.PropertyUpdate{
			util.StringsProperty(colorSpaceNamePrefix+"grey_space", "grey"),
		},
	}, {
		description: "multiple color spaces",
		spaces: []*Space{
			NewSpace("fire", "yellow", "red"),
			NewSpace("royal", "blue", "purple"),
		},
		wantUpdates: []util.PropertyUpdate{
			util.StringsProperty(colorSpaceNamePrefix+"fire", "yellow", "red"),
			util.StringsProperty(colorSpaceNamePrefix+"royal", "blue", "purple"),
		},
	}, {
		description: "color space redefinition overwrites previous",
		spaces: []*Space{
			NewSpace("royal", "blue", "purple"),
			NewSpace("royal", "purple", "blue"),
		},
		wantUpdates: []util.PropertyUpdate{
			util.StringsProperty(colorSpaceNamePrefix+"royal", "purple", "blue"),
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			testUpdates := []util.PropertyUpdate{}
			for _, space := range test.spaces {
				testUpdates = append(testUpdates, space.Define())
			}
			if msg, failed := testutil.NewUpdateComparator().
				WithTestUpdates(testUpdates...).
				WithWantUpdates(test.wantUpdates...).
				Compare(t); failed {
				t.Fatal(msg)
			}
		})
	}
}

func TestColorDeclarations(t *testing.T) {
	redToBlue := NewSpace("red_to_blue", "red", "#C0C0C0", "blue")
	whiteToBlack := NewSpace("white_to_black", "white", "black")
	for _, test := range []struct {
		description  string
		buildUpdates func() util.PropertyUpdate
		wantUpdates  []util.PropertyUpdate
	}{{
		description: "primary from color space",
		buildUpdates: func() util.PropertyUpdate {
			return redToBlue.PrimaryColor(.5)
		},
		wantUpdates: []util.PropertyUpdate{
			util.StringProperty(primaryColorSpaceKey, colorSpaceNamePrefix+"red_to_blue"),
			util.DoubleProperty(primaryColorSpaceValueKey, .5),
		},
	}, {
		description: "all defined",
		buildUpdates: func() util.PropertyUpdate {
			return util.Chain(
				redToBlue.PrimaryColor(.3),
				Secondary("silver"),
				whiteToBlack.StrokeColor(.7),
			)
		},
		wantUpdates: []util.PropertyUpdate{
			util.StringProperty(primaryColorSpaceKey, colorSpaceNamePrefix+"red_to_blue"),
			util.DoubleProperty(primaryColorSpaceValueKey, .3),
			util.StringProperty(secondaryColorKey, "silver"),
			util.StringProperty(strokeColorSpaceKey, colorSpaceNamePrefix+"white_to_black"),
			util.DoubleProperty(strokeColorSpaceValueKey, .7),
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			testUpdates := test.buildUpdates()
			if msg, failed := testutil.NewUpdateComparator().
				WithTestUpdates(testUpdates).
				WithWantUpdates(test.wantUpdates...).
				Compare(t); failed {
				t.Fatal(msg)
			}
		})
	}
}
