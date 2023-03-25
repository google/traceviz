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

// Package loggerreader provides a logtrace.LogReader implementation for logger
// output.
package loggerreader

import (
	"regexp"
	"strconv"
	"time"

	"github.com/google/traceviz/logviz/logger"
)

// LineParser describes an interface for parsing line-based textual logs.
type LineParser interface {
	// ParseLine parses the provided line, returning an equivalent Entry, or
	// nil if the line could not be parsed as a line entry.  Any errors are
	// also returned.
	// The inability to parse a given line is not necessarily an error.  If
	// ParseLine returns `(nil, nil)`, the entire line's contents will be
	// appended, with an initial `\n`, to the previous log entry, if there is
	// one.  In this way, multiline log entries can be supported.
	ParseLine(ac *logtracer.AssetCache, line string) (*logtracer.Entry, error)
}

var defaultLevels = map[string]struct {
	weight int
	label  string
}{
	"F": {0, "Fatal"},
	"E": {1, "Error"},
	"W": {2, "Warning"},
	"I": {3, "Info"},
}

type defaultLineParser struct {
	re   *regexp.Regexp
	tz   *time.Location
	now  time.Time
	year int
}

func (dlp *defaultLineParser) ParseLine(ac *logtracer.AssetCache, line string) (*logtracer.Entry, error) {
	matches := dlp.re.FindStringSubmatch(line)
	if len(matches) == 0 {
		return nil, nil
	}
	if len(matches) != 12 {
		return nil, logger.Errorf( "can't parse log line '%s'", line)
	}
	lev, ok := defaultLevels[matches[1]]
	if !ok {
		return nil, logger.Errorf( "unrecognized level '%s'", matches[1])
	}
	e := logtracer.NewEntry().
		WithLevel(ac.Level(lev.weight, lev.label)).
		WithMessage(matches[11])
	pid, err := strconv.Atoi(matches[8])
	if err != nil {
		return nil, logger.Errorf( "failed to parse PID `%s` as int", matches[8])
	}

	e.WithProcess(ac.Process(pid))
	month, err := strconv.Atoi(matches[2])
	if err != nil {
		return nil, logger.Errorf( "failed to parse month `%s` as int", matches[2])
	}
	day, err := strconv.Atoi(matches[3])
	if err != nil {
		return nil, logger.Errorf( "failed to parse day `%s` as int", matches[3])
	}
	hour, err := strconv.Atoi(matches[4])
	if err != nil {
		return nil, logger.Errorf( "failed to parse hour `%s` as int", matches[4])
	}
	minute, err := strconv.Atoi(matches[5])
	if err != nil {
		return nil, logger.Errorf( "failed to parse minute `%s` as int", matches[5])
	}
	second, err := strconv.Atoi(matches[6])
	if err != nil {
		return nil, logger.Errorf( "failed to parse seconds `%s` as int", matches[6])
	}
	usec, err := strconv.Atoi(matches[7])
	if err != nil {
		return nil, logger.Errorf( "failed to parse usec `%s` as int", matches[7])
	}
	// Assume the log's from the current year.  If that puts it in the future,
	// assume it's from last year.
	t := time.Date(dlp.year, time.Month(month), day, hour, minute, second, usec*1000, dlp.tz)
	if dlp.now.Before(t) {
		t = time.Date(dlp.year-1, time.Month(month), day, hour, minute, second, usec*1000, dlp.tz)
	}
	e.At(t)
	lineNumber, err := strconv.Atoi(matches[10])
	if err != nil {
		return nil, logger.Errorf( "failed to parse usec `%s` as int", matches[10])
	}
	return e.From(ac.SourceLocation(matches[9], lineNumber)), nil
}

// DefaultLineParser is a LineParser implementation that expects log line
// formats like `Lmmdd hh:mm:ss.uuuuuu PID file:line] msg`, with times in
// America/Los_Angeles and dates within the twelve months prior to the
// provided 'now' timestamp.
func DefaultLineParser(now time.Time) LineParser {
	tz, err := time.LoadLocation("America/Los_Angeles")
	if err != nil {
		panic("Failed to load time zone America/Los_Angeles")
	}
	// Lmmdd hh:mm:ss.uuuuuu PID file:line] msg
	return &defaultLineParser{
		re:   regexp.MustCompile(`^([IWEF])(\d{2})(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{6})\s+(\d+) ([^:]+):(\d+)\] (.*)$`),
		tz:   tz,
		now:  now,
		year: now.Year(),
	}
}

// TextLogReader converts a textual log (expressed as a channel of strings)
// into a stream of logtracer.Entrys.
type TextLogReader struct {
	logFilename string
	lp          LineParser
	lines       <-chan string
}

// New returns a new TextLogReader drawing from the provided string channel
// and using the provided LineParser to parse text logs.
func New(filename string, lp LineParser, lines <-chan string) *TextLogReader {
	return &TextLogReader{
		logFilename: filename,
		lp:          lp,
		lines:       lines,
	}
}

// Entries returns a readable channel producing logtracer.Items.  This channel
// is closed only after the receiver's `lines` channel is closed, or when a
// parsing error is encountered -- in the latter case, the last Item sent on
// the channel will contain that error.  Entries may only be called once on a
// given TextLogReader.
func (tlr *TextLogReader) Entries(ac *logtracer.AssetCache) (<-chan *logtracer.Item, error) {
	if tlr.lines == nil {
		return nil, logger.Errorf( "a LogReader's Entries() method may only be called once")
	}
	lines := tlr.lines
	tlr.lines = nil
	entries := make(chan *logtracer.Item)
	// This goroutine will leak if a caller to Entries() fails to read the
	// entries channel until it closes.
	go func(lines <-chan string, entries chan<- *logtracer.Item) {
		var lastEntry *logtracer.Entry
		for line := range lines {
			thisEntry, err := tlr.lp.ParseLine(ac, line)
			if err != nil {
				entries <- &logtracer.Item{
					Err: err,
				}
				close(entries)
				return
			}
			// We've parsed a new entry; send the old one down the pipe.
			if thisEntry != nil {
				thisEntry.In(ac.Log(tlr.logFilename))
				if lastEntry != nil {
					entries <- &logtracer.Item{
						Entry: lastEntry,
					}
				}
				lastEntry = thisEntry
			}
			// This line wasn't a new entry; if there's an old entry, append this
			// line to its message.
			if thisEntry == nil {
				if lastEntry == nil {
					entries <- &logtracer.Item{
						Err: logger.Errorf( "failed to parse log line '%s'", line),
					}
					close(entries)
					return
				}
				lastEntry.Message = append(lastEntry.Message, line)
			}
		}
		// Send any last entry along the pipe, then close it.
		if lastEntry != nil {
			entries <- &logtracer.Item{
				Entry: lastEntry,
			}
		}
		close(entries)
	}(lines, entries)
	return entries, nil
}