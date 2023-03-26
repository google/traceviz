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

package logger

import (
	"log"
	"regexp"
	"strings"
	"testing"
)

const logPrefix = `^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}\.\d{6} (/[^/]+)*/logger_test.go:\d+:`

func TestLogger(t *testing.T) {
	for _, test := range []struct {
		description string
		logSome     func()
		wantRE      string
	}{{
		description: "info",
		logSome: func() {
			log.Print(Info("look, it's pi: %.2f", 3.14159))
		},
		wantRE: logPrefix + ` \[I\] look, it's pi: 3.14\s+$`,
	}, {
		description: "warning",
		logSome: func() {
			log.Print(Warning("yow!"))
		},
		wantRE: logPrefix + ` \[W\] yow!\s+$`,
	}, {
		description: "error",
		logSome: func() {
			log.Print(Error("not good"))
		},
		wantRE: logPrefix + ` \[E\] not good\s+$`,
	}, {
		description: "panic",
		logSome: func() {
			log.Print(Panic("oh $#!+"))
		},
		wantRE: logPrefix + ` \[P\] oh \$\#\!\+\s+$`,
	}} {
		t.Run(test.description, func(t *testing.T) {
			defer func() {
				recover()
			}()
			var b strings.Builder
			SetOutput(&b)
			test.logSome()
			gotLogs := b.String()
			match, err := regexp.MatchString(test.wantRE, gotLogs)
			if err != nil {
				t.Fatalf("Match regex failed: %s", err)
			}
			if !match {
				t.Errorf("Failed to match log message '%s' with regex '%s'",
					gotLogs, test.wantRE)
			}
		})
	}
}
