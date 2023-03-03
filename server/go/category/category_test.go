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

package category

import (
	"testing"

	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

func TestCategoryDefinitionAndTagging(t *testing.T) {
	for _, test := range []struct {
		description     string
		buildCategories func(db util.DataBuilder)
		buildExplicit   func(db testutil.TestDataBuilder)
	}{{
		description: "multicategory",
		buildCategories: func(db util.DataBuilder) {
			cars := New("cars", "Cars", "Personal vehicles")
			trucks := New("trucks", "Trucks", "Work vehicles")
			buses := New("buses", "Buses", "Public transportation")
			catgroup := db.Child()
			catgroup.Child().With(cars.Define())
			catgroup.Child().With(trucks.Define())
			catgroup.Child().With(buses.Define())
			db.Child().With(util.StringProperty("name", "sedan"), Tag(cars))
			db.Child().With(util.StringProperty("name", "van"), Tag(cars, trucks))
			db.Child().With(util.StringProperty("name", "shuttle"), Tag(buses))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.Child().
				Child().With(
				util.StringProperty(categoryDefinedIDKey, "cars"),
				util.StringProperty(categoryDisplayNameKey, "Cars"),
				util.StringProperty(categoryDescriptionKey, "Personal vehicles"),
			).AndChild().With(
				util.StringProperty(categoryDefinedIDKey, "trucks"),
				util.StringProperty(categoryDisplayNameKey, "Trucks"),
				util.StringProperty(categoryDescriptionKey, "Work vehicles"),
			).AndChild().With(
				util.StringProperty(categoryDefinedIDKey, "buses"),
				util.StringProperty(categoryDisplayNameKey, "Buses"),
				util.StringProperty(categoryDescriptionKey, "Public transportation"),
			).Parent().Parent().Child().With(
				util.StringsProperty(categoryIDsKey, "cars"),
				util.StringProperty("name", "sedan"),
			).AndChild().With(
				util.StringsProperty(categoryIDsKey, "cars", "trucks"),
				util.StringProperty("name", "van"),
			).AndChild().With(
				util.StringsProperty(categoryIDsKey, "buses"),
				util.StringProperty("name", "shuttle"),
			)
		},
	}, {
		description: "nested categories",
		buildCategories: func(db util.DataBuilder) {
			vehicles := New("vehicles", "Vehicles", "Modes of transportation")
			roadVehicles := New("road_vehicles", "Road Vehicles", "Land vehicles for road use")
			cars := New("cars", "Cars", "Personal transport vehicles")
			db.With(vehicles.Define()).
				Child().With(roadVehicles.Define()).
				Child().With(cars.Define())
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				util.StringProperty(categoryDefinedIDKey, "vehicles"),
				util.StringProperty(categoryDisplayNameKey, "Vehicles"),
				util.StringProperty(categoryDescriptionKey, "Modes of transportation"),
			).Child().With(
				util.StringProperty(categoryDefinedIDKey, "road_vehicles"),
				util.StringProperty(categoryDisplayNameKey, "Road Vehicles"),
				util.StringProperty(categoryDescriptionKey, "Land vehicles for road use"),
			).Child().With(
				util.StringProperty(categoryDefinedIDKey, "cars"),
				util.StringProperty(categoryDisplayNameKey, "Cars"),
				util.StringProperty(categoryDescriptionKey, "Personal transport vehicles"),
			)
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			if err := testutil.CompareResponses(t, test.buildCategories, test.buildExplicit); err != nil {
				t.Fatalf("encountered unexpected error building the categories: %s", err)
			}
		})
	}
}
