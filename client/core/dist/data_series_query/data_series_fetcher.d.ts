/**
 * @fileoverview Defines the interface of a type capable of fetching data
 * series.
 */
import { SeriesRequest } from '../protocol/request_interface.js';
import { ResponseNode } from '../protocol/response_interface.js';
/**
 * Types capable of fetching data series should implement DataSeriesFetcher.
 */
export interface DataSeriesFetcher {
    fetchDataSeries(req: SeriesRequest, onResponse: (resp: ResponseNode) => void, cancel: () => void): void;
    cancelDataSeries(seriesName: string | undefined): void;
}
