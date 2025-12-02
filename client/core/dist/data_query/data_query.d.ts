/**
 * @fileoverview Defines a class mediating all TraceViz data series requests.
 */
import { BehaviorSubject, Subject } from 'rxjs';
import { DataSeriesFetcher } from '../data_series_query/data_series_fetcher.js';
import { SeriesRequest } from '../protocol/request_interface.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
import { DataFetcherInterface } from './data_fetcher_interface.js';
/**
 * DataQuery is a permanent singleton type managing backend Data queries.  It
 * accepts new DataSeriesRequestProtos via the fetchDataSeries method, which
 * also requires a callback to invoke upon receiving the response.  DataQuery
 * batches these requests together, and debounces them, then issues a backend
 * DataRequest including the global filters provided by setGlobalFilters and
 * all batched DataSeriesRequests.  Upon the response, DataQuery invokes the
 * provided callbacks for each registered DataSeriesRequest.
 */
export declare class DataQuery implements DataSeriesFetcher {
    private readonly errorReporter;
    protected updateRequested: Subject<null>;
    private globalFilters;
    private pendingQueriesBySeriesName;
    private fetcher;
    readonly loading: BehaviorSubject<boolean>;
    constructor(errorReporter: (err: unknown) => void);
    connect(fetcher: DataFetcherInterface): void;
    setGlobalFilters(globalFilters: ValueMap): void;
    triggerUpdates(): () => void;
    debounceUpdates(debounceMs: number): void;
    fetchDataSeries(req: SeriesRequest, onResponse: (resp: ResponseNode) => void, cancel: () => void): void;
    cancelDataSeries(seriesName: string | undefined): void;
    protected issueQuery(): void;
}
