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

// Package logger provides a simple wrapper around Go's core 'log' library,
// setting some default verbose options and adding a few explicit severity
// levels.
//
// This package is meant to provide interesting input for logviz, not to be a
// serious logging package.  There are plenty of excellent logging packages
// for Go; use one of those instead of this one!
package logger

import (
	"fmt"
	"io"
	"log"
)

// See, not a serious logging package.
func init() {
	log.SetFlags(log.LUTC | log.Ldate | log.Ltime | log.Lmicroseconds | log.Llongfile)
}

func SetOutput(w io.Writer) {
	log.SetOutput(w)
}

type level string

const (
	info    level = "I"
	warning level = "W"
	err     level = "E"
	fatal   level = "F"
	panic   level = "P"
)

func message(l level, msg string, v ...any) string {

	return fmt.Sprintf("["+string(l)+"] "+msg, v...)
}

func Info(msg string, v ...any) string {
	return message(info, msg, v...)
}

func Warning(msg string, v ...any) string {
	return message(warning, msg, v...)
}

func Error(msg string, v ...any) string {
	return message(err, msg, v...)
}

func Fatal(msg string, v ...any) string {
	return message(fatal, msg, v...)
}

func Panic(msg string, v ...any) string {
	return message(panic, msg, v...)
}
