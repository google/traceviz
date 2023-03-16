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

package trace

import (
	"fmt"
	"testing"
	"time"

	"github.com/google/traceviz/server/go/category"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

var (
	now = time.Now()
)

func TestTraceData(t *testing.T) {
	var (
		cpu0Category    = category.New("cpu0", "CPU 0", "CPU 0")
		runningCategory = category.New("running", "Running", "Running threads")
		waitingCategory = category.New("waiting", "Waiting", "Waiting threads")
		pid             = func(pid int64) util.PropertyUpdate {
			return util.IntegerProperty("pid", pid)
		}
		pids = func(pids ...int64) util.PropertyUpdate {
			return util.IntegersProperty("pids", pids...)
		}

		rpcACategory   = category.New("rpc a", "RPC a", "RPC a")
		rpcABCategory  = category.New("rpc b", "RPC a/b", "RPC a/b")
		rpcABCCategory = category.New("rpc c", "RPC a/b/c", "RPC a/b/c")
		rpcABDCategory = category.New("rpc d", "RPC a/b/d", "RPC a/b/d")
		rpcAECategory  = category.New("rpc e", "RPC a/e", "RPC a/e")
		rpcAEFCategory = category.New("rpc f", "RPC a/e/f", "RPC a/e/f")
		rpc            = func(name string) util.PropertyUpdate {
			return util.StringProperty("function", name)
		}

		pidCat = func(pid int) *category.Category {
			return category.New(
				fmt.Sprintf("pid%d", pid),
				fmt.Sprintf("PID %d", pid),
				fmt.Sprintf("PID %d", pid),
			)
		}
		fun = func(name string) util.PropertyUpdate {
			return util.StringProperty("function", name)
		}
	)

	cat := category.New("x_axis", "Trace time", "Time from start of trace")

	for _, test := range []struct {
		description   string
		buildTrace    func(db util.DataBuilder)
		buildExplicit func(db testutil.TestDataBuilder)
		wantErr       bool
	}{{
		// A trace showing a 'running' and a 'waiting' category for each of n CPUs.
		// Each running and waiting category features a sequence of nonoverlapping,
		// non-nesting spans representing (possibly aggregated) thread residency.
		//              012345678901234567890123456789
		// CPU 0      |
		// |- Running | [ pid 100 ][200][   pid 100  ]
		// |- Waiting | [         ][100][200][200,300]
		description: "non-nested trace",
		buildTrace: func(db util.DataBuilder) {
			trace := New(db, continuousaxis.NewDurationAxis(cat, 300*time.Nanosecond), &RenderSettings{})
			cpu0 := trace.Category(cpu0Category)
			cpu0Running := cpu0.Category(runningCategory)
			cpu0Running.Span(0, 100).With(pid(100))
			cpu0Running.Span(100, 50).With(pid(200))
			cpu0Running.Span(150, 150).With(pid(100))
			cpu0Waiting := cpu0.Category(waitingCategory)
			cpu0Waiting.Span(0, 100).With(pids())
			cpu0Waiting.Span(100, 50).With(pids(100))
			cpu0Waiting.Span(150, 50).With(pids(200))
			cpu0Waiting.Span(200, 100).With(pids(200, 300))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				continuousaxis.NewDurationAxis(cat, 300*time.Nanosecond).Define(),
				util.IntegerProperty(spanWidthCatPx, 0),
				util.IntegerProperty(spanPaddingCatPx, 0),
				util.IntegerProperty(categoryHeaderCatPx, 0),
				util.IntegerProperty(categoryPaddingCatPx, 0),
				util.IntegerProperty(categoryMarginTempPx, 0),
				util.IntegerProperty(categoryMinWidthCatPx, 0),
				util.IntegerProperty(categoryBaseWidthTempPx, 0),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				cpu0Category.Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				runningCategory.Define(),
			).Child().With( // CPU 0, PID 100 running 0-100
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pid(100),
				util.DurationProperty(offsetKey, 0),
				util.DurationProperty(durationKey, 100),
			).AndChild().With( // cpu 0, PID 200 running 100-150
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pid(200),
				util.DurationProperty(offsetKey, 100),
				util.DurationProperty(durationKey, 50),
			).AndChild().With( // cpu 0, PID 100 running 150-300
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pid(100),
				util.DurationProperty(offsetKey, 150),
				util.DurationProperty(durationKey, 150),
			).Parent().AndChild().With( // cpu0/waiting
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				waitingCategory.Define(),
			).Child().With( // CPU 0, no pids waiting 0-100
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pids(),
				util.DurationProperty(offsetKey, 0),
				util.DurationProperty(durationKey, 100),
			).AndChild().With( // CPU 0, pid 100 waiting 100-150
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pids(100),
				util.DurationProperty(offsetKey, 100),
				util.DurationProperty(durationKey, 50),
			).AndChild().With( // CPU 0, pid 200 waiting 150-200
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pids(200),
				util.DurationProperty(offsetKey, 150),
				util.DurationProperty(durationKey, 50),
			).AndChild().With( // CPU 0, pids 100 and 300 waiting 200-300
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pids(200, 300),
				util.DurationProperty(offsetKey, 200),
				util.DurationProperty(durationKey, 100),
			)
		},
	}, {
		// A trace showing the fanout of a root RPC through a tree of possibly-
		// concurrent child RPCs and local spans.  Each span has its own unique
		// category, and span ancestry is shown by the category hierarchy, but
		// spans themselves have no child spans.
		//
		// Root           | [             a             ]
		// |- Span 0      | [       b        ]
		//    |- Span 0.0 |   [   c   ]
		//    |- Span 0.1 |               [d]
		// |- Span 1      |                       [  e  ]
		//    |- Span 1.0 |                          [f]
		description: "category-nested concurrent (distributed trace)",
		buildTrace: func(db util.DataBuilder) {
			trace := New(db, continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(300)), &RenderSettings{})
			aCat := trace.Category(rpcACategory)
			aCat.Span(0, 300).With(rpc("a"))
			bCat := aCat.Category(rpcABCategory)
			bCat.Span(0, 180).With(rpc("b"))
			cCat := bCat.Category(rpcABCCategory)
			cCat.Span(20, 100).With(rpc("c"))
			dCat := bCat.Category(rpcABDCategory)
			dCat.Span(140, 20).With(rpc("d"))
			eCat := aCat.Category(rpcAECategory)
			eCat.Span(220, 60).With(rpc("e"))
			fCat := eCat.Category(rpcAEFCategory)
			fCat.Span(240, 10).With(rpc("f")).
				Subspan(240, 10, util.StringProperty("state", "local"))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			aCat := db.With( // rpc a category
				continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(300)).Define(),
				(&RenderSettings{}).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcACategory.Define(),
			)
			aCat.Child().With( // rpc a
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 0),
				util.DurationProperty(durationKey, 300),
				rpc("a"),
			)
			bCat := aCat.Child().With( // rpc a/b category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcABCategory.Define(),
			)
			bCat.Child().With( // rpc b
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 0),
				util.DurationProperty(durationKey, 180),
				rpc("b"),
			)
			bCat.Child().With( // rpc a/b/c category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcABCCategory.Define(),
			).Child().With( // rpc c
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 20),
				util.DurationProperty(durationKey, 100),
				rpc("c"),
			)
			bCat.Child().With( // rpc a/b/d category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcABDCategory.Define(),
			).Child().With( // rpc d
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 140),
				util.DurationProperty(durationKey, 20),
				rpc("d"),
			)
			eCat := aCat.Child().With( // rpc a/e category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcAECategory.Define(),
			)
			eCat.Child().With( // rpc e
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 220),
				util.DurationProperty(durationKey, 60),
				rpc("e"),
			)
			eCat.Child().With( // rpc a/e/f category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcAEFCategory.Define(),
			).Child().With( // rpc f
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 240),
				util.DurationProperty(durationKey, 10),
				rpc("f"),
			).Child().With( // f 'local' subspan
				util.IntegerProperty(nodeTypeKey, int64(subspanNodeType)),
				util.DurationProperty(offsetKey, 240),
				util.DurationProperty(durationKey, 10),
				util.StringProperty("state", "local"),
			)
		},
	}, {
		// A trace showing the overtime behavior of a sequence of calls and returns
		// within a single line of execution.
		//
		//         | [         foo         ]  [         foo         ]
		// PID 100 |   [  bar  ] [  bar  ]      [  bar  ] [  bar  ]
		//         |     [baz]     [baz]          [baz]     [baz]
		description: "nested sequential (user-instrumentation)",
		buildTrace: func(db util.DataBuilder) {
			pid100 := New(db, continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(200)), &RenderSettings{}).
				Category(pidCat(100), pid(100))
			foo0 := pid100.
				Span(0, 90).
				With(fun("foo"))
			foo0.
				Span(10, 30).
				With(fun("bar")).
				Span(15, 10).
				With(fun("baz"))
			foo0.
				Span(50, 30).
				With(fun("bar")).
				Span(55, 10).
				With(fun("baz"))
			foo1 := pid100.
				Span(100, 90).
				With(fun("foo"))
			foo1.
				Span(110, 30).
				With(fun("bar")).
				Span(115, 10).
				With(fun("baz"))
			foo1.
				Span(150, 30).
				With(fun("bar")).
				Span(155, 10).
				With(fun("baz"))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			pid100 := db.With(
				continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(200)).Define(),
				(&RenderSettings{}).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(100).Define(),
				pid(100),
			)
			foo0 := pid100.Child().With( // first foo
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 0),
				util.DurationProperty(durationKey, 90),
				fun("foo"),
			)
			foo0.Child().With( // first bar
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 10),
				util.DurationProperty(durationKey, 30),
				fun("bar"),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 15),
				util.DurationProperty(durationKey, 10),
				fun("baz"),
			)
			foo0.Child().With( // second bar
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 50),
				util.DurationProperty(durationKey, 30),
				fun("bar"),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 55),
				util.DurationProperty(durationKey, 10),
				fun("baz"),
			)
			foo1 := pid100.Child().With( // second foo
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 100),
				util.DurationProperty(durationKey, 90),
				fun("foo"),
			)
			foo1.Child().With( // third bar
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 110),
				util.DurationProperty(durationKey, 30),
				fun("bar"),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 115),
				util.DurationProperty(durationKey, 10),
				fun("baz"),
			)
			foo1.Child().With( // fourth bar
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 150),
				util.DurationProperty(durationKey, 30),
				fun("bar"),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 155),
				util.DurationProperty(durationKey, 10),
				fun("baz"),
			)
		},
	}, {
		// A nested trace with an overtime xy chart embedded in the toplevel
		// span.
		//
		//              01234567890123456789012345678901234567890123456789
		// task 100   | [ |.|.|.|.|.| <aggregate cpu time> |.|.|.|.|.|.| ]
		// |- tid 110 | [running ]          [running ]          [running ]
		// |- tid 120 |           [running ]          [running ]
		// |- tid 130 |                     [running ]
		description: "nested embedded payload",
		buildTrace: func(db util.DataBuilder) {
			task100 := New(db, continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(500)), &RenderSettings{}).
				Category(pidCat(100))
			task100.Span(0, 500).Payload("thumbnail").With(
				util.IntegersProperty("normalized_cpu_time", 1, 1, 2, 1, 1),
			)
			tid110 := task100.Category(pidCat(110))
			tid110.Span(0, 100)
			tid110.Span(200, 100)
			tid110.Span(400, 100)
			tid120 := task100.Category(pidCat(120))
			tid120.Span(100, 100)
			tid120.Span(300, 100)
			tid130 := task100.Category(pidCat(130))
			tid130.Span(200, 100)
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			task100 := db.With(
				continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(500)).Define(),
				(&RenderSettings{}).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(100).Define(),
			)
			task100.Child().With( // Task-level span
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 0),
				util.DurationProperty(durationKey, 500),
			).Child().With( // Binned payload data
				util.IntegerProperty(nodeTypeKey, int64(payloadNodeType)),
				util.StringProperty(payloadTypeKey, "thumbnail"),
				util.IntegersProperty("normalized_cpu_time", 1, 1, 2, 1, 1),
			)
			task100.Child().With( // TID 110 category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(110).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 0),
				util.DurationProperty(durationKey, 100),
			).AndChild().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 200),
				util.DurationProperty(durationKey, 100),
			).AndChild().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 400),
				util.DurationProperty(durationKey, 100),
			)
			task100.Child().With( // TID 120 category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(120).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 100),
				util.DurationProperty(durationKey, 100),
			).AndChild().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 300),
				util.DurationProperty(durationKey, 100),
			)
			task100.Child().With( // TID 130 category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(130).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.DurationProperty(offsetKey, 200),
				util.DurationProperty(durationKey, 100),
			)
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			err := testutil.CompareResponses(t, test.buildTrace, test.buildExplicit)
			if err != nil != test.wantErr {
				t.Fatalf("encountered unexpected error building the chart: %s", err)
			}
		})
	}
}
