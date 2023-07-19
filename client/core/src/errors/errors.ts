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

/**
 * @fileoverview TraceViz is a tool-building platform reliant on correct
 * configuration.  Accordingly, there's a class of faults at runtime stemming
 * from invalid configuration: component configurations referencing a
 * nonexistent global Value or expecting a Value to be of a different type,
 * TraceViz data providers serving data in an unexpected format, and so forth.
 * Errors of this type should be treated differently from arbitrary frontend
 * errors: for example, by appearing in a popup overlay to help the tool-builder
 * debug their configuration.  This module provides such TraceViz-specific
 * errors.
 */

/**
 * Describes the severity of a TraceViz error.  It can be used to select the UI
 * response; for instance, to replace the UI with a failure alert, pop up an
 * info box, or just log to console.
 */
export enum Severity {
  /**
   * Indicates a fundamental and unrecoverable problem affecting the entire
   * TraceViz application, such a problem requesting or handling Data queries.
   */
  FATAL = 0,
  /**
   * Indicates an unrecoverable problem affecting a single TraceViz UI
   * component, such as a DataQuery having an unexpected format.
   */
  ERROR,
  /**
   * Indicates a recoverable problem affecting the TraceViz application or one
   * of its UI components, such as a deprecation notice.
   */
  WARNING,
}

/**
 * Indicates an error in the TraceViz tool configuration: either in the template
 * configuration or in the DataSeries received from the backend data source.
 * New TraceViz UI component builders should use ConfigurationError for issues
 * caused by errors in the tool template or in the backend data source, but not
 * for application invariant violations.
 */
export class ConfigurationError extends Error {
  source = '';
  severity = Severity.WARNING;

  constructor(public override message: string) {
    super(message);
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }

  /** Specifies the file or module issuing the error. */
  from(source: string): ConfigurationError {
    this.source = source;
    return this;
  }

  /** Specifies the error's severity. */
  at(sev: Severity): ConfigurationError {
    this.severity = sev;
    return this;
  }

  override toString(): string {
    let ret: string;
    switch (this.severity) {
      case Severity.FATAL:
        ret = '[FATAL] ';
        break;
      case Severity.ERROR:
        ret = '[ERROR] ';
        break;
      case Severity.WARNING:
        ret = '[WARNING] ';
        break;
      default:
        ret = '[UNKNOWN SEVERITY] ';
        break;
    }
    if (this.source !== '') {
      ret = ret + `(${this.source}) `;
    }
    return ret + `${this.message}`;
  }
}
