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

package logtracer

import (
	"sort"
	"time"
)

// Filter is a composable filter for log-tracer queries.
type Filter func(f *filter) error

type filter struct {
	logs        map[*Log]struct{}
	levels      map[*Level]struct{}
	processes   map[*Process]struct{}
	sourceLocs  map[*SourceLocation]struct{}
	sourceFiles map[*SourceFile]struct{}
	startTime   time.Time
	endTime     time.Time
}

// WithLogs returns a Filter filtering in the specified Logs.
func WithLogs(logs ...*Log) Filter {
	return func(f *filter) error {
		for _, log := range logs {
			f.logs[log] = struct{}{}
		}
		return nil
	}
}

// WithLevels returns a Filter filtering in the specified Levels.
func WithLevels(levels ...*Level) Filter {
	return func(f *filter) error {
		for _, level := range levels {
			f.levels[level] = struct{}{}
		}
		return nil
	}
}

// WithProcesses returns a Filter filtering in the specified Processes.
func WithProcesses(processes ...*Process) Filter {
	return func(f *filter) error {
		for _, process := range processes {
			f.processes[process] = struct{}{}
		}
		return nil
	}
}

// WithSourceLocations returns a Filter filtering in the specified
// SourceLocations.
func WithSourceLocations(locs ...*SourceLocation) Filter {
	return func(f *filter) error {
		for _, loc := range locs {
			f.sourceLocs[loc] = struct{}{}
		}
		return nil
	}
}

// WithSourceFiles returns a Filter filtering in the specified
// SourceFiles.
func WithSourceFiles(sfs ...*SourceFile) Filter {
	return func(f *filter) error {
		for _, sf := range sfs {
			f.sourceFiles[sf] = struct{}{}
		}
		return nil
	}
}

// WithStartTime returns a Filter filtering in from the specified start time.
func WithStartTime(time time.Time) Filter {
	return func(f *filter) error {
		f.startTime = time
		return nil
	}
}

// WithEndTime returns a Filter filtering in from the specified end time.
func WithEndTime(time time.Time) Filter {
	return func(f *filter) error {
		f.endTime = time
		return nil
	}
}

// ConcatenateFilters returns the contatenation of the provided Filters.
func ConcatenateFilters(filters ...Filter) Filter {
	return func(f *filter) error {
		for _, filt := range filters {
			if err := filt(f); err != nil {
				return err
			}
		}
		return nil
	}
}

func (lt *LogTrace) filter(filters ...Filter) (*filter, error) {
	start, end := lt.TimeRange()
	ret := &filter{
		logs:        map[*Log]struct{}{},
		levels:      map[*Level]struct{}{},
		processes:   map[*Process]struct{}{},
		sourceLocs:  map[*SourceLocation]struct{}{},
		sourceFiles: map[*SourceFile]struct{}{},
		startTime:   start,
		endTime:     end,
	}
	for _, filter := range filters {
		if err := filter(ret); err != nil {
			return nil, err
		}
	}
	if ret.startTime.Before(start) {
		ret.startTime = start
	}
	if ret.endTime.After(end) {
		ret.endTime = end
	}
	return ret, nil
}

// filterRangeTemporal returns the interval within the provided Entry slice,
// which must be time-ordered increasing, filtered in by the receiving filter.
func (f *filter) filterRangeTemporal(entries []*Entry) []*Entry {
	if len(entries) == 0 {
		return entries
	}
	startTime := entries[0].Time
	endTime := entries[len(entries)-1].Time
	startIdx := 0
	if f.startTime.After(startTime) {
		startIdx = sort.Search(len(entries), func(pos int) bool {
			return !entries[pos].Time.Before(f.startTime)
		})
	}
	endIdx := len(entries)
	if f.endTime.Before(endTime) {
		endIdx = sort.Search(len(entries), func(pos int) bool {
			return entries[pos].Time.After(f.endTime)
		})
	}

	return entries[startIdx:endIdx]
}

// entryFilteredIn determines if the provided Entry is filtered in per the
// receiving filter.  If the receiver has temporal filtering, this is not
// considered; the caller should maintain a time-ordered list of Entries and
// filter down into it with filter.filterRangeTemporal.
func (f *filter) entryFilteredIn(e *Entry) bool {
	if e.Time.After(f.endTime) || e.Time.Before(f.startTime) {
		return false
	}
	if len(f.logs) > 0 {
		if _, ok := f.logs[e.Log]; !ok {
			return false
		}
	}
	if len(f.levels) > 0 {
		if _, ok := f.levels[e.Level]; !ok {
			return false
		}
	}
	if len(f.processes) > 0 {
		if _, ok := f.processes[e.Process]; !ok {
			return false
		}
	}
	if len(f.sourceLocs) > 0 {
		if _, ok := f.sourceLocs[e.SourceLocation]; !ok {
			return false
		}
	}
	if len(f.sourceFiles) > 0 {
		if _, ok := f.sourceFiles[e.SourceLocation.SourceFile]; !ok {
			return false
		}
	}
	return true
}