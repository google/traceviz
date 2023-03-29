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
//
// This is not a serious log parsing package.  Its own internal logging is
// goofy and over-the-top to generate interesting logs for logviz to visualize.
// Consider
package loggerreader

import (
	"fmt"
	"log"
	"regexp"
	"strconv"
	"time"

	logtrace "github.com/google/traceviz/logviz/analysis/log_trace"
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
	ParseLine(ac *logtrace.AssetCache, line string) (*logtrace.Entry, error)
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
	re *regexp.Regexp
	tz *time.Location
}

func (dlp *defaultLineParser) ParseLine(ac *logtrace.AssetCache, line string) (*logtrace.Entry, error) {
	matches := dlp.re.FindStringSubmatch(line)
	log.Printf("got %d matches", len(matches))
	if len(matches) == 0 {
		return nil, nil
	}
	if len(matches) != 12 {
		log.Print(logger.Error("can't parse log line '%s'", line))
		return nil, fmt.Errorf("can't parse log line '%s'", line)
	}
	e := logtrace.NewEntry().
		WithMessage(matches[11])
	year, err := strconv.Atoi(matches[1])
	if err != nil {
		log.Printf(logger.Error("failed to parse year `%s` as int", matches[1]))
		return nil, fmt.Errorf("failed to parse year `%s` as int", matches[1])
	}
	month, err := strconv.Atoi(matches[2])
	if err != nil {
		log.Printf(logger.Error("failed to parse month `%s` as int", matches[2]))
		return nil, fmt.Errorf("failed to parse month `%s` as int", matches[2])
	}
	day, err := strconv.Atoi(matches[3])
	if err != nil {
		log.Print(logger.Error("failed to parse day `%s` as int", matches[3]))
		return nil, fmt.Errorf("failed to parse day `%s` as int", matches[3])
	}
	hour, err := strconv.Atoi(matches[4])
	if err != nil {
		log.Print(logger.Error("failed to parse hour `%s` as int", matches[4]))
		return nil, fmt.Errorf("failed to parse hour `%s` as int", matches[4])
	}
	minute, err := strconv.Atoi(matches[5])
	if err != nil {
		log.Print(logger.Error("failed to parse minute `%s` as int", matches[5]))
		return nil, fmt.Errorf("failed to parse minute `%s` as int", matches[5])
	}
	second, err := strconv.Atoi(matches[6])
	if err != nil {
		log.Print(logger.Error("failed to parse seconds `%s` as int", matches[6]))
		return nil, fmt.Errorf("failed to parse seconds `%s` as int", matches[6])
	}
	usec, err := strconv.Atoi(matches[7])
	if err != nil {
		log.Print(logger.Error("failed to parse usec `%s` as int", matches[7]))
		return nil, fmt.Errorf("failed to parse usec `%s` as int", matches[7])
	}
	// Assume the log's from the current year.  If that puts it in the future,
	// assume it's from last year.
	t := time.Date(year, time.Month(month), day, hour, minute, second, usec*1000, dlp.tz)
	e.At(t)
	lineNumber, err := strconv.Atoi(matches[9])
	if err != nil {
		log.Print(logger.Error("failed to parse line number `%s` as int", matches[9]))
		return nil, fmt.Errorf("failed to parse line number `%s` as int", matches[9])
	}
	e.From(ac.SourceLocation(matches[8], lineNumber))
	lev, ok := defaultLevels[matches[10]]
	if !ok {
		log.Printf(logger.Error("unrecognized level '%s'", matches[1]))
		return nil, fmt.Errorf("unrecognized level '%s'", matches[1])
	}
	e.WithLevel(ac.Level(lev.weight, lev.label))
	return e, nil
}

// DefaultLineParser is a LineParser implementation that expects log line
// formats like `Lmmdd hh:mm:ss.uuuuuu PID file:line] msg`, with times in
// America/Los_Angeles and dates within the twelve months prior to the
// provided 'now' timestamp.
func DefaultLineParser() LineParser {
	// Groups:
	//   1: Year
	//   2: Month
	//   3: Day
	//   4: Hour
	//   5: Minute
	//   6: Second
	//   7: Microsecond
	//   8: Filename
	//   9: Source line
	//  10: Severity
	//  11: Message
	// Lmmdd hh:mm:ss.uuuuuu PID file:line] msg
	return &defaultLineParser{
		re: regexp.MustCompile(`^(\d{4})/(\d{2})/(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{6}) ([^:]*):(\d+): \[([IWEFP])\] (.*)$`),
		tz: time.UTC,
	}
}

// TextLogReader converts a textual log (expressed as a channel of strings)
// into a stream of logtrace.Entrys.
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

// Entries returns a readable channel producing logtrace.Items.  This channel
// is closed only after the receiver's `lines` channel is closed, or when a
// parsing error is encountered -- in the latter case, the last Item sent on
// the channel will contain that error.  Entries may only be called once on a
// given TextLogReader.
func (tlr *TextLogReader) Entries(ac *logtrace.AssetCache) (<-chan *logtrace.Item, error) {
	if tlr.lines == nil {
		log.Print(logger.Error("a LogReader's Entries() method may only be called once"))
		return nil, fmt.Errorf("a LogReader's Entries() method may only be called once")
	}
	lines := tlr.lines
	tlr.lines = nil
	entries := make(chan *logtrace.Item)
	// This goroutine will leak if a caller to Entries() fails to read the
	// entries channel until it closes.
	go func(lines <-chan string, entries chan<- *logtrace.Item) {
		var lastEntry *logtrace.Entry
		for line := range lines {
			thisEntry, err := tlr.lp.ParseLine(ac, line)
			if err != nil {
				entries <- &logtrace.Item{
					Err: err,
				}
				close(entries)
				return
			}
			// We've parsed a new entry; send the old one down the pipe.
			if thisEntry != nil {
				thisEntry.In(ac.Log(tlr.logFilename))
				if lastEntry != nil {
					entries <- &logtrace.Item{
						Entry: lastEntry,
					}
				}
				lastEntry = thisEntry
			}
			// This line wasn't a new entry; if there's an old entry, append this
			// line to its message.
			if thisEntry == nil {
				if lastEntry == nil {
					log.Print(logger.Error("failed to parse log line '%s'", line))
					entries <- &logtrace.Item{
						Err: fmt.Errorf("failed to parse log line '%s'", line),
					}
					close(entries)
					return
				}
				lastEntry.Message = append(lastEntry.Message, line)
			}
		}
		// Send any last entry along the pipe, then close it.
		if lastEntry != nil {
			entries <- &logtrace.Item{
				Entry: lastEntry,
			}
		}
		close(entries)
	}(lines, entries)
	return entries, nil
}
