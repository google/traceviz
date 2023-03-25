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

// Package logtrace supports parsing textual debug logs to extract their
// structure, and querying on those parsed logs.
package logtrace

import (
	"fmt"
	"strconv"
	"time"
)

// Log describes a log file from which trace data has been drawn.
type Log struct {
	// The filename or URL of this log.  Must be unique among Logs.
	Filename string
}

// Identifier returns a unique name for the receiving Log.
func (l *Log) Identifier() string {
	return l.Filename
}

// DisplayName returns a display name for the receiving Log.
func (l *Log) DisplayName() string {
	return l.Identifier()
}

func (l *Log) String() string {
	return l.Identifier()
}

// Level describes a log level for an Entry.
type Level struct {
	// The log level's label.  Must be unique among Levels.
	Label string
	// The log level's weight. By convention, lower is more severe, and 0 is the
	// minimum.  Must be unique among Levels.
	Weight int
}

// Identifier returns a unique name of the receiving Level.
func (l *Level) Identifier() string {
	return strconv.Itoa(l.Weight)
}

// DisplayName returns a display name for the receiving Label.
func (l *Level) DisplayName() string {
	return l.Label
}

func (l *Level) String() string {
	return l.Identifier()
}

// Key returns a key name for aggregated level counts.
func (l *Level) Key() string {
	return fmt.Sprintf("level_%d", l.Weight)
}

// SourceFile describes the source file for an Entry.
type SourceFile struct {
	// The source file name.  Must be unique among SourceFiles.
	Filename string
}

// Identifier returns a unique name of the receiving SourceLocation.
func (sf *SourceFile) Identifier() string {
	return sf.Filename
}

// DisplayName returns a display name for the receiving SourceLocation.
func (sf *SourceFile) DisplayName() string {
	return sf.Filename
}

func (sf *SourceFile) String() string {
	return sf.Identifier()
}

// SourceLocation describes the source location for an Entry.
type SourceLocation struct {
	SourceFile *SourceFile
	// The source line.  The combination of Filename and Line must be unique
	// among SourceLocations.
	Line int
}

// Identifier returns a unique name of the receiving SourceLocation.
func (sl *SourceLocation) Identifier() string {
	return fmt.Sprintf("%s:%d", sl.SourceFile.Filename, sl.Line)
}

// DisplayName returns a display name for the receiving SourceLocation.
func (sl *SourceLocation) DisplayName() string {
	return sl.Identifier()
}

func (sl *SourceLocation) String() string {
	return sl.Identifier()
}

// Process describes the process that produced an Entry.
type Process struct {
	// The process' PID.  Must be unique among Processes.
	PID int
}

// Identifier returns a unique name of the receiving Process.
func (p *Process) Identifier() string {
	return strconv.Itoa(p.PID)
}

// DisplayName returns a display name for the receiving Process.
func (p *Process) DisplayName() string {
	return fmt.Sprintf("PID %d", p.PID)
}

func (p *Process) String() string {
	return p.Identifier()
}

// Entry represents a single log entry.
type Entry struct {
	Time time.Time
	// log, Level, Process, and SourceLocation pointers are compared to determine
	// field equality.  A given LogReader should only use one instance of each of
	// these types for each distinct instance of that type.
	Log     *Log
	Level   *Level
	Process *Process
	// an Entry's SourceFile is referenced in its SourceLocation.
	SourceLocation *SourceLocation
	Message        []string
}

// NewEntry returns a new, empty Entry.
func NewEntry() *Entry {
	return &Entry{}
}

// In amends the receiver's Log field with the specified Log.
func (e *Entry) In(l *Log) *Entry {
	e.Log = l
	return e
}

// At amends the receiver's Time field with the specified time.
func (e *Entry) At(t time.Time) *Entry {
	e.Time = t
	return e
}

// WithLevel amends the receiver's Level field with the specified Level.
func (e *Entry) WithLevel(l *Level) *Entry {
	e.Level = l
	return e
}

