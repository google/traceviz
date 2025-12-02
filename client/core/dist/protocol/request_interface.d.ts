import { ValueMap } from '../value/value_map.js';
/** A data series request. */
export interface SeriesRequest {
    queryName: string;
    seriesName: string;
    parameters: ValueMap;
}
/** A server-side data request. */
export interface Request {
    filters: ValueMap;
    seriesRequests: SeriesRequest[];
}
