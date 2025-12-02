/**
 * @fileoverview Defines a class mediating a single TraceViz data series
 * request.
 */
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ResponseNode } from '../protocol/response_interface.js';
import { StringValue } from '../value/value.js';
import { ValueMap } from '../value/value_map.js';
import { DataSeriesFetcher } from './data_series_fetcher.js';
/**
 * DataSeriesQuery handles on-demand fetching for a single query for a TraceViz
 * component.  These queries are satisfied by the backend in response to
 * requests that include global filter values and parameters; whenever these
 * change, the component should receive a fresh response.  DataSeriesQuery is
 * responsible for monitoring changes its parameter Values and on a 'fetch'
 * boolean observable.  When a parameter changes, or upon a rising edge on
 * 'fetch', DataSeriesQuery requests a new response from the backend; then, when
 * that response arrives, it makes it available to the TraceViz component.
 *
 * Users of DataSeriesQuery must call its dispose method when done with it.
 */
export declare class DataSeriesQuery {
    readonly dataQuery: DataSeriesFetcher;
    readonly queryName: StringValue;
    readonly parameters: ValueMap;
    readonly unsubscribe: Subject<void>;
    readonly loading: BehaviorSubject<boolean>;
    readonly response: Subject<ResponseNode>;
    readonly uniqueSeriesName: string;
    constructor(dataQuery: DataSeriesFetcher, queryName: StringValue, parameters: ValueMap, fetch: Observable<boolean>);
    private fetch;
    dispose(): void;
}
