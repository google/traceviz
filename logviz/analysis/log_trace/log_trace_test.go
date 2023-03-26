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

package logtrace

import (
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
)

type testLogReader struct {
	logName string
	entries []*Entry
}

func newTestLogReader(logName string, entries ...*Entry) *testLogReader {
	return &testLogReader{
		logName: logName,
		entries: entries,
	}
}

func (tlr *testLogReader) Log(ac *AssetCache) *Log {
	return ac.Log(tlr.logName)
}

func (tlr *testLogReader) Entries(ac *AssetCache) (<-chan *Item, error) {
	itemCh := make(chan *Item)
	go func() {
		for _, entry := range tlr.entries {
			itemCh <- &Item{
				Entry: entry,
			}
		}
		close(itemCh)
	}()
	return itemCh, nil
}

var startTime = time.Unix(0, 0)

func testTime(sec int) time.Time {
	return startTime.Add(time.Second * time.Duration(sec))
}

// A global AssetCache
var ac = NewAssetCache()

var entrySets = map[string][]*Entry{
	"mylog": []*Entry{
		NewEntry().
			In(ac.Log("mylog")).
			At(testTime(0)).
			From(ac.SourceLocation("a.cc", 10)).
			WithLevel(ac.Level(3, "Info")).
			WithMessage("hello"),
		NewEntry().
			In(ac.Log("mylog")).
			At(testTime(10)).
			From(ac.SourceLocation("b.cc", 10)).
			WithLevel(ac.Level(1, "Error")).
			WithMessage("UH OH"),
		NewEntry().
			In(ac.Log("mylog")).
			At(testTime(20)).
			From(ac.SourceLocation("a.cc", 20)).
			WithLevel(ac.Level(2, "Warning")).
			WithMessage("Careful"),
		NewEntry().
			In(ac.Log("mylog")).
			At(testTime(30)).
			From(ac.SourceLocation("a.cc", 30)).
			WithLevel(ac.Level(3, "Info")).
			WithMessage("Hi again :3"),
		NewEntry().
			In(ac.Log("mylog")).
			At(testTime(40)).
			From(ac.SourceLocation("a.cc", 40)).
			WithLevel(ac.Level(0, "Fatal")).
			WithMessage("Crashing..."),
	},
}

func lt(t *testing.T, lrs ...LogReader) *LogTrace {
	lt, err := NewLogTrace(lrs...)
	if err != nil {
		t.Fatalf("Failed to create LogTrace: %s", err)
	}
	return lt
}

func TestForEachEntryAndFiltering(t *testing.T) {
	for _, test := range []struct {
		description string
		logTrace    *LogTrace
		filters     []Filter
		wantEntries []*Entry
	}{{
		description: "no filters",
		logTrace: lt(t,
			newTestLogReader("log", entrySets["mylog"]...),
		),
		wantEntries: []*Entry{
			entrySets["mylog"][0],
			entrySets["mylog"][1],
			entrySets["mylog"][2],
			entrySets["mylog"][3],
			entrySets["mylog"][4],
		},
	}, {
		description: "filter to mylog and before 5 sec, concatenated",
		logTrace: lt(t,
			newTestLogReader("log", entrySets["mylog"]...),
		),
		filters: []Filter{
			ConcatenateFilters(
				WithLogs(ac.Log("mylog")),
				WithEndTime(testTime(5)),
			),
		},
		wantEntries: []*Entry{
			entrySets["mylog"][0],
		},
	}, {
		description: "filter to source file a.cc",
		logTrace: lt(t,
			newTestLogReader("log", entrySets["mylog"]...),
		),
		filters: []Filter{
			WithSourceFiles(ac.SourceFile("a.cc")),
		},
		wantEntries: []*Entry{
			entrySets["mylog"][0],
			entrySets["mylog"][2],
			entrySets["mylog"][3],
			entrySets["mylog"][4],
		},
	}, {
		description: "filter to log level 'Info'",
		logTrace: lt(t,
			newTestLogReader("log", entrySets["mylog"]...),
		),
		filters: []Filter{
			WithLevels(ac.Level(3, "Info")),
		},
		wantEntries: []*Entry{
			entrySets["mylog"][0],
			entrySets["mylog"][3],
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			gotEntries := []*Entry{}
			if err := test.logTrace.ForEachEntry(func(entry *Entry) error {
				gotEntries = append(gotEntries, entry)
				return nil
			}, test.filters...); err != nil {
				t.Fatalf("ForEachEntry() yielded unexpected error %s", err)
			}
			if diff := cmp.Diff(test.wantEntries, gotEntries); diff != "" {
				t.Errorf("ForEachEntry() = %v, diff (-want +got): %s", gotEntries, diff)
			}
		})
	}
}
