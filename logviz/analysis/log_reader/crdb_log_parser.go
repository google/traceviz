package logreader

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// crdbEntry describes a CRDB log entry.
type crdbEntry struct {
	// Severity is the importance of the log entry. See the
	// documentation for the Severity enum for more details.
	Severity crdbSeverity
	// Nanoseconds since the epoch.
	Time int64
	// Goroutine ID. This helps match logging events with goroutine
	// stack dumps.
	Goroutine int64
	// File name where the logging event was produced. Logging client
	// code can adjust this with the "depth" parameter.
	File string
	// Line number in the file where the logging event was produced.
	Line int64
	// Message contains the main text of the logging message.
	Message string
	// Tags contains the context tags available in the context where the
	// entry was created.
	Tags string
	// Counter is an entry counter, meant for use in audit logs as an
	// instrument against log repudiation.
	// See: https://en.wikipedia.org/wiki/Non-repudiation
	//
	// It is incremented for every use of the logger where the entry was
	// produced.
	Counter uint64
	// StructuredEnd, if non-zero, indicates that the entry
	// is structured; it is also the index
	// inside the Message field where the JSON payload ends (exclusive).
	StructuredEnd uint32
	// StructuredStart, when StructuredEnd is non-zero, is the index
	// inside the Message field where the JSON payload starts (inclusive).
	StructuredStart uint32
	// StackTraceStart is the index inside Message where a detailed
	// stack trace starts. If zero, no stack trace is present. Stack
	// traces are always separated from the message using a newline
	// character. If a stack trace is included, StackTracePosition is
	// the index of the character immediately after the newline
	// character.
	//
	// We use an index-in-string field in the protobuf, instead of two
	// separate string fields, because previous-version consumers of
	// crdbEntry are still expecting the message and the stack trace in the
	// same field.
	StackTraceStart uint32
	// TenantID is the tenant ID that the log entry originated from. NB: if a
	// log entry was not found to contain any tenant ID, we default to the system
	// tenant ID.
	TenantID string
}

const severityChar = "IWEF"

// MessageTimeFormat is the format of the timestamp in log message headers of crdb formatted logs.
// as used in time.Parse and time.Format.
const MessageTimeFormat = "060102 15:04:05.999999"

// crdbSeverity is the severity level of individual log events.
type crdbSeverity int32

const (
	// UNKNOWN is populated into decoded log entries when the
	// severity could not be determined.
	Severity_UNKNOWN crdbSeverity = 0
	// INFO is used for informational messages that do not
	// require action.
	Severity_INFO crdbSeverity = 1
	// WARNING is used for situations which may require special handling,
	// where normal operation is expected to resume automatically.
	Severity_WARNING crdbSeverity = 2
	// ERROR is used for situations that require special handling,
	// where normal operation could not proceed as expected.
	// Other operations can continue mostly unaffected.
	Severity_ERROR crdbSeverity = 3
	// FATAL is used for situations that require an immedate, hard
	// server shutdown. A report is also sent to telemetry if telemetry
	// is enabled.
	Severity_FATAL crdbSeverity = 4
)

var crdbSeverityName = map[crdbSeverity]string{
	Severity_UNKNOWN: "unknown",
	Severity_INFO:    "info",
	Severity_WARNING: "warning",
	Severity_ERROR:   "error",
	Severity_FATAL:   "fatal",
}

var crdbSeverityWeight = map[crdbSeverity]int{
	Severity_UNKNOWN: 3,
	Severity_INFO:    3,
	Severity_WARNING: 2,
	Severity_ERROR:   1,
	Severity_FATAL:   0,
}

