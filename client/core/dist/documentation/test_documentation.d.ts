/**
 * @fileoverview Test utilities for working with Documenters.
 */
import { Documenter } from './documentation.js';
/**
 * Returns a deterministic prettyprinted representation of the provided
 * Documenter, indented by the supplied indentation.
 */
export declare function prettyPrintDocumenter(doc: Documenter, indent?: string): string[];
