package logtrace

import (
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/google/traceviz/logviz/logger"
)

// LogTrace provides a programmatic interface for trace analysis of Logs data.
// Each log entry has a set of 'granularities' that can be used for filtering:
// source log, log level (severity), source file, and source location.  Each
// unique granularity has a unique identifier string.
// Each distinct Log, Level, and SourceLocation pointer should have
// exactly one instance, so a set of such pointers should contain all
// distinct items, with no duplicates.
//
// Once constructed, LogTrace is static: its members must not be updated.
type LogTrace struct {
	// For each distinct granularity, we maintain a mapping from granularity to
	// identifier string.
	Logs        map[*Log]string
	Levels      map[*Level]string
	SourceLocs  map[*SourceLocation]string
	SourceFiles map[*SourceFile]string

	// We also maintain maps to look up granularity by identifier string.
	LogsByID        map[string]*Log
	LevelsByID      map[string]*Level
	SourceLocsByID  map[string]*SourceLocation
	SourceFilesByID map[string]*SourceFile

	Entries []*Entry
}

// NewLogTrace returns a new LogTrace populated from the provided LogReader.
func NewLogTrace(lrs ...LogReader) (*LogTrace, error) {
	lt := &LogTrace{
		Logs:        map[*Log]string{},
		Levels:      map[*Level]string{},
		SourceLocs:  map[*SourceLocation]string{},
		SourceFiles: map[*SourceFile]string{},

		LogsByID:        map[string]*Log{},
		LevelsByID:      map[string]*Level{},
		SourceLocsByID:  map[string]*SourceLocation{},
		SourceFilesByID: map[string]*SourceFile{},
	}
	ac := NewAssetCache()
	for _, lr := range lrs {
		entryCh, err := lr.Entries(ac)
		if err != nil {
			log.Print(logger.Error("failed to create logtracer data source: %s", err))
			return nil, fmt.Errorf("failed to create logtracer data source: %s", err)
		}
		for item := range entryCh {
			if item.Err != nil {
				log.Printf(logger.Error("failure fetching log Entries: %s", item.Err))
				return nil, fmt.Errorf("failure fetching log Entries: %s", item.Err)
			}
			lt.Logs[item.Entry.Log] = item.Entry.Log.Identifier()
			lt.LogsByID[item.Entry.Log.Identifier()] = item.Entry.Log
			lt.Levels[item.Entry.Level] = item.Entry.Level.Identifier()
			lt.LevelsByID[item.Entry.Level.Identifier()] = item.Entry.Level
			lt.SourceLocs[item.Entry.SourceLocation] = item.Entry.SourceLocation.Identifier()
			lt.SourceLocsByID[item.Entry.SourceLocation.Identifier()] = item.Entry.SourceLocation
			lt.SourceFiles[item.Entry.SourceLocation.SourceFile] = item.Entry.SourceLocation.SourceFile.Identifier()
			lt.SourceFilesByID[item.Entry.SourceLocation.SourceFile.Identifier()] = item.Entry.SourceLocation.SourceFile
			lt.Entries = append(lt.Entries, item.Entry)
		}
	}
	if len(lt.Entries) == 0 {
		log.Print(logger.Error("log trace has no Entries"))
		return nil, fmt.Errorf("log trace has no Entries")
	}
	// Order Entries by timestamp ascending.
	sort.Slice(lt.Entries, func(x, y int) bool {
		return lt.Entries[x].Time.Before(lt.Entries[y].Time)
	})
	return lt, nil
}

// TimeRange returns the start and end times of the receiver LogTrace.  It is
// safe for concurrent access.
func (lt *LogTrace) TimeRange() (time.Time, time.Time) {
	return lt.Entries[0].Time, lt.Entries[len(lt.Entries)-1].Time
}

// ForEachEntry executes the provided callback function for each Entry
// satisfying the provided Filters.  It is safe for concurrent access.
func (lt *LogTrace) ForEachEntry(fn func(entry *Entry) error, fs ...Filter) error {
	f, err := lt.filter(fs...)
	if err != nil {
		return err
	}
	for _, e := range f.filterRangeTemporal(lt.Entries) {
		if f.entryFilteredIn(e) {
			if err := fn(e); err != nil {
				return err
			}
		}
	}
	return nil
}