var (
	entryREV2 = regexp.MustCompile(
		`(?m)^` +
			/* Severity                 */ `(?P<severity>[` + severityChar + `])` +
			/* Date and time            */ `(?P<datetime>\d{6} \d{2}:\d{2}:\d{2}.\d{6}) ` +
			/* Goroutine ID             */ `(?:(?P<goroutine>\d+) )` +
			/* Go standard library flag */ `(\(gostd\) )?` +
			/* Channel                  */ `(?:(?P<channel>\d+)@)?` +
			/* File                     */ `(?P<file>[^:]+):` +
			/* Line                     */ `(?:(?P<line>\d+) )` +
			/* Redactable flag          */ `(?P<redactable>(?:` + redactableIndicator + `)?) ` +
			/* Context tags             */ `\[(?P<tags>(?:[^]]|\][^ ])+)\] ` +
			/* Counter                  */ `(?P<counter>(?:\d+)?) ` +
			/* Continuation marker      */ `(?P<continuation>[ =!+|])` +
			/* Message                  */ `(?P<msg>.*)$`,
	)
	v2SeverityIdx     = entryREV2.SubexpIndex("severity")
	v2DateTimeIdx     = entryREV2.SubexpIndex("datetime")
	v2GoroutineIdx    = entryREV2.SubexpIndex("goroutine")
	v2ChannelIdx      = entryREV2.SubexpIndex("channel")
	v2FileIdx         = entryREV2.SubexpIndex("file")
	v2LineIdx         = entryREV2.SubexpIndex("line")
	v2RedactableIdx   = entryREV2.SubexpIndex("redactable")
	v2TagsIdx         = entryREV2.SubexpIndex("tags")
	v2CounterIdx      = entryREV2.SubexpIndex("counter")
	v2ContinuationIdx = entryREV2.SubexpIndex("continuation")
	v2MsgIdx          = entryREV2.SubexpIndex("msg")
)

const redactableIndicator = "⋮"

// crdbV2Decoder decodes the CockroachDB "v2" log format. The format is described in
// https://www.cockroachlabs.com/docs/stable/log-formats.html#format-crdb-v2
type crdbV2Decoder struct {
	lines        int // number of lines read from reader
	reader       *bufio.Reader
	nextFragment entryDecoderV2Fragment
}

// decode decodes the next log entry into the provided entry.
func (d *crdbV2Decoder) decode(entry *crdbEntry) (err error) {
	defer func() {
		switch r := recover().(type) {
		case nil: // do nothing
		case error:
			err = fmt.Errorf("decoding on line %d: %w", d.lines, r)
		default:
			panic(r)
		}
	}()
	frag, atEOF := d.peekNextFragment()
	if atEOF {
		return io.EOF
	}
	d.popFragment()
	if err := d.initEntryFromFirstLine(entry, frag); err != nil {
		return err
	}

	// Process the message.
	var entryMsg bytes.Buffer
	entryMsg.Write(frag.getMsg())

	// While the entry has additional lines, collect the full message.
	for {
		frag, atEOF := d.peekNextFragment()
		if atEOF || !frag.isContinuation() {
			break
		}
		d.popFragment()
		d.addContinuationFragmentToEntry(entry, &entryMsg, frag)
	}

	entry.Message = entryMsg.String()
	return nil
}

func (d *crdbV2Decoder) addContinuationFragmentToEntry(
	entry *crdbEntry, entryMsg *bytes.Buffer, frag entryDecoderV2Fragment,
) {
	switch frag.getContinuation() {
	case '+':
		entryMsg.WriteByte('\n')
		entryMsg.Write(frag.getMsg())
	case '|':
		entryMsg.Write(frag.getMsg())
		if entry.StructuredEnd != 0 {
			entry.StructuredEnd = uint32(entryMsg.Len())
		}
	case '!':
		if entry.StackTraceStart == 0 {
			entry.StackTraceStart = uint32(entryMsg.Len()) + 1
			entryMsg.WriteString("\nstack trace:\n")
			entryMsg.Write(frag.getMsg())
		} else {
			entryMsg.WriteString("\n")
			entryMsg.Write(frag.getMsg())
		}
	default:
		panic(fmt.Errorf("unexpected continuation character %c", frag.getContinuation()))
	}
}

