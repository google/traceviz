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

package traceedge

import (
	"testing"
	"time"

	"github.com/google/traceviz/server/go/payload"
	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

type testPayloader struct {
	db util.DataBuilder
}

func newTestPayloader(db util.DataBuilder) *testPayloader {
	return &testPayloader{
		db: db,
	}
}

func (tp *testPayloader) Payload() util.DataBuilder {
	return tp.db.Child()
}

func TestTraceEdges(t *testing.T) {
	for _, test := range []struct {
		description    string
		buildTraceEdge func(db util.DataBuilder)
		buildExplicit  func(db testutil.TestDataBuilder)
	}{{
		description: "A->B",
		buildTraceEdge: func(db util.DataBuilder) {
			tp := newTestPayloader(db)
			New(tp, 50*time.Second, "A", "B").With(
				util.StringProperty("label", "Howdy partner I'm A"),
			)
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.Child().With(
				util.StringProperty(payload.TypeKey, PayloadType),
				util.StringProperty(nodeIDKey, "A"),
				util.DurationProperty(offsetKey, 50*time.Second),
				util.StringsProperty(endpointNodeIDsKey, "B"),
				util.StringProperty("label", "Howdy partner I'm A"),
			)
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			if err := testutil.CompareResponses(t, test.buildTraceEdge, test.buildExplicit); err != nil {
				t.Fatalf("encountered unexpected error building trace edge: %s", err)
			}
		})
	}
}
