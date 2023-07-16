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

package payload

import (
	"testing"

	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

type testPayloader struct {
	db util.DataBuilder
}

func (tp *testPayloader) Payload() util.DataBuilder {
	return tp.db.Child()
}

func TestPayload(t *testing.T) {
	if err := testutil.CompareResponses(t,
		func(db util.DataBuilder) {
			tp := &testPayloader{
				db: db,
			}
			New(tp, "some numbers").With(
				util.IntegerProperty("width", 50),
				util.IntegerProperty("height", 30),
				util.IntegerProperty("depth", 10),
			)
		},
		func(db util.DataBuilder) {
			db.Child().With(
				util.StringProperty(TypeKey, "some numbers"),
				util.IntegerProperty("width", 50),
				util.IntegerProperty("height", 30),
				util.IntegerProperty("depth", 10),
			)
		},
	); err != nil {
		t.Fatalf("encountered unexpected error building the payload: %s", err)
	}
}
