/**
 * @fileoverview A global singleton DataFetcherInterface for testing.  .
 */
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { Request } from '../protocol/request_interface.js';
import { Response } from '../protocol/response_interface.js';
import { DataFetcherInterface } from './data_fetcher_interface.js';
/**
 * Implements DataFetcher for fake data.  Monitor expected requests on
 * requestChannel, and enqueue the next response on responseChannel.
 */
declare class TestDataFetcher implements DataFetcherInterface {
    requestChannel: Subject<Request>;
    responseChannel: ReplaySubject<Response>;
    fetch(req: Request): Observable<Response>;
    reset(): void;
}
/** A singleton data fetcher available for testing. */
export declare const GLOBAL_TEST_DATA_FETCHER: TestDataFetcher;
export {};
