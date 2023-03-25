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
// This package is meant to provide interesting input for logviz, not as a
// serious logging package.  There are plenty of excellent logging packages
// for Go to consider before this one.
package logger

import (
	"log"
	"os"
)

var (
	info = log.New(os.Stderr, "I", log.Ldate|log.Ltime|log.Lmicroseconds|log.Llongfile)
)  