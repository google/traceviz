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

// Package logreader provides a logtrace.LogReader implementation for logger
// output.
//
// This is not a serious log parsing package.  Its own internal logging is
// goofy and over-the-top to generate interesting logs for logviz to visualize.
package logreader

import (
	"bufio"
	"fmt"
	"io"
	"strings"
	"time"

	logtrace "github.com/google/traceviz/logviz/analysis/log_trace"
)

// TextLogReader converts a textual log (represented as a bufio.Reader)
// into a stream of logtrace.Entrys.
type TextLogReader struct {
	logFilename string
	reader      ReaderCloser
	parser      LogParser
}

type ReaderCloser struct {
	*bufio.Reader
	io.Closer
}

func (r *ReaderCloser) Close() {
	if r.Closer != nil {
		r.Closer.Close()
	}
}

type LogParser interface {
	Init(reader *bufio.Reader, logfilename string, ac *logtrace.AssetCache)
	ReadLogEntry() (logtrace.Entry, error)
}

type CockroachDBLogParser struct {
	decoder     crdbV2Decoder
	ac          *logtrace.AssetCache
	logFilename string
}

var _ LogParser = &CockroachDBLogParser{}

// Init is part of the LogParser interface.
func (c *CockroachDBLogParser) Init(reader *bufio.Reader, logFilename string, ac *logtrace.AssetCache) {
	c.ac = ac
	c.logFilename = logFilename
	c.decoder = crdbV2Decoder{
		reader: reader,
	}
}

// ReadLogLine is part of the LogParser interface.
func (c *CockroachDBLogParser) ReadLogEntry() (logtrace.Entry, error) {
	crdbEntry := &crdbEntry{}
	err := c.decoder.decode(crdbEntry)
	if err != nil {
		return logtrace.Entry{}, err
	}
	return logtrace.Entry{
		Time:           time.Unix(0, crdbEntry.Time),
		Log:            c.ac.Log(c.logFilename),
		Level:          c.ac.Level(crdbSeverityWeight[crdbEntry.Severity], crdbSeverityName[crdbEntry.Severity]),
		SourceLocation: c.ac.SourceLocation(crdbEntry.File, int(crdbEntry.Line)),
		Message:        strings.Split(crdbEntry.Message, "\n"),
	}, nil
}

// New returns a new TextLogReader drawing from the provided string channel
// and using the provided LogParser to parse text logs.
func New(filename string, reader ReaderCloser, parser LogParser) *TextLogReader {
	return &TextLogReader{
		logFilename: filename,
		reader:      reader,
		parser:      parser,
	}
}

// Entries returns a readable channel producing logtrace.Items from consuming
// the input reader.  This channel is closed after the receiver's reader is
// exhausted, or when a parsing error is encountered -- in the latter case, the
// last Item sent on the channel will contain that error.
//
// The caller should consume the channel fully, otherwise a goroutine is leaked.
// Since the reader is consumed, Entries may only be called once.
func (tlr *TextLogReader) Entries(ac *logtrace.AssetCache) (<-chan *logtrace.Item, error) {
	entries := make(chan *logtrace.Item)
	go func(reader ReaderCloser, logFilename string, entries chan<- *logtrace.Item) {
		defer close(entries)
		tlr.parser.Init(reader.Reader, logFilename, ac)
		for {
			entry, err := tlr.parser.ReadLogEntry()
			if err != nil {
				if err != io.EOF {
					entries <- &logtrace.Item{
						Err: fmt.Errorf("failed to parse log line: %s", err),
					}
				}
				return
			}
			entries <- &logtrace.Item{
				Entry: &entry,
			}
		}
	}(tlr.reader, tlr.logFilename, entries)
	return entries, nil
}
