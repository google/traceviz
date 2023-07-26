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

package logreader

import (
	"bufio"
	"strings"
	"testing"
	"time"

	logtrace "github.com/google/traceviz/logviz/analysis/log_trace"

	"github.com/google/go-cmp/cmp"
)

func TestLogReader(t *testing.T) {
	for _, test := range []struct {
		description string
		log         string
		wantEntries []*logtrace.Entry
	}{{
		description: "reads simple log",
		log:         "2023/01/02 03:04:05.000006 hello.cc:7: [I] Hello there",
		wantEntries: []*logtrace.Entry{
			logtrace.NewEntry().
				In(&logtrace.Log{
					Filename: "test",
				}).
				At(time.Date(2023, 01, 02, 03, 04, 05, 6000, time.UTC)).
				WithLevel(&logtrace.Level{
					Label:  "Info",
					Weight: 3,
				}).
				From(&logtrace.SourceLocation{
					SourceFile: &logtrace.SourceFile{
						Filename: "hello.cc",
					},
					Line: 7,
				}).
				WithMessage("Hello there"),
		},
	}, {
		description: "multiline log",
		log: `
2023/01/02 03:04:05.000006 /foo/bar/hello.cc:7: [I] Hello there
I'm glad you're here!`,
		wantEntries: []*logtrace.Entry{
			logtrace.NewEntry().
				In(&logtrace.Log{
					Filename: "test",
				}).
				At(time.Date(2023, 01, 02, 03, 04, 05, 6000, time.UTC)).
				WithLevel(&logtrace.Level{
					Label:  "Info",
					Weight: 3,
				}).
				From(&logtrace.SourceLocation{
					SourceFile: &logtrace.SourceFile{
						Filename: "/foo/bar/hello.cc",
					},
					Line: 7,
				}).
				WithMessage("Hello there", "I'm glad you're here!"),
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			// Ignore empty lines; they're useful for writing the test cases
			// comfortably.
			log := strings.TrimSpace(test.log)
			reader := New("test", ReaderCloser{Reader: bufio.NewReader(strings.NewReader(log))}, NewSimpleLogParser())
			entryCh, err := reader.Entries(logtrace.NewAssetCache())
			if err != nil {
				t.Fatalf("Failed to fetch entries: %s", err)
			}
			gotEntries := []*logtrace.Entry{}
			for item := range entryCh {
				if item.Err != nil {
					t.Errorf("Unexpected parsing error %s", item.Err)
					return
				}
				gotEntries = append(gotEntries, item.Entry)
			}
			if diff := cmp.Diff(test.wantEntries, gotEntries); diff != "" {
				t.Errorf("Entries() => %v, diff (-want +got) %s", gotEntries, diff)
			}
		})
	}
}