// WithProcess amends the receiver's Process field with the specified Process.
func (e *Entry) WithProcess(p *Process) *Entry {
	e.Process = p
	return e
}

// From amends the receiver's SourceLocation field with the specified content.
func (e *Entry) From(sourceLoc *SourceLocation) *Entry {
	e.SourceLocation = sourceLoc
	return e
}

// WithMessage amends the receiver's Message field with the specified strings.
func (e *Entry) WithMessage(msgs ...string) *Entry {
	e.Message = msgs
	return e
}

// AssetCache is a cache of all Entry assets (Log, SourceLocation, Process, and
// Level) encountered while handling all logs in a trace, which permits an
// identity between identical assets from different logs.
type AssetCache struct {
	logs        map[string]*Log
	sourceFiles map[string]*SourceFile
	sourceLocs  map[*SourceFile]map[int]*SourceLocation
	processes   map[int]*Process
	levels      map[int]*Level
}

// NewAssetCache returns a new, empty AssetCache.
func NewAssetCache() *AssetCache {
	return &AssetCache{
		logs:        map[string]*Log{},
		sourceFiles: map[string]*SourceFile{},
		sourceLocs:  map[*SourceFile]map[int]*SourceLocation{},
		processes:   map[int]*Process{},
		levels:      map[int]*Level{},
	}
}

// Log fetches the Log with the specified filename from the receiving
// AssetCache, creating it if necessary.
func (ac *AssetCache) Log(filename string) *Log {
	log, ok := ac.logs[filename]
	if !ok {
		log = &Log{
			Filename: filename,
		}
		ac.logs[filename] = log
	}
	return log
}

// SourceLocation fetches the SourceLocation (including SourceFile) with the
// specified source file and line from the receiving AssetCache, creating it
// if necessary.
func (ac *AssetCache) SourceLocation(filename string, line int) *SourceLocation {
	sourceFile := ac.SourceFile(filename)
	sourceLines, ok := ac.sourceLocs[sourceFile]
	if !ok {
		sourceLines = map[int]*SourceLocation{}
		ac.sourceLocs[sourceFile] = sourceLines
	}
	loc, ok := sourceLines[line]
	if !ok {
		loc = &SourceLocation{
			SourceFile: sourceFile,
			Line:       line,
		}
		sourceLines[line] = loc
	}
	return loc
}

// SourceFile fetches the SourceFile with the specified filename from the
// receiving AssetCache, creating it if necessary.
func (ac *AssetCache) SourceFile(filename string) *SourceFile {
	sourceFile, ok := ac.sourceFiles[filename]
	if !ok {
		sourceFile = &SourceFile{
			Filename: filename,
		}
		ac.sourceFiles[filename] = sourceFile
	}
	return sourceFile
}

// Process fetches the Process with the specified PID from the receiving
// AssetCache, creating it if necessary.
func (ac *AssetCache) Process(pid int) *Process {
	process, ok := ac.processes[pid]
	if !ok {
		process = &Process{
			PID: pid,
		}
		ac.processes[pid] = process
	}
	return process
}

// Level fetches the Level with the specified weight and label from the
// receiving AssetCache, creating it if necessary.
func (ac *AssetCache) Level(weight int, label string) *Level {
	level, ok := ac.levels[weight]
	if !ok {
		level = &Level{
			Label:  label,
			Weight: weight,
		}
		ac.levels[weight] = level
	}
	return level
}

// Item is the type sent on the channel returned by a LogReader's Entries()
// method.  It is a union of a logentry.Entry and an error.
type Item struct {
	// The most-recently-parsed log entry.
	Entry *Entry
	// An error encountered while parsing.  If non-nil, Entry should be ignored,
	// and no further Items should be sent on the channel.
	Err error
}

// LogReader processes a single log into a sequence of logentry.Entry values.
type LogReader interface {
	// Entries returns a read-only channel producing Items, representing the
	// stream of log entries present in a log.  This channel is closed when
	// all log entries have been returned.  Once fetched, this channel must be
	// read until it closes.  May only be called once.
	Entries(ac *AssetCache) (<-chan *Item, error)
}