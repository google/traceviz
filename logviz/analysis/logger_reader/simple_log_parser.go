package loggerreader

import (
	"bufio"
	"fmt"
	logtrace "github.com/google/traceviz/logviz/analysis/log_trace"
	"github.com/google/traceviz/logviz/logger"
	"io"
	"log"
	"regexp"
	"strconv"
	"time"
)

// simpleLogParser parses simple log message for the use of tests. See
// NewSimpleLogParser for the format description.
type simpleLogParser struct {
	re *regexp.Regexp
	tz *time.Location

	scanner     *bufio.Scanner
	ac          *logtrace.AssetCache
	logFilename string

	// bufferedLine is set if a line was scanned by ReadLogEntry without it
	// being included in the previous log entry. If set, bufferedLine needs to
	// be consumed before going to scanner for more lines.
	bufferedLine string
}

var _ LogParser = &simpleLogParser{}

// NewSimpleLogParser creates a LogParser implementation that expects log line
// formats like `Lmmdd hh:mm:ss.uuuuuu PID file:line] msg`, with times in
// America/Los_Angeles and dates within the twelve months prior to the
// provided 'now' timestamp.
func NewSimpleLogParser() *simpleLogParser {
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
	return &simpleLogParser{
		re: regexp.MustCompile(`^(\d{4})/(\d{2})/(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{6}) ([^:]*):(\d+): \[([IWEFP])\] (.*)$`),
		tz: time.UTC,
	}
}

func (slp *simpleLogParser) Init(reader *bufio.Reader, logFilename string, ac *logtrace.AssetCache) {
	slp.scanner = bufio.NewScanner(reader)
	slp.logFilename = logFilename
	slp.ac = ac
}

// ReadLogLine im
func (slp *simpleLogParser) ReadLogEntry() (logtrace.Entry, error) {
	var firstLine []string         // The first line, split into groups as per the regex.
	var continuationLines []string // All the lines after the first. These lines don't need to be parsed.
	// Consume all the lines for one log entry.
	for {
		var line string
		// If we have a line pending that wasn't consumed by the previous ReadLogEntry() call,
		// use it now.
		if slp.bufferedLine != "" {
			line = slp.bufferedLine
			slp.bufferedLine = ""
		} else {
			if !slp.scanner.Scan() {
				break
			}
			line = slp.scanner.Text()
		}

		curMatches := slp.re.FindStringSubmatch(line)
		log.Printf("got %d matches", len(curMatches))

		// If this is the first line of a (possibly multi-line) log entry,
		// remember it as the header.
		if firstLine == nil {
			firstLine = curMatches
			if len(firstLine) != 12 {
				log.Print(logger.Error("can't parse log line '%s'", line))
				return logtrace.Entry{}, fmt.Errorf("can't parse log line '%s'", line)
			}
		} else {
			// Let's see if this line is a continuation of the previous log entry, or a new one.
			if len(curMatches) == 0 {
				continuationLines = append(continuationLines, line)
				continue
			}
			// Looks like a new line. Let's buffer it for the next call.
			slp.bufferedLine = line
			break
		}
	}

	if firstLine == nil {
		return logtrace.Entry{}, io.EOF
	}

	e := logtrace.Entry{}
	e.WithMessage(firstLine[11])
	for _, l := range continuationLines {
		e.Message = append(e.Message, l)
	}

	year, err := strconv.Atoi(firstLine[1])
	if err != nil {
		log.Printf(logger.Error("failed to parse year `%s` as int", firstLine[1]))
		return logtrace.Entry{}, fmt.Errorf("failed to parse year `%s` as int", firstLine[1])
	}

	month, err := strconv.Atoi(firstLine[2])
	if err != nil {
		log.Printf(logger.Error("failed to parse month `%s` as int", firstLine[2]))
		return logtrace.Entry{}, fmt.Errorf("failed to parse month `%s` as int", firstLine[2])
	}

	day, err := strconv.Atoi(firstLine[3])
	if err != nil {
		log.Print(logger.Error("failed to parse day `%s` as int", firstLine[3]))
		return logtrace.Entry{}, fmt.Errorf("failed to parse day `%s` as int", firstLine[3])
	}

	hour, err := strconv.Atoi(firstLine[4])
	if err != nil {
		log.Print(logger.Error("failed to parse hour `%s` as int", firstLine[4]))
		return logtrace.Entry{}, fmt.Errorf("failed to parse hour `%s` as int", firstLine[4])
	}

	minute, err := strconv.Atoi(firstLine[5])
	if err != nil {
		log.Print(logger.Error("failed to parse minute `%s` as int", firstLine[5]))
		return logtrace.Entry{}, fmt.Errorf("failed to parse minute `%s` as int", firstLine[5])
	}

	second, err := strconv.Atoi(firstLine[6])
	if err != nil {
		log.Print(logger.Error("failed to parse seconds `%s` as int", firstLine[6]))
		return logtrace.Entry{}, fmt.Errorf("failed to parse seconds `%s` as int", firstLine[6])
	}

	usec, err := strconv.Atoi(firstLine[7])
	if err != nil {
		log.Print(logger.Error("failed to parse usec `%s` as int", firstLine[7]))
		return logtrace.Entry{}, fmt.Errorf("failed to parse usec `%s` as int", firstLine[7])
	}

	// Assume the log's from the current year.  If that puts it in the future,
	// assume it's from last year.
	t := time.Date(year, time.Month(month), day, hour, minute, second, usec*1000, slp.tz)
	e.At(t)
	lineNumber, err := strconv.Atoi(firstLine[9])
	if err != nil {
		log.Print(logger.Error("failed to parse line number `%s` as int", firstLine[9]))
		return logtrace.Entry{}, fmt.Errorf("failed to parse line number `%s` as int", firstLine[9])
	}
	e.From(slp.ac.SourceLocation(firstLine[8], lineNumber))
	lev, ok := defaultLevels[firstLine[10]]

	if !ok {
		log.Printf(logger.Error("unrecognized level '%s'", firstLine[1]))
		return logtrace.Entry{}, fmt.Errorf("unrecognized level '%s'", firstLine[1])
	}
	e.WithLevel(slp.ac.Level(lev.weight, lev.label))
	e.In(slp.ac.Log(slp.logFilename))
	return e, nil
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
