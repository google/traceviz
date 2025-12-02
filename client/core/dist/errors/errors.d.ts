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
export declare enum Severity {
    /**
     * Indicates a fundamental and unrecoverable problem affecting the entire
     * TraceViz application, such a problem requesting or handling Data queries.
     */
    FATAL = 0,
    /**
     * Indicates an unrecoverable problem affecting a single TraceViz UI
     * component, such as a DataQuery having an unexpected format.
     */
    ERROR = 1,
    /**
     * Indicates a recoverable problem affecting the TraceViz application or one
     * of its UI components, such as a deprecation notice.
     */
    WARNING = 2
}
/**
 * Indicates an error in the TraceViz tool configuration: either in the template
 * configuration or in the DataSeries received from the backend data source.
 * New TraceViz UI component builders should use ConfigurationError for issues
 * caused by errors in the tool template or in the backend data source, but not
 * for application invariant violations.
 */
export declare class ConfigurationError extends Error {
    message: string;
    source: string;
    severity: Severity;
    constructor(message: string);
    /** Specifies the file or module issuing the error. */
    from(source: string): ConfigurationError;
    /** Specifies the error's severity. */
    at(sev: Severity): ConfigurationError;
    toString(): string;
}