// peekNextFragment populates the nextFragment buffer by reading from the
// underlying reader a line at a time until a valid line is reached.
// It will panic if a malformed log line is discovered. It permits the first
// line in the decoder to be malformed and it will skip that line. Upon EOF,
// if there is no text left to consume, the atEOF return value will be true.
func (d *crdbV2Decoder) peekNextFragment() (_ entryDecoderV2Fragment, atEOF bool) {
	for d.nextFragment == nil {
		d.lines++
		nextLine, err := d.reader.ReadBytes('\n')
		if isEOF := errors.Is(err, io.EOF); isEOF {
			if len(nextLine) == 0 {
				return nil, true
			}
		} else if err != nil {
			panic(err)
		}
		nextLine = bytes.TrimSuffix(nextLine, []byte{'\n'})
		m := entryREV2.FindSubmatch(nextLine)
		if m == nil {
			if d.lines == 1 { // allow non-matching lines if we've never seen a line
				continue
			}
			panic(errors.New("malformed log entry"))
		}
		d.nextFragment = m
	}
	return d.nextFragment, false
}

func (d *crdbV2Decoder) popFragment() {
	if d.nextFragment == nil {
		panic(fmt.Errorf("cannot pop unpopulated fragment"))
	}
	d.nextFragment = nil
}

func (d *crdbV2Decoder) initEntryFromFirstLine(
	entry *crdbEntry, m entryDecoderV2Fragment,
) (err error) {
	// Erase all the fields, to be sure.
	*entry = crdbEntry{
		Severity:  m.getSeverity(),
		Time:      m.getTimestamp(),
		Goroutine: m.getGoroutine(),
		File:      m.getFile(),
		Line:      m.getLine(),
		Counter:   m.getCounter(),
	}
	if m.isStructured() {
		entry.StructuredStart = 0
		entry.StructuredEnd = uint32(len(m.getMsg()))
	}
	return nil
}

// entryDecoderV2Fragment is a line which is part of a v2 log entry.
// It is the output of entryV2RE.FindSubmatch.
type entryDecoderV2Fragment [][]byte

func (f entryDecoderV2Fragment) getSeverity() crdbSeverity {
	return crdbSeverity(strings.IndexByte(severityChar, f[v2SeverityIdx][0]) + 1)
}

func (f entryDecoderV2Fragment) getMsg() []byte {
	return f[v2MsgIdx]
}

func (f entryDecoderV2Fragment) getContinuation() byte {
	return f[v2ContinuationIdx][0]
}

func (f entryDecoderV2Fragment) isContinuation() bool {
	switch f.getContinuation() {
	case '|', '+', '!':
		return true
	default:
		return false
	}
}

func (f entryDecoderV2Fragment) getGoroutine() int64 {
	return parseInt(f[v2GoroutineIdx], "goroutine")
}

func (f entryDecoderV2Fragment) getTimestamp() (unixNano int64) {
	t, err := time.Parse(MessageTimeFormat, string(f[v2DateTimeIdx]))
	if err != nil {
		panic(err)
	}
	return t.UnixNano()
}

func (f entryDecoderV2Fragment) getFile() string {
	return string(f[v2FileIdx])
}

func (f entryDecoderV2Fragment) getLine() int64 {
	return parseInt(f[v2LineIdx], "line")
}

func (f entryDecoderV2Fragment) isRedactable() bool {
	return len(f[v2RedactableIdx]) > 0
}

func (f entryDecoderV2Fragment) getCounter() uint64 {
	if len(f[v2CounterIdx]) == 0 {
		return 0
	}
	return uint64(parseInt(f[v2CounterIdx], "counter"))
}

func (f entryDecoderV2Fragment) isStructured() bool {
	return f.getContinuation() == '='
}

func parseInt(data []byte, name string) int64 {
	i, err := strconv.ParseInt(string(data), 10, 64)
	if err != nil {
		panic(fmt.Errorf("parsing %s: %w", name, err))
	}
	return i
}
