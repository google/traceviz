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

package loggerreader

import (
	"testing"
	"time"

	"github.com/google/traceviz/logviz/analysis/logtrace"

	"github.com/google/go-cmp/cmp"
)

func TestLogReader(t *testing.T) {
	loc, err := time.LoadLocation("America/Los_Angeles")
	if err != nil {
		t.Fatalf("failed to load default time zone: %s", err)
	}
	now := time.Date(2000, 12, 31, 23, 59, 59, 999999999, loc)
	for _, test := range []struct {
		description string
		log         []string
		wantEntries []*logtracer.Entry
	}{{
		description: "reads simple log",
		log: []string{
			"I0102 03:04:05.000006 7 hello.cc:8] Hello there",
		},
		wantEntries: []*logtracer.Entry{
			logtracer.NewEntry().
				In(&logtracer.Log{
					Filename: "test",
				}).
				At(time.Date(2000, 01, 02, 03, 04, 05, 6000, loc)).
				WithLevel(&logtracer.Level{
					Label:  "Info",
					Weight: 3,
				}).
				WithProcess(&logtracer.Process{
					PID: 7,
				}).
				From(&logtracer.SourceLocation{
					SourceFile: &logtracer.SourceFile{
						Filename: "hello.cc",
					},
					Line: 8,
				}).
				WithMessage("Hello there"),
		},
	}, {
		description: "multiline log",
		log: []string{
			"I0102 03:04:05.000006 7 hello.cc:8] Hello there",
			"I'm glad you're here!",
		},
		wantEntries: []*logtracer.Entry{
			logtracer.NewEntry().
				In(&logtracer.Log{
					Filename: "test",
				}).
				At(time.Date(2000, 01, 02, 03, 04, 05, 6000, loc)).
				WithLevel(&logtracer.Level{
					Label:  "Info",
					Weight: 3,
				}).
				WithProcess(&logtracer.Process{
					PID: 7,
				}).
				From(&logtracer.SourceLocation{
					SourceFile: &logtracer.SourceFile{
						Filename: "hello.cc",
					},
					Line: 8,
				}).
				WithMessage("Hello there", "I'm glad you're here!"),
		},
	}} {
		t.Run(test.description, func(t *testing.T) {
			logCh := make(chan string)
			go func() {
				for _, line := range test.log {
					logCh <- line
				}
				close(logCh)
			}()
			reader := New("test", DefaultLineParser(now), logCh)
			entryCh, err := reader.Entries(logtracer.NewAssetCache())
			if err != nil {
				t.Fatalf("Failed to fetch entries: %s", err)
			}
			gotEntries := []*logtracer.Entry{}
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