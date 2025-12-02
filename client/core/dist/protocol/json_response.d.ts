/**
 * @fileoverview A set of response types modeling server-side responses, and
 * functions converting them to standard frontend Responses.
 */
import { KV } from '../value/value_map.js';
import { Response } from './response_interface.js';
type Datum = [
    KV[],
    Datum[]
];
interface DataSeries {
    SeriesName: string;
    Root: Datum;
}
/**
 * A Data response from the backend.
 */
export interface Data {
    StringTable: string[];
    DataSeries: DataSeries[];
}
/**
 * Prepares a Response from the provided JSON object or JSON-encoded string.
 */
export declare function fromObject(resp: string | Data): Response;
export {};
