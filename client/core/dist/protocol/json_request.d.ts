/**
 * @fileoverview A set of backend-compatible request types, and functions
 * converting into them from standard frontend Requests.
 */
import { Request } from './request_interface.js';
interface DataSeriesRequest {
    QueryName: string;
    SeriesName: string;
    Options: object;
}
interface DataRequest {
    GlobalFilters: object;
    SeriesRequests: DataSeriesRequest[];
}
/**
 * Converts a standard frontend Request to a backend-compatible DataRequest.
 */
export declare function toObject(req: Request): DataRequest;
export {};
