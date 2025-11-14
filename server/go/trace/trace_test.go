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
	categoryaxis "github.com/google/traceviz/server/go/category_axis"
	continuousaxis "github.com/google/traceviz/server/go/continuous_axis"
	"github.com/google/traceviz/server/go/payload"
	testutil "github.com/google/traceviz/server/go/test_util"
	"github.com/google/traceviz/server/go/util"
)

var (
	now = time.Now()
)

var zt time.Time

func ts(offset int) time.Time {
	return zt.Add(time.Duration(offset))
}

func ns(dur int) time.Duration {
	return time.Duration(dur) * time.Nanosecond
}

var rs = &RenderSettings{
	SpanWidthCatPx:   0,
	SpanPaddingCatPx: 0,
	CategoryAxisRenderSettings: &categoryaxis.RenderSettings{
		CategoryHeaderCatPx:    0,
		CategoryHandleValPx:    0,
		CategoryPaddingCatPx:   0,
		CategoryMarginValPx:    0,
		CategoryMinWidthCatPx:  0,
		CategoryBaseWidthValPx: 0,
	},
}

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
			trace := New(db, continuousaxis.NewDurationAxis(cat, ns(0), ns(300)), rs)
			cpu0 := trace.Category(cpu0Category)
			cpu0Running := cpu0.Category(runningCategory)
			cpu0Running.Span(ns(0), ns(100)).With(pid(100))
			cpu0Running.Span(ns(100), ns(150)).With(pid(200))
			cpu0Running.Span(ns(150), ns(300)).With(pid(100))
			cpu0Waiting := cpu0.Category(waitingCategory)
			cpu0Waiting.Span(ns(0), ns(100)).With(pids())
			cpu0Waiting.Span(ns(100), ns(150)).With(pids(100))
			cpu0Waiting.Span(ns(150), ns(200)).With(pids(200))
			cpu0Waiting.Span(ns(200), ns(300)).With(pids(200, 300))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			db.With(
				continuousaxis.NewDurationAxis(cat, 0*time.Nanosecond, 300*time.Nanosecond).Define(),
				util.IntegerProperty(spanWidthCatPxKey, 0),
				util.IntegerProperty(spanPaddingCatPxKey, 0),
				rs.CategoryAxisRenderSettings.Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				cpu0Category.Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				runningCategory.Define(),
			).Child().With( // CPU 0, PID 100 running 0-100
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pid(100),
				util.DurationProperty(startKey, ns(0)),
				util.DurationProperty(endKey, ns(100)),
			).AndChild().With( // cpu 0, PID 200 running 100-150
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pid(200),
				util.DurationProperty(startKey, ns(100)),
				util.DurationProperty(endKey, ns(150)),
			).AndChild().With( // cpu 0, PID 100 running 150-300
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pid(100),
				util.DurationProperty(startKey, ns(150)),
				util.DurationProperty(endKey, ns(300)),
			).Parent().AndChild().With( // cpu0/waiting
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				waitingCategory.Define(),
			).Child().With( // CPU 0, no pids waiting 0-100
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pids(),
				util.DurationProperty(startKey, ns(0)),
				util.DurationProperty(endKey, ns(100)),
			).AndChild().With( // CPU 0, pid 100 waiting 100-150
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pids(100),
				util.DurationProperty(startKey, ns(100)),
				util.DurationProperty(endKey, ns(150)),
			).AndChild().With( // CPU 0, pid 200 waiting 150-200
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pids(200),
				util.DurationProperty(startKey, ns(150)),
				util.DurationProperty(endKey, ns(200)),
			).AndChild().With( // CPU 0, pids 100 and 300 waiting 200-300
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				pids(200, 300),
				util.DurationProperty(startKey, ns(200)),
				util.DurationProperty(endKey, ns(300)),
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
			trace := New(db, continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(300)), rs)
			aCat := trace.Category(rpcACategory)
			aCat.Span(ts(0), ts(300)).With(rpc("a"))
			bCat := aCat.Category(rpcABCategory)
			bCat.Span(ts(0), ts(180)).With(rpc("b"))
			cCat := bCat.Category(rpcABCCategory)
			cCat.Span(ts(20), ts(120)).With(rpc("c"))
			dCat := bCat.Category(rpcABDCategory)
			dCat.Span(ts(140), ts(160)).With(rpc("d"))
			eCat := aCat.Category(rpcAECategory)
			eCat.Span(ts(220), ts(280)).With(rpc("e"))
			fCat := eCat.Category(rpcAEFCategory)
			fCat.Span(ts(240), ts(250)).With(rpc("f")).
				Subspan(ts(240), ts(250), util.StringProperty("state", "local"))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			aCat := db.With( // rpc a category
				continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(300)).Define(),
				(rs).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcACategory.Define(),
			)
			aCat.Child().With( // rpc a
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(0)),
				util.TimestampProperty(endKey, ts(300)),
				rpc("a"),
			)
			bCat := aCat.Child().With( // rpc a/b category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcABCategory.Define(),
			)
			bCat.Child().With( // rpc b
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(0)),
				util.TimestampProperty(endKey, ts(180)),
				rpc("b"),
			)
			bCat.Child().With( // rpc a/b/c category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcABCCategory.Define(),
			).Child().With( // rpc c
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(20)),
				util.TimestampProperty(endKey, ts(120)),
				rpc("c"),
			)
			bCat.Child().With( // rpc a/b/d category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcABDCategory.Define(),
			).Child().With( // rpc d
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(140)),
				util.TimestampProperty(endKey, ts(160)),
				rpc("d"),
			)
			eCat := aCat.Child().With( // rpc a/e category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcAECategory.Define(),
			)
			eCat.Child().With( // rpc e
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(220)),
				util.TimestampProperty(endKey, ts(280)),
				rpc("e"),
			)
			eCat.Child().With( // rpc a/e/f category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				rpcAEFCategory.Define(),
			).Child().With( // rpc f
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(240)),
				util.TimestampProperty(endKey, ts(250)),
				rpc("f"),
			).Child().With( // f 'local' subspan
				util.IntegerProperty(nodeTypeKey, int64(subspanNodeType)),
				util.TimestampProperty(startKey, ts(240)),
				util.TimestampProperty(endKey, ts(250)),
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
			pid100 := New(db, continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(200)), rs).
				Category(pidCat(100), pid(100))
			foo0 := pid100.
				Span(ts(0), ts(90)).
				With(fun("foo"))
			foo0.
				Span(ts(10), ts(40)).
				With(fun("bar")).
				Span(ts(15), ts(25)).
				With(fun("baz"))
			foo0.
				Span(ts(50), ts(80)).
				With(fun("bar")).
				Span(ts(55), ts(65)).
				With(fun("baz"))
			foo1 := pid100.
				Span(ts(100), ts(190)).
				With(fun("foo"))
			foo1.
				Span(ts(110), ts(140)).
				With(fun("bar")).
				Span(ts(115), ts(125)).
				With(fun("baz"))
			foo1.
				Span(ts(150), ts(180)).
				With(fun("bar")).
				Span(ts(155), ts(165)).
				With(fun("baz"))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			pid100 := db.With(
				continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(200)).Define(),
				(rs).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(100).Define(),
				pid(100),
			)
			foo0 := pid100.Child().With( // first foo
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(0)),
				util.TimestampProperty(endKey, ts(90)),
				fun("foo"),
			)
			foo0.Child().With( // first bar
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(10)),
				util.TimestampProperty(endKey, ts(40)),
				fun("bar"),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(15)),
				util.TimestampProperty(endKey, ts(25)),
				fun("baz"),
			)
			foo0.Child().With( // second bar
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(50)),
				util.TimestampProperty(endKey, ts(80)),
				fun("bar"),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(55)),
				util.TimestampProperty(endKey, ts(65)),
				fun("baz"),
			)
			foo1 := pid100.Child().With( // second foo
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(100)),
				util.TimestampProperty(endKey, ts(190)),
				fun("foo"),
			)
			foo1.Child().With( // third bar
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(110)),
				util.TimestampProperty(endKey, ts(140)),
				fun("bar"),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(115)),
				util.TimestampProperty(endKey, ts(125)),
				fun("baz"),
			)
			foo1.Child().With( // fourth bar
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(150)),
				util.TimestampProperty(endKey, ts(180)),
				fun("bar"),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(155)),
				util.TimestampProperty(endKey, ts(165)),
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
			task100 := New(db, continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(500)), rs).
				Category(pidCat(100))
			payload.New(task100.Span(ts(0), ts(500)), "thumbnail").With(
				util.IntegersProperty("normalized_cpu_time", 1, 1, 2, 1, 1),
			)
			tid110 := task100.Category(pidCat(110))
			tid110.Span(ts(0), ts(100))
			tid110.Span(ts(200), ts(300))
			tid110.Span(ts(400), ts(500))
			tid120 := task100.Category(pidCat(120))
			tid120.Span(ts(100), ts(200))
			tid120.Span(ts(300), ts(400))
			tid130 := task100.Category(pidCat(130))
			tid130.Span(ts(200), ts(300))
		},
		buildExplicit: func(db testutil.TestDataBuilder) {
			task100 := db.With(
				continuousaxis.NewTimestampAxis(cat, now.Add(0), now.Add(500)).Define(),
				(rs).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(100).Define(),
			)
			task100.Child().With( // Task-level span
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(0)),
				util.TimestampProperty(endKey, ts(500)),
			).Child().With( // Binned payload data
				util.StringProperty(payload.TypeKey, "thumbnail"),
				util.IntegersProperty("normalized_cpu_time", 1, 1, 2, 1, 1),
			)
			task100.Child().With( // TID 110 category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(110).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(0)),
				util.TimestampProperty(endKey, ts(100)),
			).AndChild().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(200)),
				util.TimestampProperty(endKey, ts(300)),
			).AndChild().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(400)),
				util.TimestampProperty(endKey, ts(500)),
			)
			task100.Child().With( // TID 120 category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(120).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(100)),
				util.TimestampProperty(endKey, ts(200)),
			).AndChild().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(300)),
				util.TimestampProperty(endKey, ts(400)),
			)
			task100.Child().With( // TID 130 category
				util.IntegerProperty(nodeTypeKey, int64(categoryNodeType)),
				pidCat(130).Define(),
			).Child().With(
				util.IntegerProperty(nodeTypeKey, int64(spanNodeType)),
				util.TimestampProperty(startKey, ts(200)),
				util.TimestampProperty(endKey, ts(300)),
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
